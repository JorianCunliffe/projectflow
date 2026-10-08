import React, { useState } from 'react';
import { ActivityLog, Project, AppSettings, TeamMemberDetails } from '../types';
import { Activity, Clock, MessageSquare, CheckCircle2, Edit3, PlusCircle, Trash2, Filter } from 'lucide-react';

interface FeedViewProps {
  activityLogs: ActivityLog[];
  projects: Project[];
  currentUser: any;
  settings: AppSettings;
  onTaskClick?: (projectId: string, taskId: string) => void;
}

export const FeedView: React.FC<FeedViewProps> = ({ activityLogs, projects, currentUser, settings, onTaskClick }) => {
  const [filterMyAssigned, setFilterMyAssigned] = useState(false);
  const [activityTypeFilter, setActivityTypeFilter] = useState<'ALL' | 'COMMENTS' | 'UPDATES'>('ALL');
  const [filterRACI, setFilterRACI] = useState({
    responsible: false,
    accountable: false,
    consulted: false,
    informed: false,
  });

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  const isMe = (nameStr?: string) => {
    if (!nameStr) return false;
    const n = nameStr.trim().toLowerCase();
    const emailStr = (currentUser?.email || '').trim().toLowerCase();
    const uidStr = (currentUser?.uid || '').trim().toLowerCase();
    const displayNameStr = (currentUser?.displayName || '').trim().toLowerCase();
    
    if (emailStr && (n === emailStr || emailStr.includes(n))) return true;
    if (displayNameStr && (n === displayNameStr || displayNameStr.includes(n))) return true;
    if (uidStr && n === uidStr) return true;

    return false;
  };

  const getPersonName = (emailOrName: string) => {
    if (!emailOrName) return 'Unknown User';
    
    // If it's the current user's email, try to use their displayName
    if (currentUser?.email && emailOrName.toLowerCase() === currentUser.email.toLowerCase() && currentUser.displayName) {
      return currentUser.displayName;
    }
    
    // Try to find a team member matching the email
    if (settings?.teamMemberDetails) {
      for (const [name, detailsData] of Object.entries(settings.teamMemberDetails)) {
        const details = detailsData as TeamMemberDetails;
        if (details.email && details.email.toLowerCase() === emailOrName.toLowerCase()) {
          return name;
        }
      }
    }
    
    // If it's an email format, returning the username part
    if (emailOrName.includes('@')) {
      return emailOrName.split('@')[0];
    }
    
    return emailOrName;
  };

  const filteredLogs = activityLogs.filter(log => {
    // Activity type filter
    if (activityTypeFilter === 'COMMENTS' && log.action !== 'comment') return false;
    if (activityTypeFilter === 'UPDATES' && log.action === 'comment') return false;

    if (!filterMyAssigned && !filterRACI.responsible && !filterRACI.accountable && !filterRACI.consulted && !filterRACI.informed) {
      return true; // No RACI filters active
    }

    const raci = log.raci || {};

    if (filterMyAssigned && isMe(log.userId)) return true;
    if (filterRACI.responsible && isMe(raci.responsible)) return true;
    if (filterRACI.accountable && isMe(raci.accountable)) return true;
    if (filterRACI.consulted && [].concat(raci.consulted || []).some(isMe)) return true;
    if (filterRACI.informed && [].concat(raci.informed || []).some(isMe)) return true;

    return false;
  });

  const commentCount = activityLogs.filter(l => l.action === 'comment').length;
  const updateCount = activityLogs.filter(l => l.action !== 'comment').length;

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'comment':
        return <MessageSquare size={18} className="text-indigo-600" />;
      case 'created':
        return <PlusCircle size={18} className="text-emerald-600" />;
      case 'deleted':
        return <Trash2 size={18} className="text-rose-600" />;
      case 'updated':
      default:
        return <Clock size={18} className="text-slate-500" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'comment':
        return (
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
            <MessageSquare size={10} /> Comment
          </span>
        );
      case 'created':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
            Created
          </span>
        );
      case 'deleted':
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
            Deleted
          </span>
        );
      case 'updated':
      default:
        return (
          <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
            Update
          </span>
        );
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto flex-1 overflow-y-auto">
      {/* Header and Type Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Activity className="text-indigo-600" size={24} /> Activity Feed
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time history of task comments, updates, and milestones across all projects.
          </p>
        </div>

        {/* Activity Type Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setActivityTypeFilter('ALL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activityTypeFilter === 'ALL'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200 font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>All Activity</span>
            <span className="text-[10px] bg-slate-200/70 text-slate-600 px-1.5 py-0.2 rounded-full font-bold">
              {activityLogs.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActivityTypeFilter('COMMENTS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activityTypeFilter === 'COMMENTS'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200 font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare size={12} className={activityTypeFilter === 'COMMENTS' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Comments</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-full font-bold">
              {commentCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActivityTypeFilter('UPDATES')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activityTypeFilter === 'UPDATES'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200 font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock size={12} className={activityTypeFilter === 'UPDATES' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Status Updates</span>
            <span className="text-[10px] bg-slate-200/70 text-slate-600 px-1.5 py-0.2 rounded-full font-bold">
              {updateCount}
            </span>
          </button>
        </div>
      </div>

      {/* Filters Box */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 font-medium text-sm text-slate-700">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5">
            <Filter size={12} /> Filter by Assignment & RACI
          </h3>
          {(filterMyAssigned || filterRACI.responsible || filterRACI.accountable || filterRACI.consulted || filterRACI.informed) && (
            <button
              onClick={() => {
                setFilterMyAssigned(false);
                setFilterRACI({ responsible: false, accountable: false, consulted: false, informed: false });
              }}
              className="text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-wider"
            >
              Reset Filters
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors">
            <input type="checkbox" checked={filterMyAssigned} onChange={e => setFilterMyAssigned(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
            Actions by Me
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors">
            <input type="checkbox" checked={filterRACI.responsible} onChange={e => setFilterRACI({...filterRACI, responsible: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
            Responsible
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors">
            <input type="checkbox" checked={filterRACI.accountable} onChange={e => setFilterRACI({...filterRACI, accountable: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
            Accountable
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors">
            <input type="checkbox" checked={filterRACI.consulted} onChange={e => setFilterRACI({...filterRACI, consulted: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
            Consulted
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors">
            <input type="checkbox" checked={filterRACI.informed} onChange={e => setFilterRACI({...filterRACI, informed: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
            Informed
          </label>
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-3.5">
        {[...filteredLogs].sort((a,b) => b.timestamp - a.timestamp).map(log => {
          const isComment = log.action === 'comment';
          
          return (
            <div 
              key={log.id} 
              className={`bg-white p-4 rounded-2xl shadow-xs border transition-all hover:shadow-md ${
                isComment 
                  ? 'border-indigo-100/90 hover:border-indigo-300 ring-1 ring-indigo-50/50' 
                  : 'border-slate-200 hover:border-slate-300'
              } flex gap-4 items-start`}
            >
              {/* Icon Circle */}
              <div className={`p-2.5 rounded-xl shrink-0 ${
                isComment 
                  ? 'bg-indigo-50 border border-indigo-100 text-indigo-600' 
                  : 'bg-slate-100 border border-slate-200 text-slate-500'
              }`}>
                {getActionIcon(log.action)}
              </div>

              {/* Feed Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <div 
                    className="text-sm text-slate-900 cursor-pointer group/title flex items-center gap-1.5 flex-wrap"
                    onClick={() => onTaskClick?.(log.projectId, log.taskId)}
                  >
                    <span className="font-black text-slate-900">{getPersonName(log.userId)}</span>
                    <span className="text-slate-500 font-medium">
                      {isComment ? 'commented on task' : `${log.action} task`}
                    </span>
                    <span className="font-bold text-indigo-600 group-hover/title:underline underline-offset-2">
                      "{log.taskName}"
                    </span>
                  </div>
                  {getActionBadge(log.action)}
                </div>

                <div className="text-xs text-slate-500 mb-1 flex items-center gap-2">
                  <span>in project <span className="font-bold text-slate-700">{getProjectName(log.projectId)}</span></span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                </div>

                {log.details && (
                  <div 
                    onClick={() => onTaskClick?.(log.projectId, log.taskId)}
                    className={`p-3 rounded-xl mt-2 text-sm leading-relaxed border cursor-pointer transition-colors ${
                      isComment 
                        ? 'bg-indigo-50/40 border-indigo-100 text-slate-800 hover:bg-indigo-50/70 shadow-xs' 
                        : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100/70'
                    }`}
                  >
                    {isComment && (
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-600 mb-1">
                        <MessageSquare size={10} /> Comment
                      </div>
                    )}
                    <p className="whitespace-pre-wrap font-medium">{log.details}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filteredLogs.length === 0 && (
          <div className="text-center py-16 text-slate-500 border border-dashed border-slate-300 rounded-2xl bg-white/50">
            <MessageSquare size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">No activity found</p>
            <p className="text-xs text-slate-400 mt-1">
              {activityTypeFilter === 'COMMENTS' 
                ? 'No task comments have been posted yet. Comments added inside tasks will appear here.'
                : 'No activities matched your current filters.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
