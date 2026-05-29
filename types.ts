
export enum SubtaskStatus {
  COMPLETE = 'Complete',
  NOT_COMPLETE = 'Not Complete',
  NOT_STARTED = 'Not started',
  STARTED = 'Started',
  HELD = 'Held'
}

export enum ProjectType {
  SUBDIVISION = 'Subdivision',
  GREENFIELD = 'Greenfield Development',
  OTHER = 'Other'
}

export interface TeamMemberDetails {
  email?: string;
  phone?: string;
}

export interface AppSettings {
  projectTypes: string[];
  companies: string[];
  people: string[];
  roles: string[];
  teamMemberDetails?: Record<string, TeamMemberDetails>; // name -> details
  statuses: string[];
  dateFormat: 'DD/MM/YY' | 'MM/DD/YY';
  nextProjectId?: number;
  nextTaskId?: number;
}

export interface Subtask {
  id: string;
  displayId?: string;
  name: string;
  assignedTo: string;
  role?: string;
  description: string;
  notes: string;
  status: string;
  link?: string; // optional external resource link
  completedAt?: number; // timestamp when status became 'Complete'
  
  // Extended Metadata
  estimatedTime?: number;
  timeUnit?: 'hours' | 'days' | 'weeks';
  dueDate?: number; // timestamp
  isImportant?: boolean;
  isToday?: boolean;
}

export interface Milestone {
  id: string;
  name: string;
  subtasks: Subtask[];
  dependsOn: string[];
  estimatedDuration: number; // in days
  completedAt?: number; // timestamp when all subtasks are complete
  x?: number;
  y?: number;
}

export interface TimelineMarker {
  id: string;
  name: string;
  x: number;
}

export interface Project {
  id: string;
  displayId?: string;
  name: string;
  company: string;
  type: string;
  startDate: number; // timestamp
  milestones: Milestone[];
  markers?: TimelineMarker[];
  createdAt: number;
  updatedAt: number; // tracks any modification to the project
  isArchived?: boolean;
  
  // Financial Fields (in Thousands $K)
  cashRequirement?: number;
  debtRequirement?: number;
  valueAtCompletion?: number;
  profit?: number;
}

export interface AppState {
  projects: Project[];
  selectedProjectId: string | null;
  showSubtasks: boolean;
  settings: AppSettings;
}