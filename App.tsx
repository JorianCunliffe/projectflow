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
  Eye, 
  EyeOff, 
  ChevronLeft,
  Settings,
  ShieldAlert,
  Info,
  Activity,
  RefreshCw,
  Maximize,
  ZoomIn,
  Trash2,
  Link as LinkIcon,
  Map as MapIcon,
  Layout,
  Cloud,
  CloudOff
} from 'lucide-react';
import { geminiService } from './services/geminiService';
import { firebaseService } from './services/firebaseService';

// Imported Components
import { Dashboard } from './components/Dashboard';
import { ProjectSidebar } from './components/ProjectSidebar';
import { SettingsModal } from './components/modals/SettingsModal';
import { CloudSetupModal } from './components/modals/CloudSetupModal';
import { CreateProjectModal } from './components/modals/CreateProjectModal';
import { EditProjectModal } from './components/modals/EditProjectModal';
import { EditTaskModal } from './components/modals/EditTaskModal';

const STORAGE_KEY = 'projectflow_data_v6';
const BACKUP_KEY = 'projectflow_safety_backup';

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

export const App: React.FC = () => {
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

  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isEditingSubtask, setIsEditingSubtask] = useState<{ mId: string, sIdx: number | null } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCloudSetupOpen, setIsCloudSetupOpen] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [milestoneToDelete, setMilestoneToDelete] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  // Linking State
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);

  // Minimap State
  const [showMinimap, setShowMinimap] = useState(true);

  // Cloud Sync State
  const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'syncing' | 'connected' | 'error'>('disconnected');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false); 
  
  // Safety Locks
  const isRemoteUpdate = useRef(false);
  const isDbInitialized = useRef(false); // CRITICAL: Prevents overwriting DB with empty local state on load

  const formatDate = (date: Date | number | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return settings.dateFormat === 'DD/MM/YY' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
  };

  const sanitizeProjects = (rawProjects: any): Project[] => {
    if (!rawProjects) return [];
    const projectsList = Array.isArray(rawProjects) ? rawProjects : Object.values(rawProjects);
    return projectsList.map((p: any) => ({
      ...p,
      milestones: (Array.isArray(p.milestones) ? p.milestones : Object.values(p.milestones || [])).map((m: any) => ({
        ...m,
        dependsOn: Array.isArray(m.dependsOn) ? m.dependsOn : Object.values(m.dependsOn || []),
        subtasks: (Array.isArray(m.subtasks) ? m.subtasks : Object.values(m.subtasks || [])).map((s: any) => ({
          ...s
        }))
      }))
    }));
  };

  useEffect(() => {
    if (!firebaseService.isConfigured()) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setProjects(sanitizeProjects(parsed.projects));
          setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
        } catch (e) {
          console.error("Failed to load local state", e);
        }
      }
      setIsDataLoaded(true);
      isDbInitialized.current = true; // Local storage is "initialized" immediately
      return;
    }

    setCloudStatus('syncing');

    const unsubscribe = firebaseService.subscribe((data) => {
      setCloudStatus('connected');
      setSyncError(null);
      
      // Mark DB as initialized. We have successfully read from the server.
      // Even if data is null (empty DB), we are now safe to write future changes.
      isDbInitialized.current = true; 

      if (data) {
        localStorage.setItem(BACKUP_KEY, JSON.stringify(data));
        isRemoteUpdate.current = true;
        
        const sanitizedProjects = sanitizeProjects(data.projects);
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
        // DB is empty. Handle initialization if needed, or leave as empty array.
        // We do NOT want to overwrite local storage backup if DB is empty unless explicitly intended, 
        // but for now we follow the "Server is Truth" model.
        
        // Use local storage if it exists and DB is empty? (Optional safety feature, but risky if intentional delete)
        // For this implementation: Server is empty -> App is empty.
        isRemoteUpdate.current = true;
        setProjects([]);
      }
      
      setIsDataLoaded(true);
    }, (error) => {
       console.error("Subscription Error:", error);
       setCloudStatus('error');
       setSyncError(error.message);
       setIsDataLoaded(true);
       // Note: We do NOT set isDbInitialized to true on error. 
       // This prevents saving local changes while offline/error state if we haven't synced yet.
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isDataLoaded) return;
    
    // CRITICAL SAFETY CHECK
    // If we are in cloud mode, we must NEVER save until we have confirmed receipt of the initial data.
    if (firebaseService.isConfigured() && !isDbInitialized.current) return;

    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    const saveData = async () => {
      if (firebaseService.isConfigured()) {
        if (cloudStatus === 'error') return; 

        setCloudStatus('syncing');
        try {
          await firebaseService.save({ projects, settings });
          setCloudStatus('connected');
          setSyncError(null);
        } catch (err: any) {
          setCloudStatus('error');
          setSyncError(err.message || "Failed to save to cloud");
        }
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, settings }));
      }
    };

    // Debounce saves
    const timer = setTimeout(saveData, 800);
    return () => clearTimeout(timer);
  }, [projects, settings, isDataLoaded, cloudStatus]);

  const handleDisconnectFirebase = () => {
    if(window.confirm("Are you sure you want to disconnect? You will switch back to local storage.")) {
      firebaseService.disconnect();
    }
  }

  const handleRestoreFromBackup = () => {
    const backup = localStorage.getItem(BACKUP_KEY);
    if (!backup) {
      alert("No auto-backup found.");
      return;
    }
    if (window.confirm("CRITICAL: This will overwrite your current view with the last successful download from the cloud. Are you sure?")) {
      try {
        const parsed = JSON.parse(backup);
        const cleaned = sanitizeProjects(parsed.projects);
        setProjects(cleaned);
        if (parsed.settings) setSettings(parsed.settings);
        isRemoteUpdate.current = false; 
        alert("Backup restored! Attempting to sync to cloud...");
      } catch (e) {
        alert("Failed to parse backup data.");
      }
    }
  };

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
      
      const autoX = startX + level * HORIZONTAL_GAP;
      // Note: totalInLevel could be grabbed from groupedByLevel[level].length if needed for finer layout
      // But preserving exact existing logic:
      const total = groupedByLevel[level].length;
      const autoY = centerY + (indexInLevel - (total - 1) / 2) * VERTICAL_GAP;
      
      const x = m.x !== undefined ? m.x : autoX;
      const y = m.y !== undefined ? m.y : autoY;

      return { ...m, x, y };
    });
    return { milestones, width, height };
  }, [activeProject]);

  const centerView = () => {
    setZoom(1); 
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
    const scaleX = (viewW - padding) / Math.max(contentW, 1);
    const scaleY = (viewH - padding) / Math.max(contentH, 1);
    const newZoom = Math.min(scaleX, scaleY, 1); 
    setZoom(newZoom);
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
          return rest; 
        })
      };
    }));
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
          setProjects(sanitizeProjects(parsed.projects));
          setSettings(parsed.settings);
          alert("Backup restored successfully!");
        }
      } catch (err) {
        alert("Failed to restore backup: " + (err instanceof Error ? err.message : "Unknown error"));
      }
    };
    reader.readAsText(file);
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

  const handleCreateProject = async (newProjectData: any, useAI: boolean) => {
    setIsGenerating(true);
    let milestones: Milestone[] = [];
    
    // Default fallback template
    const defaultMilestones = [{
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

    if (useAI) {
      const res = await geminiService.generateProjectStructure(newProjectData.name, newProjectData.type as any);
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
      } else {
        // AI Failed (e.g. no key, network error), fallback to default
        console.warn("AI Generation failed or returned empty. Using default template.");
        milestones = defaultMilestones;
        alert("AI could not generate the structure (check API Key). Created with default template instead.");
      }
    } else {
      milestones = defaultMilestones;
    }

    const now = Date.now();
    const project: Project = {
      id: now.toString(),
      name: newProjectData.name,
      company: newProjectData.company || settings.companies[0],
      type: newProjectData.type || settings.projectTypes[0],
      startDate: new Date(newProjectData.startDate).getTime(),
      cashRequirement: newProjectData.cashRequirement,
      debtRequirement: newProjectData.debtRequirement,
      valueAtCompletion: newProjectData.valueAtCompletion,
      profit: newProjectData.profit,
      milestones,
      createdAt: now,
      updatedAt: now
    };

    setProjects([...projects, project]);
    setSelectedProjectId(project.id);
    setIsCreatingProject(false);
    setIsGenerating(false);
  };

  const handleSaveProjectEdit = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? { ...updatedProject, updatedAt: Date.now() } : p));
    setEditingProject(null);
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
    const targetMilestone = activeProject.milestones.find(m => m.id === targetId);
    if (targetMilestone?.dependsOn?.includes(linkingSourceId)) {
      alert("These milestones are already linked.");
      setLinkingSourceId(null);
      return;
    }
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
        if (m.id === currentMilestoneId) return { ...m, dependsOn: [newId] };
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

  const deleteSubtask = (mId: string, sIdx: number) => {
      setProjects(prev => prev.map(p => {
        if (p.id !== selectedProjectId) return p;
        return {
          ...p,
          milestones: p.milestones.map(mil => {
            if (mil.id !== mId) return mil;
            const newSubtasks = [...(mil.subtasks || [])];
            newSubtasks.splice(sIdx, 1);
            return { ...mil, subtasks: newSubtasks };
          })
        };
      }));
  };

  if (!isDataLoaded && firebaseService.isConfigured()) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900">
         <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
         <h2 className="text-xl font-bold">Loading Project Data...</h2>
         <p className="text-slate-500 mt-2">Syncing with secure cloud storage</p>
         {syncError && (
           <div className="mt-8 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 max-w-md text-center">
             <div className="font-bold flex items-center justify-center gap-2 mb-2"><ShieldAlert /> Connection Error</div>
             <p className="text-sm">{syncError}</p>
             <button 
               onClick={() => setIsDataLoaded(true)} 
               className="mt-4 px-4 py-2 bg-white border border-red-200 rounded-lg text-sm font-bold shadow-sm hover:bg-red-50"
             >
               Skip & Work Offline (Risky)
             </button>
           </div>
         )}
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col text-slate-900 bg-slate-50 overflow-hidden">
      {/* ERROR BANNER */}
      {syncError && cloudStatus === 'error' && (
        <div className="bg-red-600 text-white px-4 py-2 text-center text-sm font-bold flex items-center justify-center gap-2 animate-pulse z-[60]">
          <ShieldAlert size={16} /> CRITICAL SYNC ERROR: Data is NOT saving to cloud. ({syncError})
          <button onClick={() => setIsCloudSetupOpen(true)} className="underline ml-2 hover:text-red-100">Check Settings</button>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm shrink-0">
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
                cloudStatus === 'error' ? 'bg-red-50 text-red-600 border-red-200' :
                'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {cloudStatus === 'syncing' ? <RefreshCw size={12} className="animate-spin" /> : 
               cloudStatus === 'error' ? <ShieldAlert size={12} /> : <Cloud size={12} />}
              {cloudStatus === 'syncing' ? 'SYNCING...' : 
               cloudStatus === 'error' ? 'SYNC ERROR' : 'CLOUD ACTIVE'}
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
        {!selectedProjectId || !activeProject ? (
          <Dashboard 
            projects={projects}
            settings={settings}
            onSelectProject={setSelectedProjectId}
            onEditProject={setEditingProject}
            onDuplicateProject={handleDuplicateProject}
            onDeleteProject={handleDeleteProject}
            formatDate={formatDate}
          />
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
                      <span className="text-xs font-bold text-slate-700">{formatDate(activeProject?.startDate)}</span>
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

            <ProjectSidebar stats={projectStats} settings={settings} formatDate={formatDate} />
          </div>
        )}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      <CloudSetupModal 
        isOpen={isCloudSetupOpen}
        onClose={() => setIsCloudSetupOpen(false)}
        cloudStatus={cloudStatus}
        syncError={syncError}
        onDisconnect={handleDisconnectFirebase}
        onRestoreBackup={handleRestoreFromBackup}
      />

      <CreateProjectModal 
        isOpen={isCreatingProject}
        onClose={() => setIsCreatingProject(false)}
        settings={settings}
        isGenerating={isGenerating}
        onCreate={handleCreateProject}
      />

      {editingProject && (
        <EditProjectModal 
          project={editingProject}
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
          onSave={handleSaveProjectEdit}
          settings={settings}
        />
      )}

      {isEditingSubtask && selectedProjectId && (
         <EditTaskModal 
           isOpen={!!isEditingSubtask}
           onClose={() => setIsEditingSubtask(null)}
           task={activeProject!.milestones.find(m => m.id === isEditingSubtask.mId)!.subtasks[isEditingSubtask.sIdx!]}
           milestoneName={activeProject!.milestones.find(m => m.id === isEditingSubtask.mId)!.name}
           settings={settings}
           onUpdate={(updates) => updateSubtask(isEditingSubtask.mId, isEditingSubtask.sIdx!, updates)}
           onDelete={() => {
             deleteSubtask(isEditingSubtask.mId, isEditingSubtask.sIdx!);
             setIsEditingSubtask(null);
           }}
         />
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
    </div>
  );
};

export default App;