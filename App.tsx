import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Project, 
  Milestone, 
  Subtask, 
  AppSettings 
} from './types';
import { MilestoneNode } from './components/MilestoneNode';
import { 
  Plus, 
  Layers, 
  Copy, 
  Filter, 
  Eye, 
  EyeOff, 
  ChevronLeft,
  Search,
  Settings,
  Building,
  Wand2,
  X,
  User,
  Tags,
  CheckCircle2,
  Download,
  Upload,
  AlertTriangle,
  Info,
  Activity,
  Calendar,
  Clock,
  RefreshCw,
  Maximize,
  ZoomIn,
  Type as LucideType,
  Trash2,
  Link as LinkIcon,
  ExternalLink,
  Map as MapIcon,
  Layout,
  Cloud,
  CloudOff,
  Wifi,
  Database,
  ArrowRight,
  LogOut
} from 'lucide-react';
import { geminiService } from './services/geminiService';
import { firebaseService } from './services/firebaseService';
import { getStatusBorderColor } from './constants';

const STORAGE_KEY = 'projectflow_data_v6';

const DEFAULT_SETTINGS: AppSettings = {
  projectTypes: [
    "Subdivision",
    "Greenfield Development",
    "Commercial",
    "Residential",
    "Other",
    "Build",
    "Brownfield development",
    "Flip"
  ],
  companies: [
    "MyBuild",
    "LandmarX",
    "HealX"
  ],
  people: [
    "Jorian",
    "Kiera",
    "Beau",
    "Other"
  ],
  statuses: [
    "Started",
    "Held",
    "Complete",
    "Not started"
  ],
  dateFormat: 'DD/MM/YY'
};

