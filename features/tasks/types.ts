export type TaskStatus = "inbox" | "next" | "today" | "in_progress" | "waiting" | "done" | "cancelled";
export type TaskPriority = "critical" | "high" | "medium" | "low";

export interface Task {
  id: string;
  projectId: string | null;
  projectName: string | null;
  goalId: string | null;
  milestoneId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  scheduledDate: string | null;
  isMit: boolean;
  completedAt: string | null;
  createdAt: string;
}
