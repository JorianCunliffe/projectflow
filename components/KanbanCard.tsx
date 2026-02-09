import React from 'react';
import { User, AlertTriangle, Clock, Calendar, Trash2 } from 'lucide-react';
import { Subtask } from '../types';
import { getStatusBorderColor } from '../constants';

interface KanbanCardProps {
  task: Subtask;
  milestoneName: string;
  projectName: string;
  projectId: string;
  milestoneId: string;
  subtaskIndex: number;
  onClick?: () => void;
  onDelete?: () => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ 
  task, 
  milestoneName, 
  projectName, 
  projectId,
  milestoneId,
  subtaskIndex,
  onClick,
  onDelete
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ 
      projectId, 
      milestoneId, 
      subtaskIndex 
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this task?")) {
      onDelete?.();
    }
  };

  const isOverdue = task.dueDate && task.dueDate < Date.now() && task.status !== 'Complete';
  const dueDateString = task.dueDate 
    ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) 
    : null;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className={`bg-white p-3 rounded-lg shadow-sm border-l-4 hover:shadow-md transition-all cursor-grab active:cursor-grabbing mb-2 group animate-in fade-in duration-300 relative select-none ${task.isImportant ? 'ring-2 ring-amber-100' : ''}`}
      style={{ borderLeftColor: getStatusBorderColor(task.status) }}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate flex-1 pr-6" title={`${projectName} • ${milestoneName}`}>
          {milestoneName}
        </div>
        
        {/* Delete Button (Visible on Hover) */}
        <button 
          onClick={handleDelete}
          className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
          title="Delete Task"
        >
          <Trash2 size={12} />
        </button>

        {task.isImportant && (
          <AlertTriangle size={12} className="text-amber-500 fill-amber-100 shrink-0 absolute top-3 right-8" />
        )}
      </div>
      
      <div className="text-sm font-bold text-slate-800 mb-2 line-clamp-3 leading-tight pr-4">
        {task.name}
      </div>
      
      <div className="flex items-center justify-between mt-auto gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-full border border-slate-100 max-w-[120px]">
          <User size={10} className="text-slate-400" />
          <span className="truncate">{task.assignedTo || 'Unassigned'}</span>
        </div>

        {/* Meta Info Row */}
        <div className="flex items-center gap-2">
            {(task.estimatedTime && task.estimatedTime > 0) && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100" title={`Est: ${task.estimatedTime} ${task.timeUnit}`}>
                    <Clock size={10} />
                    <span>{task.estimatedTime}{task.timeUnit?.[0]}</span>
                </div>
            )}
            
            {dueDateString && (
                <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${isOverdue ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`} title={isOverdue ? "Overdue" : "Due Date"}>
                    <Calendar size={10} />
                    <span>{dueDateString}</span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};