const SettingsSection: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  items: string[]; 
  onAdd: (v: string) => void; 
  onRemove: (v: string) => void 
}> = ({ title, icon, items, onAdd, onRemove }) => {
  const [inputValue, setInputValue] = useState('');
  const safeItems = items || []; // Safety check
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

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [hoveredMilestoneId, setHoveredMilestoneId] = useState<string | null>(null);
  
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCompany, setFilterCompany] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isEditingSubtask, setIsEditingSubtask] = useState<{ mId: string, sIdx: number | null } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCloudSetupOpen, setIsCloudSetupOpen] = useState(false);
  const [firebaseConfigInput, setFirebaseConfigInput] = useState('');
  const [configError, setConfigError] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [milestoneToDelete, setMilestoneToDelete] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  
  // Linking State
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);

  // Minimap State
  const [showMinimap, setShowMinimap] = useState(true);

  // Cloud Sync State
  const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'syncing' | 'connected'>('disconnected');
  const isRemoteUpdate = useRef(false);

  const [newProject, setNewProject] = useState({ 
    name: '', 
    company: '', 
    type: '', 
    startDate: new Date().toISOString().split('T')[0] 
  });

  const formatDate = (date: Date | number | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return settings.dateFormat === 'DD/MM/YY' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
  };

  // INITIAL LOAD & CLOUD SUBSCRIPTION
  useEffect(() => {
    if (!firebaseService.isConfigured()) {
      // Fallback to LocalStorage if Firebase is not set up
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setProjects(parsed.projects || []);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
        } catch (e) {
          console.error("Failed to load local state", e);
        }
      }
      return;
    }

    setCloudStatus('syncing');

    const unsubscribe = firebaseService.subscribe((data) => {
      setCloudStatus('connected');
      if (data) {
        // Flag that this update is from the cloud so we don't save it back immediately
        isRemoteUpdate.current = true;
        
        // DEEP SANITIZATION: Firebase strips empty arrays and may return Objects for lists
        const rawProjects = data.projects || [];
        // Convert Object to Array if necessary (Firebase returns object if keys are not sequential 0,1,2)
        const projectsList = Array.isArray(rawProjects) ? rawProjects : Object.values(rawProjects);

        const sanitizedProjects = projectsList.map((p: any) => ({
          ...p,
          milestones: (Array.isArray(p.milestones) ? p.milestones : Object.values(p.milestones || [])).map((m: any) => ({
            ...m,
            dependsOn: m.dependsOn || [],
            subtasks: m.subtasks || []
          }))
        }));

        setProjects(sanitizedProjects);
        
        if (data.settings) {
          setSettings(prev => ({
            ...prev,
            ...data.settings,
            projectTypes: data.settings.projectTypes || prev.projectTypes || DEFAULT_SETTINGS.projectTypes,
            companies: data.settings.companies || prev.companies || DEFAULT_SETTINGS.companies,
            people: data.settings.people || prev.people || DEFAULT_SETTINGS.people,
            statuses: data.settings.statuses || prev.statuses || DEFAULT_SETTINGS.statuses,
          }));
        }
      } else {
        // If cloud is empty but we have local data, upload it once
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (parsed.projects?.length > 0) {
              firebaseService.save({ projects: parsed.projects, settings: parsed.settings });
            }
          } catch(e) {}
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // SAVE CHANGES (Cloud or Local)
  useEffect(() => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    const saveData = async () => {
      if (firebaseService.isConfigured()) {
        setCloudStatus('syncing');
        await firebaseService.save({ projects, settings });
        setCloudStatus('connected');
      } else {
        // Fallback save to local storage
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, settings }));
      }
    };

    // Debounce save to avoid slamming the DB
    const timer = setTimeout(saveData, 800);
    return () => clearTimeout(timer);
  }, [projects, settings]);

  const handleSaveFirebaseConfig = () => {
    const success = firebaseService.configure(firebaseConfigInput);
    if (success) {
      setIsCloudSetupOpen(false);
      // Window will reload
    } else {
      setConfigError("Invalid configuration format. Please ensure it contains 'databaseURL'.");
    }
  };

  const handleDisconnectFirebase = () => {
    if(window.confirm("Are you sure you want to disconnect? You will switch back to local storage.")) {
      firebaseService.disconnect();
    }
  }

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.company.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'ALL' || p.type === filterType;
      const matchesCompany = filterCompany === 'ALL' || p.company === filterCompany;
      return matchesSearch && matchesType && matchesCompany;
    });
  }, [projects, searchQuery, filterType, filterCompany]);

  const activeProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId), 
    [projects, selectedProjectId]
  );

  const canvasData = useMemo(() => {
    if (!activeProject) return { milestones: [], width: 0, height: 0 };
    const levels: Record<string, number> = {};
    const getLevel = (id: string): number => {
      if (levels[id] !== undefined) return levels[id];
      const m = activeProject.milestones.find(mil => mil.id === id);
      if (!m || (m.dependsOn || []).length === 0) {
        levels[id] = 0;
        return 0;
      }
      const parentLevels = m.dependsOn.map(parentId => getLevel(parentId));
      levels[id] = Math.max(...parentLevels) + 1;
      return levels[id];
    };
    activeProject.milestones.forEach(m => getLevel(m.id));
    const groupedByLevel: Record<number, string[]> = {};
    Object.entries(levels).forEach(([id, level]) => {
      if (!groupedByLevel[level]) groupedByLevel[level] = [];
      groupedByLevel[level].push(id);
    });
    const HORIZONTAL_GAP = 360;
    const VERTICAL_GAP = 280;
    const PADDING_X = 400;
    const PADDING_Y = 400;
    const maxLevel = Math.max(...Object.values(levels), 0);
    const maxInLevel = Math.max(...Object.values(groupedByLevel).map(g => g.length), 0);
    const width = Math.max((maxLevel + 1) * HORIZONTAL_GAP + PADDING_X * 2, 2500);
    const height = Math.max((maxInLevel + 1) * VERTICAL_GAP + PADDING_Y * 2, 1800);
    const startX = PADDING_X;
    const centerY = height / 2;

    const milestones = activeProject.milestones.map(m => {
      const level = levels[m.id];
      const indexInLevel = groupedByLevel[level].indexOf(m.id);
      const totalInLevel = groupedByLevel[level].length;
      
      // Calculate AUTO layout position
      const autoX = startX + level * HORIZONTAL_GAP;
      const autoY = centerY + (indexInLevel - (totalInLevel - 1) / 2) * VERTICAL_GAP;
      
      // Use stored manual position if available, otherwise use auto
      const x = m.x !== undefined ? m.x : autoX;
      const y = m.y !== undefined ? m.y : autoY;

      return { ...m, x, y };
    });
    return { milestones, width, height };
  }, [activeProject]);

  const centerView = () => {
    setZoom(1); // Standard Zoom Level
    if (!containerRef.current || !canvasData.milestones.length) return;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const firstM = canvasData.milestones[0];
    if (firstM) {
      const targetX = containerWidth * 0.2;
      const targetY = containerHeight / 2;
      setPan({
        x: targetX - (firstM.x || 0),
        y: targetY - (firstM.y || 0)
      });
    }
  };

  const handleZoomToExtents = () => {
    if (!containerRef.current) return;
    const padding = 100;
    const viewW = containerRef.current.clientWidth;
    const viewH = containerRef.current.clientHeight;
    
    const contentW = canvasData.width;
    const contentH = canvasData.height;

    // Calculate scale to fit
    const scaleX = (viewW - padding) / Math.max(contentW, 1);
    const scaleY = (viewH - padding) / Math.max(contentH, 1);
    
    // Clamp zoom at 1.0 (standard) to prevent excessive zooming on small projects
    // or allow a bit more if tiny (e.g. 1.2) but generally standard max is good UX.
    const newZoom = Math.min(scaleX, scaleY, 1); 

    setZoom(newZoom);
    
    // Center the scaled content in the viewport
    setPan({
      x: (viewW - contentW * newZoom) / 2,
      y: (viewH - contentH * newZoom) / 2
    });
  };

  useEffect(() => {
    if (selectedProjectId) {
      setTimeout(centerView, 50);
    }
  }, [selectedProjectId]);

  const milestoneTimeline = useMemo(() => {
    if (!activeProject) return new Map<string, { targetDate: Date }>();
    const results = new Map<string, { targetDate: Date }>();
    const calculate = (mId: string): Date => {
      const milestone = activeProject.milestones.find(m => m.id === mId);
      if (!milestone) return new Date(activeProject.startDate);
      if (results.has(mId)) return results.get(mId)!.targetDate;

      let maxParentDate = new Date(activeProject.startDate);
      (milestone.dependsOn || []).forEach(parentId => {
        const parentDate = calculate(parentId);
        if (parentDate > maxParentDate) maxParentDate = parentDate;
      });

      const finishDate = new Date(maxParentDate);
      finishDate.setDate(finishDate.getDate() + (milestone.estimatedDuration || 0));
      results.set(mId, { targetDate: finishDate });
      return finishDate;
    };
    activeProject.milestones.forEach(m => calculate(m.id));
    return results;
  }, [activeProject]);

  const projectStats = useMemo(() => {
    if (!activeProject) return null;
    let totalTasks = 0;
    let completedTasks = 0;
    let totalEstimatedDays = 0;
    const statusCount: Record<string, number> = {};

    activeProject.milestones.forEach(m => {
      totalEstimatedDays += (m.estimatedDuration || 0);
      (m.subtasks || []).forEach(s => {
        totalTasks++;
        if (s.status === 'Complete') completedTasks++;
        statusCount[s.status] = (statusCount[s.status] || 0) + 1;
      });
    });

    const finishDate = new Date(activeProject.startDate);
    finishDate.setDate(finishDate.getDate() + totalEstimatedDays);

    return { totalTasks, completedTasks, statusCount, totalEstimatedDays, finishDate };
  }, [activeProject]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;
    setIsPanning(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleMoveMilestone = (id: string, newX: number, newY: number, withSubtree: boolean) => {
    if (!activeProject) return;

    // Get the current effective position (could be auto or manual) from canvasData
    const nodeInCanvas = canvasData.milestones.find(m => m.id === id);
    if (!nodeInCanvas) return;

    const dx = newX - (nodeInCanvas.x || 0);
    const dy = newY - (nodeInCanvas.y || 0);

    const nodesToMove = new Set<string>();
    nodesToMove.add(id);

    if (withSubtree) {
       const addDescendants = (parentId: string) => {
         activeProject.milestones.filter(m => (m.dependsOn || []).includes(parentId)).forEach(child => {
           if (!nodesToMove.has(child.id)) {
             nodesToMove.add(child.id);
             addDescendants(child.id);
           }
         });
       };
       addDescendants(id);
    }

    setProjects(prev => prev.map(p => {
      if (p.id !== selectedProjectId) return p;
      return {
        ...p,
        milestones: p.milestones.map(m => {
           if (nodesToMove.has(m.id)) {
             // Calculate new position based on current effective position
             // Need to lookup current effective from canvasData because m.x might be undefined
             const currentEffective = canvasData.milestones.find(cm => cm.id === m.id);
             const startX = currentEffective?.x || 0;
             const startY = currentEffective?.y || 0;
             return { ...m, x: startX + dx, y: startY + dy };
           }
           return m;
        })
      };
    }));
  };

  const handleResetLayout = () => {
    if (!window.confirm("Reset layout to auto-generated grid? This will clear all manual positioning.")) return;
    setProjects(prev => prev.map(p => {
      if (p.id !== selectedProjectId) return p;
      return {
        ...p,
        milestones: p.milestones.map(m => {
          const { x, y, ...rest } = m;
          return rest; // Remove x and y to revert to auto layout
        })
      };
    }));
    // Center view after reset
    setTimeout(centerView, 100);
  };

  const handleExportBackup = () => {
    const data = { projects, settings, timestamp: Date.now() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `projectflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed.projects || !parsed.settings) throw new Error("Invalid backup file format.");
        if (window.confirm("This will overwrite all current projects and settings with the backup data. Are you sure?")) {
          setProjects(parsed.projects);
          setSettings(parsed.settings);
          alert("Backup restored successfully!");
        }
      } catch (err) {
        alert("Failed to restore backup: " + (err instanceof Error ? err.message : "Unknown error"));
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBrainstormSubtasks = async (mId: string) => {
    if (!activeProject) return;
    const milestone = activeProject.milestones.find(m => m.id === mId);
    if (!milestone) return;
    const newTasks = await geminiService.brainstormSubtasks(milestone.name, activeProject.name);
    setProjects(prev => prev.map(p => {
      if (p.id !== selectedProjectId) return p;
      return {
        ...p,
        updatedAt: Date.now(),
        milestones: p.milestones.map(m => {
          if (m.id !== mId) return m;
          const formattedTasks = newTasks.map((t: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: t.name,
            description: t.description,
            assignedTo: '',
            notes: '',
            status: 'Not started'
          }));
          return { ...m, subtasks: [...(m.subtasks || []), ...formattedTasks] };
        })
      };
    }));
  };

  const handleCreateProject = async (useAI = false) => {
    if (!newProject.name) return;
    setIsGenerating(true);
    let milestones: Milestone[] = [];
    if (useAI) {
      const res = await geminiService.generateProjectStructure(newProject.name, newProject.type as any);
      if (res && res.milestones) {
        milestones = res.milestones.map((m: any) => ({
          ...m,
          estimatedDuration: 5,
          dependsOn: m.dependsOn || [],
          subtasks: (m.subtasks || []).map((s: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: s.name,
            description: s.description,
            assignedTo: '',
            notes: '',
            status: 'Not started'
          }))
        }));
      }
    } else {
      milestones = [{
        id: 'm1',
        name: 'Initial Concept',
        dependsOn: [],
        estimatedDuration: 7,
        subtasks: [{
          id: 's1',
          name: 'Define Scope',
          description: 'Basic requirements gather',
          assignedTo: '',
          notes: '',
          status: 'Not started'
        }]
      }];
    }

    const now = Date.now();
    const project: Project = {
      id: now.toString(),
      name: newProject.name,
      company: newProject.company || settings.companies[0],
      type: newProject.type || settings.projectTypes[0],
      startDate: new Date(newProject.startDate).getTime(),
      milestones,
      createdAt: now,
      updatedAt: now
    };

    setProjects([...projects, project]);
    setSelectedProjectId(project.id);
    setIsCreatingProject(false);
    setIsGenerating(false);
    setNewProject({ name: '', company: '', type: '', startDate: new Date().toISOString().split('T')[0] });
  };

  const handleUpdateMilestoneName = (mId: string, newName: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== selectedProjectId) return p;
      return {
        ...p,
        updatedAt: Date.now(),
        milestones: p.milestones.map(m => m.id === mId ? { ...m, name: newName } : m)
      };
    }));
  };

  const handleUpdateMilestoneDuration = (mId: string, days: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== selectedProjectId) return p;
      return {
        ...p,
        updatedAt: Date.now(),
        milestones: p.milestones.map(m => m.id === mId ? { ...m, estimatedDuration: days } : m)
      };
    }));
  };

  const handleDeleteMilestone = (mId: string) => {
    setMilestoneToDelete(mId);
  };

  const confirmDeleteMilestone = () => {
    if (!milestoneToDelete) return;
    const mId = milestoneToDelete;
    
    setProjects(prev => prev.map(p => {
      if (p.id !== selectedProjectId) return p;
      return {
        ...p,
        updatedAt: Date.now(),
        milestones: p.milestones
          .filter(m => m.id !== mId)
          .map(m => ({
            ...m,
            dependsOn: (m.dependsOn || []).filter(depId => depId !== mId)
          }))
      };
    }));
    setMilestoneToDelete(null);
  };

  // Linking Functionality
  const handleStartLinking = (mId: string) => {
    setLinkingSourceId(mId);
  };

  const handleCompleteLinking = (targetId: string) => {
    if (!linkingSourceId || !activeProject) return;
    
    if (linkingSourceId === targetId) {
      alert("Cannot link a milestone to itself.");
      return;
    }

    // Check if link already exists
    const targetMilestone = activeProject.milestones.find(m => m.id === targetId);
    if (targetMilestone?.dependsOn?.includes(linkingSourceId)) {
      alert("These milestones are already linked.");
      setLinkingSourceId(null);
      return;
    }

    // Check for circular dependency: Is Target an ancestor of Source?
    const isAncestor = (ancestorId: string, nodeId: string): boolean => {
      if (ancestorId === nodeId) return true;
      const node = activeProject.milestones.find(m => m.id === nodeId);
      if (!node) return false;
      return (node.dependsOn || []).some(depId => isAncestor(ancestorId, depId));
    };

    if (isAncestor(targetId, linkingSourceId)) {
      alert("Cannot create this link because it would create a circular dependency (loop) in the timeline.");
      setLinkingSourceId(null);
      return;
    }

    setProjects(prev => prev.map(p => {
      if (p.id !== selectedProjectId) return p;
      return {
        ...p,
        updatedAt: Date.now(),
        milestones: p.milestones.map(m => {
          if (m.id !== targetId) return m;
          return { ...m, dependsOn: [...(m.dependsOn || []), linkingSourceId] };
        })
      };
    }));
    setLinkingSourceId(null);
  };

  const handleDuplicateProject = (id: string) => {
    const p = projects.find(proj => proj.id === id);
    if (!p) return;
    const now = Date.now();
    const newP = { ...p, id: now.toString(), name: `${p.name} (Copy)`, createdAt: now, updatedAt: now };
    setProjects([...projects, newP]);
  };

  const handleDeleteProject = (id: string) => {
    setProjectToDelete(id);
  };

  const confirmDeleteProject = () => {
    if (!projectToDelete) return;
    setProjects(projects.filter(p => p.id !== projectToDelete));
    if (selectedProjectId === projectToDelete) setSelectedProjectId(null);
    setProjectToDelete(null);
  };

  const handleAddMilestone = (pId: string, parentId: string | null, isParallel: boolean) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== pId) return p;
      const newId = `m-${Date.now()}`;
      const newMilestone: Milestone = {
        id: newId,
        name: isParallel ? 'New Parallel Branch' : 'Next Milestone',
        dependsOn: parentId ? [parentId] : [],
        estimatedDuration: 5,
        subtasks: []
      };
      return { ...p, updatedAt: Date.now(), milestones: [...p.milestones, newMilestone] };
    }));
  };

  const handleAddPreviousStep = (pId: string, currentMilestoneId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== pId) return p;

      const currentMilestone = p.milestones.find(m => m.id === currentMilestoneId);
      if (!currentMilestone) return p;

      const newId = `m-${Date.now()}`;
      
      const newMilestone: Milestone = {
        id: newId,
        name: 'Previous Step',
        dependsOn: [...(currentMilestone.dependsOn || [])],
        estimatedDuration: 5,
        subtasks: []
      };

      if (currentMilestone.x !== undefined && currentMilestone.y !== undefined) {
         newMilestone.x = currentMilestone.x - 360;
         newMilestone.y = currentMilestone.y;
      }

      const updatedMilestones = p.milestones.map(m => {
        if (m.id === currentMilestoneId) {
          return { ...m, dependsOn: [newId] };
        }
        return m;
      });

      return {
        ...p,
        updatedAt: Date.now(),
        milestones: [...updatedMilestones, newMilestone]
      };
    }));
  };

  const handleAddSubtask = (mId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== selectedProjectId) return p;
      return {
        ...p,
        updatedAt: Date.now(),
        milestones: p.milestones.map(m => {
          if (m.id !== mId) return m;
          return {
            ...m,
            subtasks: [...(m.subtasks || []), {
              id: `s-${Date.now()}`,
              name: 'New Subtask',
              description: '',
              assignedTo: '',
              notes: '',
              status: 'Not started'
            }]
          };
        })
      };
    }));
  };

  const updateSubtask = (mId: string, sIdx: number, updates: Partial<Subtask>) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== selectedProjectId) return p;
      return {
        ...p,
        updatedAt: Date.now(),
        milestones: p.milestones.map(m => {
          if (m.id !== mId) return m;
          const newSubtasks = [...(m.subtasks || [])];
          const oldStatus = newSubtasks[sIdx].status;
          const newStatus = updates.status || oldStatus;
          
          let subtaskCompletedAt = newSubtasks[sIdx].completedAt;
          if (newStatus === 'Complete' && oldStatus !== 'Complete') {
            subtaskCompletedAt = Date.now();
          } else if (newStatus !== 'Complete') {
            subtaskCompletedAt = undefined;
          }

          newSubtasks[sIdx] = { ...newSubtasks[sIdx], ...updates, completedAt: subtaskCompletedAt };
          
          const allComplete = newSubtasks.length > 0 && newSubtasks.every(s => s.status === 'Complete');
          const milestoneCompletedAt = allComplete ? (m.completedAt || Date.now()) : undefined;

          return { ...m, subtasks: newSubtasks, completedAt: milestoneCompletedAt };
        })
      };
    }));
  };

  const updateSettingsList = (key: keyof AppSettings, value: string, action: 'add' | 'remove') => {
    setSettings(prev => {
      const list = (prev[key] || []) as string[];
      let newList = [...list];
      if (action === 'add' && value.trim() && !newList.includes(value)) newList.push(value);
      else if (action === 'remove') {
        const index = newList.indexOf(value);
        if (index > -1) newList.splice(index, 1);
      }
      return { ...prev, [key]: newList };
    });
  };

  return (
    <div className="h-screen w-screen flex flex-col text-slate-900 bg-slate-50 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Layers size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">ProjectFlow</h1>
          {firebaseService.isConfigured() ? (
            <button 
              onClick={() => setIsCloudSetupOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors hover:bg-opacity-80 ${
                cloudStatus === 'connected' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                cloudStatus === 'syncing' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {cloudStatus === 'syncing' ? <RefreshCw size={12} className="animate-spin" /> : <Cloud size={12} />}
              {cloudStatus === 'syncing' ? 'SYNCING...' : 'CLOUD ACTIVE'}
            </button>
          ) : (
             <button 
               onClick={() => setIsCloudSetupOpen(true)}
               className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-colors"
             >
               <CloudOff size={12} /> LOCAL ONLY
             </button>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Global Settings"
          >
            <Settings size={20} />
          </button>
          {selectedProjectId && (
            <button 
              onClick={() => setSelectedProjectId(null)}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <ChevronLeft size={18} /> Dashboard
            </button>
          )}
          <button 
            onClick={() => setIsCreatingProject(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Plus size={18} /> New Project
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative flex">
        {!selectedProjectId ? (
          <div className="flex-1 p-8 max-w-7xl mx-auto h-full overflow-y-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Your Projects</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search company or name..."
                    className="bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 w-64 shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-slate-400" />
                  <select 
                    className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="ALL">All Types</option>
                    {(settings.projectTypes || []).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select 
                    className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                  >
                    <option value="ALL">All Companies</option>
                    {(settings.companies || []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map(p => {
                const allTasks = p.milestones.flatMap(m => m.subtasks || []);
                const totalTasks = allTasks.length;
                const completedTasks = allTasks.filter(t => t.status === 'Complete').length;
                const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                const nextTask = allTasks.find(t => t.status === 'Not started');

                return (
                <div 
                  key={p.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">{p.name}</h3>
                      <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                        <Building size={14} />
                        <span>{p.company}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {p.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-4">
                    <RefreshCw size={10} />
                    <span>Last updated {formatDate(p.updatedAt)}</span>
                  </div>

                  <div className="mb-5 space-y-3">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        <span>Progress</span>
                        <span className="text-slate-900">{progressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full rounded-full" 
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                    
                    {nextTask ? (
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                           <Clock size={10} /> Next Action
                         </div>
                         <div className="flex justify-between items-start gap-2">
                           <span className="text-xs font-semibold text-slate-800 line-clamp-1" title={nextTask.name}>
                             {nextTask.name}
                           </span>
                           {nextTask.assignedTo && (
                             <div className="shrink-0 flex items-center gap-1 text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                <User size={10} />
                                <span className="max-w-[60px] truncate">{nextTask.assignedTo}</span>
                             </div>
                           )}
                         </div>
                      </div>
                    ) : (
                       <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-emerald-600 text-xs font-bold">
                            <CheckCircle2 size={12} /> All tasks complete
                          </div>
                       </div>
                    )}
                  </div>

                  <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide flex-1">
                    {(p.milestones || []).slice(0, 4).map(m => {
                      const safeSubtasks = m.subtasks || [];
                      const complete = safeSubtasks.filter((s: any) => s.status === 'Complete').length;
                      const total = safeSubtasks.length || 1;
                      const progress = (complete / total) * 360;
                      return (
                        <div key={m.id} className="shrink-0 flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-slate-50 ring-1 ring-slate-100 flex items-center justify-center">
                            <div 
                              className="w-5 h-5 rounded-full" 
                              style={{ background: `conic-gradient(#22c55e ${progress}deg, #f1f5f9 0deg)` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 mt-auto">
                    <button 
                      onClick={() => { setSelectedProjectId(p.id); setPan({ x: 0, y: 0 }); }}
                      className="flex-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-semibold py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye size={16} /> Open
                    </button>
                    <button onClick={() => handleDuplicateProject(p.id)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"><Copy size={16} /></button>
                    <button onClick={() => handleDeleteProject(p.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X size={16} /></button>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex h-full overflow-hidden">
            <div className="flex-1 flex flex-col bg-slate-100">
              <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm shrink-0 z-20">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{activeProject?.name}</h2>
                    <p className="text-xs text-slate-500">{activeProject?.company} • {activeProject?.type}</p>
                  </div>
                  <div className="h-8 w-px bg-slate-100" />
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</span>
                      <span className="text-xs font-bold text-slate-700">{formatDate(activeProject!.startDate)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <button 
                      onClick={centerView}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Standard Zoom (100%)"
                    >
                      <ZoomIn size={18} />
                    </button>
                    <button 
                      onClick={handleZoomToExtents}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Zoom to Extents"
                    >
                      <Maximize size={18} />
                    </button>
                    <button 
                      onClick={handleResetLayout}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Reset Layout"
                    >
                      <Layout size={18} />
                    </button>
                  <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
                    <button 
                      onClick={() => setShowSubtasks(!showSubtasks)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                        showSubtasks ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      {showSubtasks ? <Eye size={16} /> : <EyeOff size={16} />}
                      Details
                    </button>
                  </div>
                  <button 
                     onClick={() => activeProject && handleAddMilestone(activeProject.id, null, false)}
                     className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-1.5 rounded-lg text-sm flex items-center gap-2 shadow-sm transition-all"
                  >
                    <Plus size={16} /> Add Start Milestone
                  </button>
                </div>
              </div>

              <div 
                ref={containerRef}
                className="flex-1 relative overflow-hidden mindmap-container bg-[#fcfcfd]"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <div className="absolute top-6 right-6 z-40 flex flex-col items-end gap-2 pointer-events-none">
                  <div className="pointer-events-auto flex flex-col items-end gap-2">
                    <button
                      onClick={() => setShowMinimap(!showMinimap)}
                      className="bg-white p-2 rounded-lg shadow-md border border-slate-200 text-slate-500 hover:text-indigo-600 transition-colors"
                      title={showMinimap ? "Hide Minimap" : "Show Minimap"}
                    >
                      <MapIcon size={20} />
                    </button>

                    {showMinimap && (
                      <div className="bg-white border border-slate-200 shadow-xl rounded-xl p-2 w-64 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="relative bg-slate-50 rounded-lg overflow-hidden border border-slate-100" style={{ height: '160px' }}>
                            {(() => {
                                const mapWidth = 240; 
                                const mapHeight = 160;
                                const scaleX = mapWidth / Math.max(canvasData.width, 1);
                                const scaleY = mapHeight / Math.max(canvasData.height, 1);
                                const scale = Math.min(scaleX, scaleY);

                                const scaledWidth = canvasData.width * scale;
                                const scaledHeight = canvasData.height * scale;
                                const offsetX = (mapWidth - scaledWidth) / 2;
                                const offsetY = (mapHeight - scaledHeight) / 2;

                                const viewportX = (-pan.x / zoom) * scale + offsetX;
                                const viewportY = (-pan.y / zoom) * scale + offsetY;
                                const viewportW = ((containerRef.current?.clientWidth || 0) / zoom) * scale;
                                const viewportH = ((containerRef.current?.clientHeight || 0) / zoom) * scale;

                                const handleMinimapClick = (e: React.MouseEvent<SVGSVGElement>) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const clickX = e.clientX - rect.left;
                                  const clickY = e.clientY - rect.top;

                                  const targetContentX = (clickX - offsetX) / scale;
                                  const targetContentY = (clickY - offsetY) / scale;

                                  const containerW = containerRef.current?.clientWidth || 0;
                                  const containerH = containerRef.current?.clientHeight || 0;

                                  setPan({
                                    x: containerW / 2 - targetContentX * zoom,
                                    y: containerH / 2 - targetContentY * zoom
                                  });
                                };

                                return (
                                  <svg 
                                    width="100%" 
                                    height="100%" 
                                    viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                                    onClick={handleMinimapClick}
                                    className="cursor-pointer"
                                  >
                                    <g transform={`translate(${offsetX}, ${offsetY})`}>
                                        {canvasData.milestones.map(m => (
                                          <React.Fragment key={m.id}>
                                            {(m.dependsOn || []).map(pid => {
                                              const parent = canvasData.milestones.find(p => p.id === pid);
                                              if (!parent) return null;
                                              const dx = (m.x || 0) - (parent.x || 0);
                                              const controlX = (parent.x || 0) + dx / 2;
                                              return (
                                                <path
                                                  key={`mini-${pid}-${m.id}`}
                                                  d={`M ${(parent.x || 0) + 50} ${parent.y!} C ${controlX} ${parent.y!}, ${controlX} ${m.y!}, ${(m.x || 0) - 50} ${m.y!}`}
                                                  stroke="#cbd5e1"
                                                  strokeWidth={2 / scale}
                                                  fill="transparent"
                                                  transform={`scale(${scale})`}
                                                />
                                              )
                                            })}
                                          </React.Fragment>
                                        ))}
                                        {canvasData.milestones.map(m => {
                                          const isComplete = (m.subtasks || []).every((s: any) => s.status === 'Complete') && (m.subtasks || []).length > 0;
                                          return (
                                            <circle
                                              key={`mini-node-${m.id}`}
                                              cx={m.x! * scale}
                                              cy={m.y! * scale}
                                              r={4}
                                              fill={isComplete ? "#22c55e" : "#6366f1"}
                                            />
                                          );
                                        })}
                                    </g>
                                    <rect
                                      x={viewportX}
                                      y={viewportY}
                                      width={viewportW}
                                      height={viewportH}
                                      fill="none"
                                      stroke="#6366f1"
                                      strokeWidth="2"
                                      className="transition-all duration-75"
                                    />
                                  </svg>
                                );
                            })()}
                          </div>
                      </div>
                    )}
                  </div>
                </div>

                <div 
                  className="absolute transition-transform duration-300 ease-out" 
                  style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
                >
                  <div style={{ width: canvasData.width, height: canvasData.height }}>
                    <svg className="absolute inset-0 pointer-events-none" width={canvasData.width} height={canvasData.height}>
                      <defs>
                        <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#cbd5e1" />
                        </marker>
                        <marker id="arrow-active" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
                        </marker>
                      </defs>
                      {canvasData.milestones.map(m => (
                        (m.dependsOn || []).map(parentId => {
                          const parent = canvasData.milestones.find(mil => mil.id === parentId);
                          if (!parent) return null;
                          const isActive = hoveredMilestoneId === m.id || hoveredMilestoneId === parentId;
                          const dx = (m.x || 0) - (parent.x || 0);
                          const controlX = (parent.x || 0) + dx / 2;
                          return (
                            <path
                              key={`${parentId}-${m.id}`}
                              d={`M ${(parent.x || 0) + 50} ${parent.y!} C ${controlX} ${parent.y!}, ${controlX} ${m.y!}, ${(m.x || 0) - 50} ${m.y!}`}
                              stroke={isActive ? "#6366f1" : "#cbd5e1"}
                              strokeWidth={isActive ? "3" : "2"}
                              fill="transparent"
                              markerEnd={isActive ? "url(#arrow-active)" : "url(#arrow)"}
                              className="transition-all duration-300"
                            />
                          );
                        })
                      ))}
                    </svg>

                    <div className="absolute inset-0 pointer-events-none">
                      {canvasData.milestones.map(m => (
                        <div key={m.id} className="pointer-events-auto">
                          <MilestoneNode 
                            milestone={m}
                            showSubtasks={showSubtasks}
                            onAddSubtask={handleAddSubtask}
                            onAddSequence={(id) => handleAddMilestone(activeProject!.id, id, false)}
                            onAddPrevious={(id) => handleAddPreviousStep(activeProject!.id, id)}
                            onAddParallel={(id) => handleAddMilestone(activeProject!.id, id, true)}
                            onEditSubtask={(mId, sIdx) => setIsEditingSubtask({ mId, sIdx })}
                            onUpdateName={handleUpdateMilestoneName}
                            onUpdateDuration={handleUpdateMilestoneDuration}
                            onDeleteMilestone={handleDeleteMilestone}
                            onMove={handleMoveMilestone}
                            onBrainstorm={handleBrainstormSubtasks}
                            onHover={setHoveredMilestoneId}
                            onStartLinking={handleStartLinking}
                            onCompleteLinking={handleCompleteLinking}
                            isLinkingMode={!!linkingSourceId}
                            isSource={linkingSourceId === m.id}
                            targetDate={milestoneTimeline.get(m.id)?.targetDate}
                            dateFormat={settings.dateFormat}
                            onClick={() => {}}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {linkingSourceId && (
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white rounded-full px-6 py-2.5 shadow-lg shadow-indigo-200 z-50 flex items-center gap-4 animate-in slide-in-from-top-4">
                     <div className="flex items-center gap-2 text-sm font-bold">
                       <LinkIcon size={16} className="animate-pulse" />
                       <span>Select a target milestone to connect...</span>
                     </div>
                     <button 
                       onClick={() => setLinkingSourceId(null)}
                       className="bg-indigo-700 hover:bg-indigo-800 rounded-full px-3 py-1 text-xs font-bold transition-colors"
                     >
                       Cancel
                     </button>
                  </div>
                )}

                <div className="absolute bottom-6 left-6 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full px-4 py-2 text-[10px] font-bold text-slate-400 flex items-center gap-3 shadow-sm z-30">
                  <div className="flex items-center gap-1"><Activity size={12} className="text-slate-300" /> DRAG TO PAN</div>
                  <div className="w-px h-3 bg-slate-200" />
                  <div className="flex items-center gap-1"><Info size={12} className="text-slate-300" /> SHIFT+DRAG TO MOVE BRANCH</div>
                </div>
              </div>
            </div>

            <div className="w-80 bg-white border-l border-slate-200 shrink-0 flex flex-col z-30 shadow-xl shadow-slate-200/50">
               <div className="p-6 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={16} className="text-indigo-600" /> Project Intelligence
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {projectStats && (
                  <>
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider mb-2">
                        <Calendar size={14} className="text-indigo-600" /> Timeline Summary
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Est. Duration</span>
                          <span className="text-sm font-black text-slate-900">{projectStats.totalEstimatedDays} Days</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Target Finish</span>
                          <span className="text-sm font-black text-slate-900">{formatDate(projectStats.finishDate)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Progress</span>
                        <span className="text-lg font-black text-slate-900">{Math.round((projectStats.completedTasks / (projectStats.totalTasks || 1)) * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full transition-all duration-1000"
                          style={{ width: `${(projectStats.completedTasks / (projectStats.totalTasks || 1)) * 100}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 font-medium">{projectStats.completedTasks} of {projectStats.totalTasks} tasks finished</p>
                    </div>

                    <div className="space-y-4">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Breakdown</span>
                      {(settings.statuses || []).map(status => {
                        const count = projectStats.statusCount[status] || 0;
                        const pct = (count / (projectStats.totalTasks || 1)) * 100;
                        return (
                          <div key={status} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-slate-700">
                              <span className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusBorderColor(status) }} />
                                {status}
                              </span>
                              <span>{count}</span>
                            </div>
                            <div className="w-full bg-slate-50 h-1.5 rounded-full">
                              <div 
                                className="h-full rounded-full opacity-60" 
                                style={{ width: `${pct}%`, backgroundColor: getStatusBorderColor(status) }} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                      <h4 className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Wand2 size={12} /> AI Insights
                      </h4>
                      <p className="text-xs text-indigo-900 leading-relaxed font-medium">
                        {projectStats.completedTasks === 0 
                          ? "Project baseline established. AI suggests focusing on the initial conceptual milestones."
                          : `The project is currently tracking towards ${formatDate(projectStats.finishDate)}. Ensure estimated days for future milestones are updated for accurate forecasting.`}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Cloud Setup Modal */}
      {isCloudSetupOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                   <Cloud size={28} />
                 </div>
                 <div>
                   <h3 className="text-2xl font-black text-slate-900">Cloud Sync Setup</h3>
                   <p className="text-sm text-slate-500">Connect to Google Firebase for real-time collaboration.</p>
                 </div>
               </div>
               <button onClick={() => setIsCloudSetupOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto">
              {firebaseService.isConfigured() ? (
                <div className="space-y-6 text-center">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={40} />
                  </div>
                  <h4 className="text-xl font-bold text-slate-800">You are connected!</h4>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Your projects are securely syncing with your Firebase Realtime Database. Any changes you make are instantly available to other users with this configuration.
                  </p>
                  <button 
                    onClick={handleDisconnectFirebase}
                    className="bg-red-50 text-red-600 font-bold px-6 py-3 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-2 mx-auto mt-6"
                  >
                    <LogOut size={18} /> Disconnect & Switch to Local
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Database size={18} className="text-indigo-600" />
                      How to get your credentials:
                    </h4>
                    <ol className="space-y-3 text-sm text-slate-600 list-decimal pl-5">
                      <li>Go to <a href="https://console.firebase.google.com" target="_blank" className="text-indigo-600 font-bold hover:underline">console.firebase.google.com</a> and create a new project.</li>
                      <li>In the project overview, click the <strong>Web (&lt;/&gt;)</strong> icon to register a web app.</li>
                      <li>Copy the <code>firebaseConfig</code> object shown in the setup step.</li>
                      <li>Make sure to enable <strong>Realtime Database</strong> in the Firebase console sidebar.</li>
                      <li>Start in <strong>Test Mode</strong> for development (or configure rules for read/write).</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Firebase Configuration</label>
                    <textarea 
                      className="w-full h-48 bg-slate-900 text-slate-50 font-mono text-xs p-4 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none border border-slate-800"
                      placeholder={`const firebaseConfig = {\n  apiKey: "...",\n  authDomain: "...",\n  databaseURL: "...",\n  projectId: "...",\n  storageBucket: "...",\n  messagingSenderId: "...",\n  appId: "..."\n};`}
                      value={firebaseConfigInput}
                      onChange={(e) => { setFirebaseConfigInput(e.target.value); setConfigError(null); }}
                    />
                    {configError && <p className="text-red-500 text-xs font-bold flex items-center gap-1"><AlertTriangle size={12} /> {configError}</p>}
                    <p className="text-[10px] text-slate-400">Paste the full code block or just the JSON object.</p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                     <button onClick={() => setIsCloudSetupOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
                     <button 
                       onClick={handleSaveFirebaseConfig}
                       disabled={!firebaseConfigInput.trim()}
                       className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
                     >
                       Connect Cloud <ArrowRight size={18} />
                     </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {milestoneToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in zoom-in duration-200">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600 mx-auto">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Delete Milestone?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              This will permanently remove this milestone and its subtasks. Dependencies will be automatically recalculated.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setMilestoneToDelete(null)} 
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteMilestone} 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {projectToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in zoom-in duration-200">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600 mx-auto">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Delete Project?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              This will permanently delete this project and all its data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setProjectToDelete(null)} 
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteProject} 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
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
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-auto p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
                <div className="flex flex-col gap-6">
                  <SettingsSection title="Project Types" icon={<Tags size={18} />} items={settings.projectTypes} onAdd={(v) => updateSettingsList('projectTypes', v, 'add')} onRemove={(v) => updateSettingsList('projectTypes', v, 'remove')} />
                  <SettingsSection title="Companies" icon={<Building size={18} />} items={settings.companies} onAdd={(v) => updateSettingsList('companies', v, 'add')} onRemove={(v) => updateSettingsList('companies', v, 'remove')} />
                </div>
                <div className="flex flex-col gap-6">
                  <SettingsSection title="Team Members" icon={<User size={18} />} items={settings.people} onAdd={(v) => updateSettingsList('people', v, 'add')} onRemove={(v) => updateSettingsList('people', v, 'remove')} />
                  <SettingsSection title="Task Statuses" icon={<CheckCircle2 size={18} />} items={settings.statuses} onAdd={(v) => updateSettingsList('statuses', v, 'add')} onRemove={(v) => updateSettingsList('statuses', v, 'remove')} />
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-slate-800 font-bold mb-1 border-b border-slate-100 pb-2">
                      <LucideType size={18} />
                      Date Format
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, dateFormat: 'DD/MM/YY' }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border ${settings.dateFormat === 'DD/MM/YY' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                      >
                        DD/MM/YY
                      </button>
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, dateFormat: 'MM/DD/YY' }))}
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
                      <button onClick={handleExportBackup} className="bg-white border-2 border-slate-200 text-slate-700 font-black py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-sm active:scale-95"><Download size={20} /> Export (.json)</button>
                      <input type="file" ref={fileInputRef} onChange={handleImportBackup} accept=".json" className="hidden" />
                      <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-indigo-200 shadow-lg active:scale-95"><Upload size={20} /> Import Backup</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreatingProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10 overflow-hidden relative border border-slate-200">
            {isGenerating && (
              <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 border border-indigo-100 relative">
                  <Wand2 className="w-10 h-10 text-indigo-600 animate-bounce" />
                  <div className="absolute inset-0 rounded-3xl ring-4 ring-indigo-500/20 animate-ping" />
                </div>
                <p className="text-slate-900 font-black text-xl mb-2">Gemini is Strategizing...</p>
                <p className="text-slate-500 text-sm font-medium">Constructing a dependency map and detailed subtask hierarchy for your project.</p>
              </div>
            )}
            <h3 className="text-2xl font-black text-slate-900 mb-8">Start New Project</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Project Identity</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 font-bold placeholder-slate-300 transition-all"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="e.g. Skyline Towers Phase 1"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Project Start Date</label>
                <input 
                  type="date" 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-slate-900 font-bold shadow-sm transition-all"
                  value={newProject.startDate}
                  onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Company</label>
                  <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-slate-900 font-bold shadow-sm transition-all" value={newProject.company} onChange={(e) => setNewProject({ ...newProject, company: e.target.value })}>
                    <option value="">Select...</option>
                    {(settings.companies || []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                  <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 text-slate-900 font-bold shadow-sm transition-all" value={newProject.type} onChange={(e) => setNewProject({ ...newProject, type: e.target.value })}>
                    <option value="">Select...</option>
                    {(settings.projectTypes || []).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-10">
                <button onClick={() => setIsCreatingProject(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-4 rounded-2xl transition-all active:scale-95 shadow-sm">Cancel</button>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => handleCreateProject(false)} 
                    disabled={!newProject.name}
                    className="bg-white border-2 border-indigo-100 hover:border-indigo-600 text-indigo-700 font-bold py-3 rounded-2xl transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Blank
                  </button>
                  <button 
                    onClick={() => handleCreateProject(true)} 
                    disabled={!newProject.name}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Wand2 size={18} /> AI Generate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditingSubtask && selectedProjectId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 border border-slate-200 animate-in fade-in zoom-in duration-200">
            {(() => {
              const p = projects.find(proj => proj.id === selectedProjectId);
              const m = p?.milestones.find(mil => mil.id === isEditingSubtask.mId);
              const task = (m?.subtasks || [])[isEditingSubtask.sIdx!];
              if (!task) return null;

              return (
                <div className="space-y-6">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                     <div>
                       <h3 className="text-xl font-black text-slate-900">Edit Task</h3>
                       <p className="text-xs text-slate-500 font-medium">In milestone: <span className="text-indigo-600">{m?.name}</span></p>
                     </div>
                     <button onClick={() => setIsEditingSubtask(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Task Name</label>
                      <input 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        value={task.name}
                        onChange={(e) => updateSubtask(isEditingSubtask.mId, isEditingSubtask.sIdx!, { name: e.target.value })}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assigned To</label>
                        <select 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                          value={task.assignedTo}
                          onChange={(e) => updateSubtask(isEditingSubtask.mId, isEditingSubtask.sIdx!, { assignedTo: e.target.value })}
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
                          onChange={(e) => updateSubtask(isEditingSubtask.mId, isEditingSubtask.sIdx!, { status: e.target.value })}
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
                          onChange={(e) => updateSubtask(isEditingSubtask.mId, isEditingSubtask.sIdx!, { link: e.target.value })}
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
                        onChange={(e) => updateSubtask(isEditingSubtask.mId, isEditingSubtask.sIdx!, { description: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <button 
                      onClick={() => {
                        const newSubtasks = [...(m?.subtasks || [])];
                        newSubtasks.splice(isEditingSubtask.sIdx!, 1);
                        setProjects(prev => prev.map(p => {
                          if (p.id !== selectedProjectId) return p;
                          return {
                            ...p,
                            milestones: p.milestones.map(mil => mil.id === isEditingSubtask.mId ? { ...mil, subtasks: newSubtasks } : mil)
                          };
                        }));
                        setIsEditingSubtask(null);
                      }}
                      className="text-red-500 hover:text-red-700 text-xs font-bold px-3 py-2 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Delete Task
                    </button>
                    <button 
                      onClick={() => setIsEditingSubtask(null)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-2.5 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
                    >
                      Done
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;