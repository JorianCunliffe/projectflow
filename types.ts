
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

export interface AppSettings {
  projectTypes: string[];
  companies: string[];
  people: string[];
  statuses: string[];
  dateFormat: 'DD/MM/YY' | 'MM/DD/YY';
}

export interface Subtask {
  id: string;
  name: string;
  assignedTo: string;
  description: string;
  notes: string;
  status: string;
  link?: string; // optional external resource link
  completedAt?: number; // timestamp when status became 'Complete'
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

export interface Project {
  id: string;
  name: string;
  company: string;
  type: string;
  startDate: number; // timestamp
  milestones: Milestone[];
  createdAt: number;
  updatedAt: number; // tracks any modification to the project
  
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