import React from 'react';
import { X, Trash2, ExternalLink, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { Subtask, AppSettings } from '../../types';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Subtask;
  milestoneName: string;
  settings: AppSettings;
  onUpdate: (updates: Partial<Subtask>) => void;
  onDelete: () => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({ 
  isOpen, onClose, task, milestoneName, settings, onUpdate, onDelete 
}) => {
  if (!isOpen) return null;

  // Helper to format timestamp to YYYY-MM-DD for input[type="date"]
  const dateToInput = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 border border-slate-200 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900">Edit Task</h3>
                {task.isImportant && (
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
                    <AlertTriangle size={10} className="fill-amber-500 text-amber-600" /> IMPORTANT
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">In milestone: <span className="text-indigo-600">{milestoneName}</span></p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          {/* Name & Priority Toggle */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Task Name</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                value={task.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
              />
            </div>
            <button 
              onClick={() => onUpdate({ isImportant: !task.isImportant })}
              className={`h-[46px] w-[46px] flex items-center justify-center rounded-xl border-2 transition-all ${task.isImportant ? 'bg-amber-50 border-amber-400 text-amber-600' : 'bg-slate-50 border-slate-200 text-slate-300 hover:border-slate-300 hover:text-slate-400'}`}
              title="Toggle Importance"
            >
              <AlertTriangle size={20} className={task.isImportant ? "fill-amber-500" : ""} />
            </button>
          </div>
          
          {/* Main Attributes */}
          <div className="grid grid-cols-2 gap-4">
              <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assigned To</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                value={task.assignedTo}
                onChange={(e) => onUpdate({ assignedTo: e.target.value })}
              >
                <option value="">Unassigned</option>
                {(settings.people || []).map(person => <option key={person} value={person}>{person}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                value={task.status}
                onChange={(e) => onUpdate({ status: e.target.value })}
              >
                {(settings.statuses || []).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Timing & Scheduling */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
             <div className="flex items-center gap-2 mb-3 text-indigo-600 font-bold text-xs uppercase tracking-wider">
               <Clock size={14} /> Schedule & Effort
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Due Date</label>
                   <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input 
                        type="date"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 font-bold outline-none focus:border-indigo-500"
                        value={dateToInput(task.dueDate)}
                        onChange={(e) => onUpdate({ dueDate: e.target.valueAsNumber || undefined })}
                      />
                   </div>
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Est. Effort</label>
                   <div className="flex gap-2">
                     <input 
                       type="number"
                       className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-2 text-sm text-center text-slate-900 font-bold outline-none focus:border-indigo-500"
                       placeholder="0"
                       value={task.estimatedTime || ''}
                       onChange={(e) => onUpdate({ estimatedTime: parseFloat(e.target.value) || undefined })}
                     />
                     <select
                       className="flex-1 bg-white border border-slate-200 rounded-xl px-2 py-2 text-sm text-slate-900 font-bold outline-none focus:border-indigo-500"
                       value={task.timeUnit || 'hours'}
                       onChange={(e) => onUpdate({ timeUnit: e.target.value as any })}
                     >
                       <option value="hours">Hours</option>
                       <option value="days">Days</option>
                       <option value="weeks">Weeks</option>
                     </select>
                   </div>
                </div>
             </div>
          </div>

          {/* Links & Description */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Resource Link (URL)</label>
            <div className="flex gap-2">
              <input 
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://drive.google.com/..."
                value={task.link || ''}
                onChange={(e) => onUpdate({ link: e.target.value })}
              />
              {task.link && (
                <a 
                  href={task.link.startsWith('http') ? task.link : `https://${task.link}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                >
                  <ExternalLink size={20} />
                </a>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
            <textarea 
              className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              value={task.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
            />
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-4 shrink-0">
          <button 
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 text-xs font-bold px-3 py-2 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 size={14} /> Delete Task
          </button>
          <button 
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-2.5 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
