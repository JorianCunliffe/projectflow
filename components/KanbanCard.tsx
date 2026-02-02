import React from 'react';
import { User } from 'lucide-react';
import { Subtask } from '../types';
import { getStatusBorderColor } from '../constants';

interface KanbanCardProps {
  task: Subtask;
  milestoneName: string;
  projectName: string;
  onClick?: () => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ task, milestoneName, projectName, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-white p-3 rounded-lg shadow-sm border-l-4 hover:shadow-md transition-all cursor-pointer mb-2 group animate-in fade-in duration-300 relative"
      style={{ borderLeftColor: getStatusBorderColor(task.status) }}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate flex-1 pr-2" title={`${projectName} • ${milestoneName}`}>
          {milestoneName}
        </div>
      </div>
      
      <div className="text-sm font-bold text-slate-800 mb-2 line-clamp-3 leading-tight">
        {task.name}
      </div>
      
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-full border border-slate-100 max-w-[140px]">
          <User size={10} className="text-slate-400" />
          <span className="truncate">{task.assignedTo || 'Unassigned'}</span>
        </div>
      </div>
    </div>
  );
};