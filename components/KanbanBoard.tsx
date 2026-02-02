import React, { useMemo } from 'react';
import { Project, AppSettings, Subtask } from '../types';
import { KanbanCard } from './KanbanCard';

interface KanbanBoardProps {
  projects: Project[];
  settings: AppSettings;
  grouping: 'project' | 'member';
  memberFilter?: string | null;
  projectFilter?: string | null;
  onTaskClick?: (projectId: string, milestoneId: string, subtaskIndex: number) => void;
}

interface FlattenedTask {
  id: string;
  task: Subtask;
  projectId: string;
  projectName: string;
  milestoneId: string;
  milestoneName: string;
  subtaskIndex: number;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  projects,
  settings,
  grouping,
  memberFilter,
  projectFilter,
  onTaskClick
}) => {
  
  // 1. Flatten Data based on filters
  const allTasks = useMemo(() => {
    const tasks: FlattenedTask[] = [];
    projects.forEach(p => {
      if (projectFilter && p.id !== projectFilter) return;

      p.milestones.forEach(m => {
        (m.subtasks || []).forEach((s, idx) => {
          // If member filter is active, check specific assignee
          if (memberFilter && (s.assignedTo || 'Unassigned') !== memberFilter) return;

          tasks.push({
            id: `${p.id}-${m.id}-${idx}`,
            task: s,
            projectId: p.id,
            projectName: p.name,
            milestoneId: m.id,
            milestoneName: m.name,
            subtaskIndex: idx
          });
        });
      });
    });
    return tasks;
  }, [projects, projectFilter, memberFilter]);

  // 2. Define Swimlanes (Rows)
  const swimlanes = useMemo(() => {
    if (grouping === 'project') {
      // If we are filtering by project, we only have one swimlane (or none)
      if (projectFilter) {
        const p = projects.find(proj => proj.id === projectFilter);
        return p ? [{ id: p.id, title: p.name }] : [];
      }
      
      // Otherwise list all projects
      return projects.map(p => ({ id: p.id, title: p.name }));

    } else {
      // Grouping by Team Member
      // Get config people + 'Unassigned'
      const people = [...(settings.people || [])];
      
      // We also need to handle 'Unassigned'
      const lanes = people.map(p => ({ id: p, title: p }));
      lanes.push({ id: 'Unassigned', title: 'Unassigned' });

      // If filtering by member, just show that one
      if (memberFilter) {
        return lanes.filter(l => l.id === memberFilter);
      }
      return lanes;
    }
  }, [projects, settings.people, grouping, projectFilter, memberFilter]);

  // 3. Define Columns (Status)
  const columns = settings.statuses || ['Not started', 'Started', 'Held', 'Complete'];

  return (
    <div className="flex-1 overflow-auto bg-slate-50/50 p-6 h-full min-w-[1000px] flex flex-col">
      {/* Header Row (Statuses) */}
      <div className="flex gap-4 mb-2 sticky top-0 z-30 shrink-0">
        <div className="w-56 shrink-0 bg-transparent"></div> {/* Swimlane Header Spacer */}
        {columns.map(status => (
          <div key={status} className="flex-1 min-w-[280px] bg-slate-100/90 backdrop-blur-sm border-b-2 border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest py-3 px-4 rounded-t-lg shadow-sm">
            {status}
          </div>
        ))}
      </div>

      {/* Swimlanes */}
      <div className="space-y-4 pb-10">
        {swimlanes.map(lane => {
            // Pre-calculate tasks for this lane to verify counts
            const laneTasksCount = allTasks.filter(t => {
                if (grouping === 'project') return t.projectId === lane.id;
                return (t.task.assignedTo || 'Unassigned') === lane.id;
            }).length;
            
            return (
              <div key={lane.id} className="flex gap-4 group/lane">
                {/* Swimlane Header */}
                <div className="w-56 shrink-0 pt-2 sticky left-0 z-20">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm group-hover/lane:shadow-md transition-all group-hover/lane:border-indigo-200">
                    <h3 className="font-bold text-slate-800 text-sm truncate" title={lane.title}>{lane.title}</h3>
                    <div className="text-xs text-slate-500 mt-1 font-medium bg-slate-100 w-fit px-2 py-0.5 rounded-full">
                      {laneTasksCount} tasks
                    </div>
                  </div>
                </div>

                {/* Status Columns cells */}
                {columns.map(status => {
                  const tasksInCell = allTasks.filter(t => {
                    const matchesStatus = t.task.status === status;
                    let matchesLane = false;
                    if (grouping === 'project') {
                      matchesLane = t.projectId === lane.id;
                    } else {
                      matchesLane = (t.task.assignedTo || 'Unassigned') === lane.id;
                    }
                    return matchesStatus && matchesLane;
                  });

                  return (
                    <div 
                      key={`${lane.id}-${status}`} 
                      className="flex-1 min-w-[280px] bg-slate-100/30 rounded-xl p-2 border border-dashed border-slate-200 hover:bg-slate-100/80 transition-colors flex flex-col gap-2 min-h-[120px]"
                    >
                      {tasksInCell.map(flatTask => (
                        <KanbanCard 
                          key={flatTask.id}
                          task={flatTask.task}
                          milestoneName={flatTask.milestoneName}
                          projectName={flatTask.projectName}
                          onClick={() => onTaskClick?.(flatTask.projectId, flatTask.milestoneId, flatTask.subtaskIndex)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            );
        })}
        {swimlanes.length === 0 && (
           <div className="p-12 text-center text-slate-400 font-medium">No data matches the current filters.</div>
        )}
      </div>
    </div>
  );
};