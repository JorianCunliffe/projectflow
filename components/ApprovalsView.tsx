import React, { useState } from 'react';
import { Project, Subtask, AppSettings } from '../types';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ApprovalsViewProps {
  projects: Project[];
  currentUser: any;
  settings: AppSettings;
  onEditTask: (projectId: string, milestoneId: string, subtaskIndex: number) => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({ projects, currentUser, settings, onEditTask }) => {
  const me = currentUser?.email || currentUser?.uid;
  const [filterMode, setFilterMode] = useState<'me' | 'all'>('me');

  const isMe = (nameStr?: string) => {
    if (!nameStr) return false;
    const n = nameStr.toLowerCase();
    const emailStr = (currentUser?.email || currentUser?.uid || '').toLowerCase();
    const displayNameStr = (currentUser?.displayName || '').toLowerCase();
    
    if (emailStr && n === emailStr) return true;
    if (displayNameStr && n === displayNameStr) return true;
    
    // Fuzzy matching for typed names vs emails
    if (emailStr && emailStr.includes(n.split(' ')[0])) return true;
    if (displayNameStr && displayNameStr.includes(n.split(' ')[0])) return true;

    return false;
  };

  const queueItems: { type: 'approval' | 'hold'; p: Project; m: any; s: Subtask; sIdx: number }[] = [];

  projects.forEach(p => {
    if (p.isArchived) return;
    p.milestones.forEach(m => {
      m.subtasks.forEach((s, sIdx) => {
        // Show tasks where approval is required or pending.
        if (s.accountable && s.approvalStatus !== 'approved' && s.status === 'Complete') {
          if (filterMode === 'me' && !isMe(s.accountable)) return;
          queueItems.push({ type: 'approval', p, m, s, sIdx });
        }

        // Show tasks on hold assigned to a user
        if (s.status === 'Held') {
          if (filterMode === 'me' && !isMe(s.holdOwner) && !isMe(s.accountable) && !isMe(s.assignedTo)) return;
          queueItems.push({ type: 'hold', p, m, s, sIdx });
        }
      });
    });
  });

  return (
    <div className="p-8 max-w-4xl mx-auto flex-1 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CheckCircle className="text-emerald-600" /> Pending Approvals & Holds
        </h2>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${filterMode === 'me' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setFilterMode('me')}
          >
            Assigned to Me
          </button>
          <button 
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${filterMode === 'all' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setFilterMode('all')}
          >
            All Pending
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {queueItems.map(({ type, p, m, s, sIdx }) => (
          <div key={`${s.id}-${type}`} onClick={() => onEditTask(p.id, m.id, sIdx)} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex gap-4 items-center cursor-pointer hover:border-indigo-400 hover:shadow transition-all group">
            {type === 'approval' ? (
              <div className="bg-amber-100 p-2 rounded-full shrink-0 group-hover:bg-amber-200 transition-colors text-amber-600">
                <CheckCircle size={20} />
              </div>
            ) : (
              <div className="bg-rose-100 p-2 rounded-full shrink-0 group-hover:bg-rose-200 transition-colors text-rose-600">
                <AlertCircle size={20} />
              </div>
            )}
            
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900">
                {s.name}
              </div>
              <div className="text-xs text-slate-500 mb-1">
                Project: <span className="font-medium text-slate-700">{p.name}</span> | Milestone: <span className="font-medium text-slate-700">{m.name}</span>
              </div>
              {type === 'hold' && s.holdQuestion && (
                <div className="text-sm mt-2 text-rose-700 font-medium bg-rose-50 p-2 rounded border border-rose-100">
                  <span className="font-bold">Question:</span> {s.holdQuestion}
                </div>
              )}
              <div className="text-xs mt-1 flex items-center gap-2">
                {type === 'approval' ? (
                  <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded">Pending Approval</span>
                ) : (
                  <span className="text-rose-600 font-medium bg-rose-50 px-2 py-0.5 rounded">Held for Response</span>
                )}
                <span className="text-slate-400">Owner: {type === 'hold' ? s.holdOwner : s.accountable}</span>
              </div>
            </div>
            <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              {type === 'approval' ? 'Review' : 'Answer'}
            </div>
          </div>
        ))}
        {queueItems.length === 0 && (
          <div className="text-center py-12 text-slate-500 border border-dashed border-slate-300 rounded-lg">
            You have no tasks pending approval or waiting on you for a response.
          </div>
        )}
      </div>
    </div>
  );
};
