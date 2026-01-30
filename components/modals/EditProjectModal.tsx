import React, { useState } from 'react';
import { Settings, Banknote } from 'lucide-react';
import { Project, AppSettings } from '../../types';

interface EditProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProject: Project) => void;
  settings: AppSettings;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({ 
  project, isOpen, onClose, onSave, settings 
}) => {
  const [editedProject, setEditedProject] = useState<Project>(project);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 overflow-hidden relative border border-slate-200 animate-in fade-in zoom-in duration-200">
        <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <Settings className="text-slate-400" /> Edit Project Settings
        </h3>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="col-span-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Project Name</label>
            <input 
              type="text" 
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 font-bold placeholder-slate-300 transition-all"
              value={editedProject.name}
              onChange={(e) => setEditedProject({ ...editedProject, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Company</label>
            <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-slate-900 font-bold shadow-sm transition-all" value={editedProject.company} onChange={(e) => setEditedProject({ ...editedProject, company: e.target.value })}>
              <option value="">Select...</option>
              {(settings.companies || []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
            <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-slate-900 font-bold shadow-sm transition-all" value={editedProject.type} onChange={(e) => setEditedProject({ ...editedProject, type: e.target.value })}>
              <option value="">Select...</option>
              {(settings.projectTypes || []).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
            <input 
              type="date" 
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-slate-900 font-bold shadow-sm transition-all"
              value={new Date(editedProject.startDate).toISOString().split('T')[0]}
              onChange={(e) => setEditedProject({ ...editedProject, startDate: new Date(e.target.value).getTime() })}
            />
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-8">
            <div className="flex items-center gap-2 mb-3 text-indigo-600 font-bold text-sm uppercase tracking-wider">
              <Banknote size={16} /> Financial Projections (in $K)
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cash Required ($K)</label>
                <input 
                  type="number" 
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold outline-none focus:border-indigo-500"
                  value={editedProject.cashRequirement || ''}
                  onChange={(e) => setEditedProject({ ...editedProject, cashRequirement: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Debt Required ($K)</label>
                <input 
                  type="number" 
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold outline-none focus:border-indigo-500"
                  value={editedProject.debtRequirement || ''}
                  onChange={(e) => setEditedProject({ ...editedProject, debtRequirement: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Value at Completion ($K)</label>
                <input 
                  type="number" 
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold outline-none focus:border-indigo-500"
                  value={editedProject.valueAtCompletion || ''}
                  onChange={(e) => setEditedProject({ ...editedProject, valueAtCompletion: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Profit ($K)</label>
                <input 
                  type="number" 
                  className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-800 font-bold outline-none focus:border-emerald-500"
                  value={editedProject.profit || ''}
                  onChange={(e) => setEditedProject({ ...editedProject, profit: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
        </div>

        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-4 rounded-2xl transition-all active:scale-95 shadow-sm">Cancel</button>
          <button 
            onClick={() => onSave(editedProject)} 
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};