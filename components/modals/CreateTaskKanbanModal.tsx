import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, User, Clock, Check } from 'lucide-react';
import { Project, AppSettings, Subtask } from '../../types';

interface CreateTaskKanbanModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  settings: AppSettings;
  defaultStatus: string;
  defaultProjectId?: string;
  defaultAssignee?: string;
  onCreate: (projectId: string, milestoneId: string, task: Partial<Subtask>) => void;
}

export const CreateTaskKanbanModal: React.FC<CreateTaskKanbanModalProps> = ({
  isOpen, onClose, projects, settings, defaultStatus, defaultProjectId, defaultAssignee, onCreate
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId || '');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('');
  
  const [taskName, setTaskName] = useState('');
  const [assignee, setAssignee] = useState(defaultAssignee || '');
  const [status, setStatus] = useState(defaultStatus);
  const [dueDate, setDueDate] = useState<string>('');
  
  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      const pId = defaultProjectId || '';
      setSelectedProjectId(pId);
      
      // Auto-select first milestone if project is provided
      if (pId) {
        const proj = projects.find(p => p.id === pId);
        if (proj && proj.milestones.length > 0) {
          setSelectedMilestoneId(proj.milestones[0].id);
        } else {
          setSelectedMilestoneId('');
        }
      } else {
        setSelectedMilestoneId('');
      }

      setTaskName('');
      setAssignee(defaultAssignee || '');
      setStatus(defaultStatus);
      setDueDate('');
    }
  }, [isOpen, defaultProjectId, defaultAssignee, defaultStatus, projects]);

  const selectedProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId), 
  [projects, selectedProjectId]);

  const milestones = selectedProject ? selectedProject.milestones : [];

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProjectId = e.target.value;
    setSelectedProjectId(newProjectId);
    
    // Auto-select first milestone when project changes manually
    if (newProjectId) {
      const proj = projects.find(p => p.id === newProjectId);
      if (proj && proj.milestones.length > 0) {
        setSelectedMilestoneId(proj.milestones[0].id);
      } else {
        setSelectedMilestoneId('');
      }
    } else {
      setSelectedMilestoneId('');
    }
  };

  const handleCreate = () => {
    if (!selectedProjectId || !selectedMilestoneId || !taskName.trim()) return;

    const newTask: Partial<Subtask> = {
      name: taskName,
      status: status,
      assignedTo: assignee,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      description: '',
      notes: '',
      isImportant: false
    };

    onCreate(selectedProjectId, selectedMilestoneId, newTask);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 border border-slate-200 animate-in fade-in zoom-in duration-200 flex flex-col">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
          <h3 className="text-xl font-black text-slate-900">Add Task</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          {/* Context Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Project</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                value={selectedProjectId}
                onChange={handleProjectChange}
                disabled={!!defaultProjectId && defaultProjectId !== ''}
              >
                <option value="">Select Project...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Milestone</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                value={selectedMilestoneId}
                onChange={(e) => setSelectedMilestoneId(e.target.value)}
                disabled={!selectedProjectId}
              >
                <option value="">Select Milestone...</option>
                {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Task Name</label>
            <input 
              autoFocus
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              placeholder="What needs to be done?"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assignee</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {(settings.people || []).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
             </div>
             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                <div className="relative">
                   <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                   <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                   >
                     {(settings.statuses || []).map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
             </div>
          </div>
          
           <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Due Date (Optional)</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input 
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
           </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
          <button 
            onClick={handleCreate}
            disabled={!selectedProjectId || !selectedMilestoneId || !taskName.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
          >
            <Check size={18} /> Create Task
          </button>
        </div>
      </div>
    </div>
  );
};