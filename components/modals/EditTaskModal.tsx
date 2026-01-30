import React from 'react';
import { X, Trash2, ExternalLink } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="space-y-6">
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Edit Task</h3>
                <p className="text-xs text-slate-500 font-medium">In milestone: <span className="text-indigo-600">{milestoneName}</span></p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Task Name</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                value={task.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
              />
            </div>
            
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
          
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
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
    </div>
  );
};