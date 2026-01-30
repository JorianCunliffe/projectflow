import React, { useState } from 'react';
import { Settings, X, Plus, Tags, Building, User, CheckCircle2, Type as LucideType, Download, Upload, AlertTriangle } from 'lucide-react';
import { AppSettings } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SettingsSection: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  items: string[]; 
  onAdd: (v: string) => void; 
  onRemove: (v: string) => void 
}> = ({ title, icon, items, onAdd, onRemove }) => {
  const [inputValue, setInputValue] = useState('');
  const safeItems = items || []; 
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-slate-800 font-bold mb-1 border-b border-slate-100 pb-2">
        {icon}
        {title}
      </div>
      <div className="flex gap-2">
        <input 
          type="text" 
          className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={`Add new ${title.toLowerCase()}...`}
          onKeyDown={(e) => { if(e.key === 'Enter') { onAdd(inputValue); setInputValue(''); }}}
        />
        <button 
          onClick={() => { onAdd(inputValue); setInputValue(''); }}
          className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-1">
        {safeItems.map(item => (
          <div key={item} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-md flex items-center gap-2 group border border-slate-200">
            {item}
            <button onClick={() => onRemove(item)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
              <X size={12} />
            </button>
          </div>
        ))}
        {safeItems.length === 0 && <span className="text-xs text-slate-400 italic">No items defined</span>}
      </div>
    </div>
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, settings, onUpdateSettings, onExportBackup, onImportBackup 
}) => {
  if (!isOpen) return null;

  const updateList = (key: keyof AppSettings, value: string, action: 'add' | 'remove') => {
    const list = (settings[key] as string[]) || [];
    let newList = [...list];
    if (action === 'add' && value.trim() && !newList.includes(value)) newList.push(value);
    else if (action === 'remove') {
      const index = newList.indexOf(value);
      if (index > -1) newList.splice(index, 1);
    }
    onUpdateSettings({ ...settings, [key]: newList });
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl"><Settings className="text-indigo-600" /></div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">Global Configuration</h3>
              <p className="text-sm text-slate-500">Customize labels and manage project data.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
        </div>
        
        <div className="flex-1 overflow-auto p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
            <div className="flex flex-col gap-6">
              <SettingsSection title="Project Types" icon={<Tags size={18} />} items={settings.projectTypes} onAdd={(v) => updateList('projectTypes', v, 'add')} onRemove={(v) => updateList('projectTypes', v, 'remove')} />
              <SettingsSection title="Companies" icon={<Building size={18} />} items={settings.companies} onAdd={(v) => updateList('companies', v, 'add')} onRemove={(v) => updateList('companies', v, 'remove')} />
            </div>
            <div className="flex flex-col gap-6">
              <SettingsSection title="Team Members" icon={<User size={18} />} items={settings.people} onAdd={(v) => updateList('people', v, 'add')} onRemove={(v) => updateList('people', v, 'remove')} />
              <SettingsSection title="Task Statuses" icon={<CheckCircle2 size={18} />} items={settings.statuses} onAdd={(v) => updateList('statuses', v, 'add')} onRemove={(v) => updateList('statuses', v, 'remove')} />
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold mb-1 border-b border-slate-100 pb-2">
                  <LucideType size={18} />
                  Date Format
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onUpdateSettings({ ...settings, dateFormat: 'DD/MM/YY' })}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border ${settings.dateFormat === 'DD/MM/YY' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                  >
                    DD/MM/YY
                  </button>
                  <button 
                    onClick={() => onUpdateSettings({ ...settings, dateFormat: 'MM/DD/YY' })}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border ${settings.dateFormat === 'MM/DD/YY' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                  >
                    MM/DD/YY
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-10">
            <h4 className="text-slate-800 font-black text-lg mb-6 flex items-center gap-3"><Download size={24} className="text-indigo-600" /> Disaster Recovery</h4>
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="max-w-md">
                  <p className="text-slate-700 font-semibold mb-2">Full Project Backup</p>
                  <p className="text-sm text-slate-500 leading-relaxed">Download your entire project history and configurations as a secure JSON file. You can restore this at any time to recover your work.</p>
                  <div className="mt-4 flex items-center gap-2 text-amber-600 font-bold text-[10px] bg-amber-50 px-3 py-1.5 rounded-full w-fit border border-amber-100">
                    <AlertTriangle size={14} /> WARNING: IMPORT OVERWRITES ALL LOCAL DATA
                  </div>
                </div>
                <div className="flex flex-col gap-3 min-w-[200px]">
                  <button onClick={onExportBackup} className="bg-white border-2 border-slate-200 text-slate-700 font-black py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-sm active:scale-95"><Download size={20} /> Export (.json)</button>
                  <input type="file" ref={fileInputRef} onChange={onImportBackup} accept=".json" className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-indigo-200 shadow-lg active:scale-95"><Upload size={20} /> Import Backup</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};