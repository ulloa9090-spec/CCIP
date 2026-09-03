export interface FocusSession {
  id: string;
  taskId: string | null;
  taskTitle: string | null;
  projectId: string | null;
  projectName: string | null;
  context: string | null;
  plannedMinutes: number | null;
  actualMinutes: number;
  startedAt: string;
  endedAt: string | null;
  note: string | null;
}
