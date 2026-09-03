export type ProjectStatus = "active" | "secondary" | "waiting" | "someday" | "completed" | "archived";
export type MilestoneStatus = "pending" | "in_progress" | "done";

export interface Milestone {
  id: string;
  title: string;
  targetDate: string | null;
  status: MilestoneStatus;
  sortOrder: number;
}

export interface Project {
  id: string;
  goalId: string | null;
  goalTitle: string | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  isPrimaryActive: boolean;
  startDate: string | null;
  deadline: string | null;
  progressOverride: number | null;
  notes: string | null;
  createdAt: string;
  milestones: Milestone[];
  taskStats: { total: number; done: number };
}
