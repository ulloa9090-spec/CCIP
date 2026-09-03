export type JournalCategory =
  | "daily_reflection"
  | "learning"
  | "win"
  | "problem"
  | "observation"
  | "free_note";

export interface JournalEntry {
  id: string;
  category: JournalCategory;
  body: string;
  goalId: string | null;
  goalTitle: string | null;
  projectId: string | null;
  projectName: string | null;
  taskId: string | null;
  taskTitle: string | null;
  decisionId: string | null;
  decisionTitle: string | null;
  createdAt: string;
}
