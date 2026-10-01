import React, { useState, useMemo } from 'react';
import { 
  User, ChevronDown, ChevronRight, Filter, RefreshCw, Building, Clock, 
  CheckCircle2, Eye, PenSquare, Copy, X, Banknote, Flame, Star, 
  Search, Folder, FolderPlus, FolderOpen, Layers, LayoutGrid, 
  FolderTree, Plus, Trash2, Tag, ArrowRight
} from 'lucide-react';
import { Project, AppSettings } from '../types';

interface DashboardProps {
  projects: Project[];
  settings: AppSettings;
  onSelectProject: (id: string) => void;
  onEditProject: (project: Project) => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onUpdateProject?: (id: string, updates: Partial<Project>) => void;
  onUpdateSettings?: (newSettings: AppSettings) => void;
  formatDate: (date: Date | number) => string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  settings,
  onSelectProject,
  onEditProject,
  onDuplicateProject,
  onDeleteProject,
  onUpdateProject,
  onUpdateSettings,
  formatDate
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grouped' | 'grid'>('grid');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [activeFolderDropdownPid, setActiveFolderDropdownPid] = useState<string | null>(null);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  // Additional Filters
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCompany, setFilterCompany] = useState<string>('ALL');
  const [filterAssignee, setFilterAssignee] = useState<string>('ALL');
  const [filterFlag, setFilterFlag] = useState<string>('ALL');

  // Compute all available folders (from settings + assigned on projects)
  const availableFolders = useMemo(() => {
    const set = new Set<string>();
    (settings.folders || ['Residential', 'Commercial', 'Civil & Land', 'Completed']).forEach(f => {
      if (f && f.trim()) set.add(f.trim());
    });
    projects.forEach(p => {
      if (p.folder && p.folder.trim()) set.add(p.folder.trim());
    });
    return Array.from(set).sort();
  }, [settings.folders, projects]);

  // Handle adding a new folder
  const handleCreateFolder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setIsCreatingFolder(false);
      return;
    }
    if (!availableFolders.includes(trimmed)) {
      const updated = [...(settings.folders || availableFolders), trimmed];
      if (onUpdateSettings) {
        onUpdateSettings({ ...settings, folders: updated });
      }
    }
    setSelectedFolder(trimmed);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  // Handle deleting a folder
  const handleDeleteFolder = (folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Remove folder "${folderName}"? Projects in this folder will become Ungrouped.`)) {
      // Remove folder from projects
      projects.forEach(p => {
        if (p.folder === folderName) {
          onUpdateProject?.(p.id, { folder: undefined });
        }
      });
      // Remove from settings
      const updated = (settings.folders || availableFolders).filter(f => f !== folderName);
      if (onUpdateSettings) {
        onUpdateSettings({ ...settings, folders: updated });
      }
      if (selectedFolder === folderName) {
        setSelectedFolder('ALL');
      }
    }
  };

  // Filtered projects
  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let filtered = projects.filter(p => {
      // 1. Search Query Match
      if (q) {
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchId = (p.displayId || '').toLowerCase().includes(q);
        const matchCompany = (p.company || '').toLowerCase().includes(q);
        const matchType = (p.type || '').toLowerCase().includes(q);
        const matchFolder = (p.folder || '').toLowerCase().includes(q);
        const matchMilestone = (p.milestones || []).some(m => 
          (m.name || '').toLowerCase().includes(q) ||
          (m.subtasks || []).some(s => (s.name || '').toLowerCase().includes(q))
        );
        if (!matchName && !matchId && !matchCompany && !matchType && !matchFolder && !matchMilestone) {
          return false;
        }
      }

      // 2. Folder Match (for grid view or specific filter)
      if (selectedFolder !== 'ALL') {
        if (selectedFolder === 'UNGROUPED') {
          if (p.folder && p.folder.trim()) return false;
        } else {
          if (p.folder !== selectedFolder) return false;
        }
      }

      // 3. Assignee Match
      if (filterAssignee !== 'ALL') {
        const hasAssignee = p.milestones.some(m => {
          const tasks = Array.isArray(m.subtasks) ? m.subtasks : [];
          return tasks.some(s => s.assignedTo === filterAssignee);
        });
        if (!hasAssignee) return false;
      }

      // 4. Type & Company Match
      if (filterType !== 'ALL' && p.type !== filterType) return false;
      if (filterCompany !== 'ALL' && p.company !== filterCompany) return false;

      // 5. Priority Flag Match
      if (filterFlag === 'URGENT' && !p.isUrgent) return false;
      if (filterFlag === 'IMPORTANT' && !p.isImportant) return false;
      if (filterFlag === 'BOTH' && (!p.isUrgent || !p.isImportant)) return false;

      return true;
    });

    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [projects, searchQuery, selectedFolder, filterAssignee, filterType, filterCompany, filterFlag]);

  // Grouped projects by folder (for grouped view)
  const projectsByFolder = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // First filter all projects by search and criteria except selectedFolder
    const baseFiltered = projects.filter(p => {
      if (q) {
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchId = (p.displayId || '').toLowerCase().includes(q);
        const matchCompany = (p.company || '').toLowerCase().includes(q);
        const matchType = (p.type || '').toLowerCase().includes(q);
        const matchFolder = (p.folder || '').toLowerCase().includes(q);
        const matchMilestone = (p.milestones || []).some(m => 
          (m.name || '').toLowerCase().includes(q) ||
          (m.subtasks || []).some(s => (s.name || '').toLowerCase().includes(q))
        );
        if (!matchName && !matchId && !matchCompany && !matchType && !matchFolder && !matchMilestone) {
          return false;
        }
      }
      if (filterAssignee !== 'ALL') {
        const hasAssignee = p.milestones.some(m => (m.subtasks || []).some(s => s.assignedTo === filterAssignee));
        if (!hasAssignee) return false;
      }
      if (filterType !== 'ALL' && p.type !== filterType) return false;
      if (filterCompany !== 'ALL' && p.company !== filterCompany) return false;
      if (filterFlag === 'URGENT' && !p.isUrgent) return false;
      if (filterFlag === 'IMPORTANT' && !p.isImportant) return false;
      if (filterFlag === 'BOTH' && (!p.isUrgent || !p.isImportant)) return false;
      return true;
    });

    const groups: { folder: string; projects: Project[] }[] = [];

    // Specific folders
    availableFolders.forEach(folder => {
      const projs = baseFiltered.filter(p => p.folder === folder);
      groups.push({ folder, projects: projs });
    });

    // Ungrouped
    const ungrouped = baseFiltered.filter(p => !p.folder || !p.folder.trim());
    if (ungrouped.length > 0 || availableFolders.length === 0) {
      groups.push({ folder: 'Ungrouped', projects: ungrouped });
    }

    return groups;
  }, [projects, availableFolders, searchQuery, filterAssignee, filterType, filterCompany, filterFlag]);

  // Project counts per folder
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: projects.length, UNGROUPED: 0 };
    availableFolders.forEach(f => { counts[f] = 0; });
    projects.forEach(p => {
      if (p.folder && availableFolders.includes(p.folder)) {
        counts[p.folder] = (counts[p.folder] || 0) + 1;
      } else {
        counts.UNGROUPED = (counts.UNGROUPED || 0) + 1;
      }
    });
    return counts;
  }, [projects, availableFolders]);

  const toggleCollapseFolder = (folderName: string) => {
    setCollapsedFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  // Render Project Card
  const renderProjectCard = (p: Project) => {
    const allTasks = p.milestones.flatMap(m => m.subtasks || []);
    const relevantTasks = filterAssignee === 'ALL' 
      ? allTasks 
      : allTasks.filter(t => t.assignedTo === filterAssignee);

    const totalTasks = relevantTasks.length;
    const completedTasks = relevantTasks.filter(t => t.status === 'Complete').length;
    const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const nextTask = relevantTasks.find(t => t.status === 'Not started');

    return (
      <div 
        key={p.id}
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData('projectId', p.id);
          e.dataTransfer.effectAllowed = 'move';
          setDraggedProjectId(p.id);
        }}
        onDragEnd={() => {
          setDraggedProjectId(null);
          setDragOverFolder(null);
        }}
        className={`bg-white border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all group relative flex flex-col ${
          draggedProjectId === p.id ? 'opacity-40 scale-[0.98] ring-2 ring-indigo-300' : 'border-slate-200'
        }`}
      >
        {/* Top Header & Priority */}
        <div className="flex justify-between items-start mb-2.5">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {p.displayId && (
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 tracking-tighter shrink-0">
                  {p.displayId}
                </span>
              )}

              {/* Folder Badge & Quick Move Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveFolderDropdownPid(activeFolderDropdownPid === p.id ? null : p.id);
                  }}
                  className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                    p.folder 
                      ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' 
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Change project folder"
                >
                  <Folder size={11} className={p.folder ? 'text-amber-600' : 'text-slate-400'} />
                  <span className="truncate max-w-[110px]">{p.folder || 'Add Folder'}</span>
                  <ChevronDown size={10} />
                </button>

                {activeFolderDropdownPid === p.id && (
                  <div 
                    className="absolute left-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[9px] font-black uppercase text-slate-400 px-2 py-1 tracking-wider">
                      Assign to Folder
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateProject?.(p.id, { folder: undefined });
                        setActiveFolderDropdownPid(null);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                        !p.folder ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>Ungrouped</span>
                      {!p.folder && <CheckCircle2 size={12} />}
                    </button>
                    <div className="h-px bg-slate-100 my-1" />
                    <div className="max-h-36 overflow-y-auto space-y-0.5">
                      {availableFolders.map(folder => (
                        <button
                          key={folder}
                          type="button"
                          onClick={() => {
                            onUpdateProject?.(p.id, { folder });
                            setActiveFolderDropdownPid(null);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between truncate ${
                            p.folder === folder ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{folder}</span>
                          {p.folder === folder && <CheckCircle2 size={12} className="shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-900 leading-snug truncate" title={p.name}>
              {p.name}
            </h3>

            <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-1">
              <Building size={13} className="shrink-0 text-slate-400" />
              <span className="font-medium truncate">{p.company}</span>
              <span className="text-slate-300 mx-1">•</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {p.type}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onUpdateProject && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); onUpdateProject(p.id, { isUrgent: !p.isUrgent }); }}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    p.isUrgent ? 'bg-orange-50 text-orange-600 ring-1 ring-orange-200' : 'text-slate-300 hover:text-orange-500 hover:bg-orange-50'
                  }`}
                  title={p.isUrgent ? "Mark Not Urgent" : "Mark Urgent"}
                >
                  <Flame size={15} className={p.isUrgent ? 'fill-orange-600' : ''} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onUpdateProject(p.id, { isImportant: !p.isImportant }); }}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    p.isImportant ? 'bg-amber-50 text-amber-500 ring-1 ring-amber-200' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'
                  }`}
                  title={p.isImportant ? "Mark Not Important" : "Mark Important"}
                >
                  <Star size={15} className={p.isImportant ? 'fill-amber-500' : ''} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-3 font-medium">
          <RefreshCw size={10} />
          <span>Updated {formatDate(p.updatedAt)}</span>
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-[10px] text-slate-600">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex justify-between items-center">
            <span className="text-slate-400 font-semibold">Cash:</span> 
            <span className="font-bold text-slate-800">${p.cashRequirement || 0}k</span>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex justify-between items-center">
            <span className="text-slate-400 font-semibold">Debt:</span> 
            <span className="font-bold text-slate-800">${p.debtRequirement || 0}k</span>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex justify-between items-center">
            <span className="text-slate-400 font-semibold">VAC:</span> 
            <span className="font-bold text-slate-800">${p.valueAtCompletion || 0}k</span>
          </div>
          <div className="bg-emerald-50 text-emerald-800 p-2 rounded-xl border border-emerald-100 flex justify-between items-center font-bold">
            <span>Profit:</span> 
            <span>${p.profit || 0}k</span>
          </div>
        </div>

        {/* Progress & Next Task */}
        <div className="mb-4 space-y-2.5">
          <div>
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              <span>{filterAssignee !== 'ALL' ? `${filterAssignee}'s Progress` : 'Overall Progress'}</span>
              <span className="text-slate-900 font-black">{progressPct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          
          {nextTask ? (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                <Clock size={10} /> Next Action {filterAssignee !== 'ALL' && `for ${filterAssignee}`}
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs font-bold text-slate-800 line-clamp-1" title={nextTask.name}>
                  {nextTask.name}
                </span>
                {nextTask.assignedTo && (
                  <div className="shrink-0 flex items-center gap-1 text-[10px] text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                    <User size={10} />
                    <span className="max-w-[70px] truncate">{nextTask.assignedTo}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-emerald-700 text-xs font-bold">
                <CheckCircle2 size={12} /> {filterAssignee !== 'ALL' ? 'No pending tasks' : 'All tasks complete'}
              </div>
            </div>
          )}
        </div>

        {/* Milestone Mini Status Dots */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
          {(p.milestones || []).slice(0, 5).map(m => {
            const safeSubtasks = m.subtasks || [];
            const complete = safeSubtasks.filter((s: any) => s.status === 'Complete').length;
            const total = safeSubtasks.length || 1;
            const progress = (complete / total) * 360;
            return (
              <div key={m.id} className="shrink-0 flex flex-col items-center" title={`${m.name} (${complete}/${total} tasks)`}>
                <div className="w-7 h-7 rounded-full bg-slate-50 ring-1 ring-slate-200 flex items-center justify-center">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ background: `conic-gradient(#10b981 ${progress}deg, #e2e8f0 0deg)` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100">
          <button 
            onClick={() => onSelectProject(p.id)}
            className="flex-1 bg-slate-900 hover:bg-indigo-600 text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Eye size={14} /> Open Project
          </button>
          <button 
            onClick={() => onEditProject(p)} 
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer border border-slate-100" 
            title="Edit Project Details"
          >
            <PenSquare size={15} />
          </button>
          <button 
            onClick={() => onDuplicateProject(p.id)} 
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-100" 
            title="Duplicate Project"
          >
            <Copy size={15} />
          </button>
          <button 
            onClick={() => onDeleteProject(p.id)} 
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-slate-100" 
            title="Delete Project"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="flex-1 p-4 md:p-8 max-w-7xl mx-auto h-full overflow-y-auto"
      onClick={() => setActiveFolderDropdownPid(null)}
    >
      {/* Top Banner & Search Section */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Your Projects</span>
              <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200">
                {projects.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage workstreams, track construction budgets, and organize portfolio workspaces.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid size={14} />
              <span>Grid View</span>
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grouped' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FolderTree size={14} />
              <span>Folder Groups</span>
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name, ID, company, folder, milestones, or tasks..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-10 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 shadow-xs outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Search Results Summary */}
        {searchQuery && (
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between px-1">
            <span>Showing <strong className="text-indigo-600">{filteredProjects.length}</strong> matching projects</span>
            <button 
              onClick={() => setSearchQuery('')} 
              className="text-xs text-indigo-600 hover:underline font-bold"
            >
              Reset Search
            </button>
          </div>
        )}
      </div>

      {/* Folder Navigation Bar */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Folder size={12} className="text-amber-500" /> Project Folders
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            Drag cards onto folders to organize
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
          {/* All Projects Tab */}
          <button
            onClick={() => setSelectedFolder('ALL')}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverFolder('ALL');
            }}
            onDragLeave={() => setDragOverFolder(null)}
            onDrop={(e) => {
              e.preventDefault();
              const pid = e.dataTransfer.getData('projectId');
              if (pid) onUpdateProject?.(pid, { folder: undefined });
              setDragOverFolder(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              selectedFolder === 'ALL'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            } ${dragOverFolder === 'ALL' ? 'ring-2 ring-indigo-500 scale-105' : ''}`}
          >
            <Layers size={14} />
            <span>All Projects</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              selectedFolder === 'ALL' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {folderCounts.ALL}
            </span>
          </button>

          {/* Folder Pills */}
          {availableFolders.map(folder => {
            const isSelected = selectedFolder === folder;
            const count = folderCounts[folder] || 0;
            const isDragTarget = dragOverFolder === folder;

            return (
              <div
                key={folder}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverFolder(folder);
                }}
                onDragLeave={() => setDragOverFolder(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const pid = e.dataTransfer.getData('projectId');
                  if (pid) onUpdateProject?.(pid, { folder });
                  setDragOverFolder(null);
                }}
                onClick={() => setSelectedFolder(isSelected ? 'ALL' : folder)}
                className={`group flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50/50 hover:border-amber-200'
                } ${isDragTarget ? 'ring-2 ring-amber-500 scale-105' : ''}`}
              >
                <Folder size={14} className={isSelected ? 'text-white' : 'text-amber-500'} />
                <span>{folder}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDeleteFolder(folder, e)}
                  className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                    isSelected ? 'hover:bg-amber-600 text-amber-100' : 'hover:bg-slate-100 text-slate-400 hover:text-rose-600'
                  }`}
                  title="Remove folder"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}

          {/* Ungrouped Tab */}
          <button
            onClick={() => setSelectedFolder(selectedFolder === 'UNGROUPED' ? 'ALL' : 'UNGROUPED')}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverFolder('UNGROUPED');
            }}
            onDragLeave={() => setDragOverFolder(null)}
            onDrop={(e) => {
              e.preventDefault();
              const pid = e.dataTransfer.getData('projectId');
              if (pid) onUpdateProject?.(pid, { folder: undefined });
              setDragOverFolder(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              selectedFolder === 'UNGROUPED'
                ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            } ${dragOverFolder === 'UNGROUPED' ? 'ring-2 ring-slate-500 scale-105' : ''}`}
          >
            <FolderOpen size={14} className="text-slate-400" />
            <span>Ungrouped</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              selectedFolder === 'UNGROUPED' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {folderCounts.UNGROUPED}
            </span>
          </button>

          {/* Create New Folder Inline Button */}
          {isCreatingFolder ? (
            <form onSubmit={handleCreateFolder} className="flex items-center gap-1.5 bg-white border-2 border-indigo-500 rounded-xl px-2.5 py-1 shadow-sm">
              <FolderPlus size={14} className="text-indigo-600" />
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                className="text-xs font-bold text-slate-800 outline-none w-32 placeholder:text-slate-300"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsCreatingFolder(false);
                }}
              />
              <button type="submit" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-1.5 py-0.5">
                Add
              </button>
              <button 
                type="button" 
                onClick={() => setIsCreatingFolder(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={12} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>New Folder</span>
            </button>
          )}
        </div>
      </div>

      {/* Secondary Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Filter size={14} className="text-indigo-600" /> Filters:
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Priority Flag */}
          <select 
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            value={filterFlag}
            onChange={(e) => setFilterFlag(e.target.value)}
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent Projects</option>
            <option value="IMPORTANT">Important Projects</option>
            <option value="BOTH">Urgent & Important</option>
          </select>

          {/* Assignee Filter */}
          <div className="relative">
            <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select 
              className="bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-7 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
            >
              <option value="ALL">All Assignees</option>
              {(settings.people || []).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Project Type */}
          <select 
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">All Types</option>
            {(settings.projectTypes || []).map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Company */}
          <select 
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
          >
            <option value="ALL">All Companies</option>
            {(settings.companies || []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Reset Filters button if any active */}
          {(filterFlag !== 'ALL' || filterAssignee !== 'ALL' || filterType !== 'ALL' || filterCompany !== 'ALL' || selectedFolder !== 'ALL') && (
            <button
              onClick={() => {
                setFilterFlag('ALL');
                setFilterAssignee('ALL');
                setFilterType('ALL');
                setFilterCompany('ALL');
                setSelectedFolder('ALL');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2 py-1 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Project Display */}
      {viewMode === 'grouped' ? (
        /* ================= GROUPED FOLDER VIEW ================= */
        <div className="space-y-8">
          {projectsByFolder.map(({ folder, projects: folderProjects }) => {
            const isCollapsed = !!collapsedFolders[folder];
            const isDropTarget = dragOverFolder === folder;

            return (
              <div 
                key={folder}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverFolder(folder);
                }}
                onDragLeave={() => setDragOverFolder(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const pid = e.dataTransfer.getData('projectId');
                  if (pid) {
                    onUpdateProject?.(pid, { folder: folder === 'Ungrouped' ? undefined : folder });
                  }
                  setDragOverFolder(null);
                }}
                className={`rounded-2xl transition-all ${
                  isDropTarget ? 'ring-2 ring-amber-400 bg-amber-50/20 p-2' : ''
                }`}
              >
                {/* Folder Header */}
                <div 
                  onClick={() => toggleCollapseFolder(folder)}
                  className="flex items-center justify-between py-2.5 px-3 bg-slate-100 hover:bg-slate-200/80 rounded-xl mb-4 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <button className="text-slate-400">
                      {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <Folder size={17} className={folder === 'Ungrouped' ? 'text-slate-400' : 'text-amber-500'} />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      {folder}
                    </h3>
                    <span className="text-xs font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                      {folderProjects.length}
                    </span>
                  </div>

                  <span className="text-xs font-semibold text-slate-400">
                    {isCollapsed ? 'Click to expand' : 'Collapse folder'}
                  </span>
                </div>

                {/* Projects in Folder */}
                {!isCollapsed && (
                  folderProjects.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50">
                      <FolderOpen size={24} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-500">No projects in {folder}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Drag projects here or use the folder tag on a project card to move it.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {folderProjects.map(renderProjectCard)}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= STANDARD GRID VIEW ================= */
        filteredProjects.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl p-8">
            <Search size={32} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No matching projects found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              Try adjusting your search query, selecting a different folder, or clearing your active filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedFolder('ALL');
                setFilterFlag('ALL');
                setFilterAssignee('ALL');
                setFilterType('ALL');
                setFilterCompany('ALL');
              }}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-indigo-700 transition"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(renderProjectCard)}
          </div>
        )
      )}
    </div>
  );
};
