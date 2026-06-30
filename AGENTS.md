# ProjectFlow Application Reference

This file serves as the system instruction and context reference for modifying the ProjectFlow application. Any agent working on this codebase must adhere to the patterns and data structures defined here.

## Architecture & Data Persistence

ProjectFlow is a React SPA (Single Page Application) that manages global state for Projects, Milestones, and Tasks inside `App.tsx` and persists it downwards.
- **Do not write direct backend/API endpoints** to save generic tasks if they already fit the schema.
- Data is saved automatically. The application uses a `useEffect` inside `App.tsx` to automatically listen for changes to the state arrays (`projects`, `settings`, `activityLogs`, `scratchTasks`) and syncs them to either `localStorage` or `firebaseService`.
- **Modifying Data:** Perform CRUD operations purely by triggering state updates (e.g. `setProjects(prevProjects => ... )`).

## Core Data Schema

### 1. `Project`
A project represents a top-level container of work. 
```typescript
interface Project {
  id: string;              // Unique identifier
  name: string;            // Name of the project
  company: string;         // Company or client
  type: string;            // Project type categorized
  startDate: number;       // Unix timestamp 
  milestones: Milestone[]; // Array of milestones
  createdAt: number;
  updatedAt: number;
  // Financial Fields
  cashRequirement?: number;
  debtRequirement?: number;
  valueAtCompletion?: number;
  profit?: number;
}
```

### 2. `Milestone`
Milestones are major checkpoints consisting of multiple subtasks.
```typescript
interface Milestone {
  id: string;
  name: string;
  subtasks: Subtask[];     // Tasks that complete the milestone
  dependsOn: string[];     // IDs of prerequisites
  estimatedDuration: number;
  completedAt?: number;
}
```

### 3. `Subtask` (Task)
The fundamental unit of work.
```typescript
interface Subtask {
  id: string;
  name: string;
  assignedTo: string;
  description: string;
  notes: string;
  status: string;          // E.g., 'Not started', 'Complete'
  dueDate?: number;        // Timestamp
  estimatedTime?: number;
  actualTime?: number;
  
  // RACI Matrix
  accountable?: string;
  consulted?: string[];
  informed?: string[];
}
```

## Logging Activity (CRITICAL!)
ProjectFlow includes a dedicated Reporting application view that queries `activityLogs` to calculate actual progress occurring over a bounded unit of time.
- **Rule:** Whenever you do any work programmatically to create, update, or resolve a task (e.g. status change, completion, assignment), you **MUST** invoke `logActivity` (or its equivalent in scope) to capture this. 

```typescript
// Pattern for logging
logActivity(
  projectId, 
  taskId, 
  taskName, 
  'updated' | 'created' | 'deleted', 
  detailsText, 
  { responsible, accountable, consulted, informed }
);
```
Without logging, actions are 'invisible' to the reporting engine!

## Development Guidelines
- **Frameworks:** React + Tailwind CSS.
- **Icons:** Must be imported from `lucide-react` (e.g. `<Filter className="text-gray-500" />`). No external SVG files unless an explicit branding requirement necessitates it.
- **Icons & Theme:** Keep the color palette professional. Indigo is the primary brand color for ProjectFlow.
