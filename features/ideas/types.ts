export type IdeaStatus = "new" | "review_later" | "evaluating" | "promoted" | "rejected" | "archived";

export interface Idea {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: IdeaStatus;
  impact: number | null;
  effort: number | null;
  urgency: number | null;
  notes: string | null;
  reviewDate: string | null;
  promotedProjectId: string | null;
  createdAt: string;
}
