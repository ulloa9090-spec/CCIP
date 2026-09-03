export interface Decision {
  id: string;
  title: string;
  context: string | null;
  options: string[];
  chosenOption: string | null;
  reasoning: string | null;
  decidedAt: string;
  expectedOutcome: string | null;
  reviewDate: string | null;
  actualOutcome: string | null;
  lesson: string | null;
  goalId: string | null;
  goalTitle: string | null;
  projectId: string | null;
  projectName: string | null;
  taskId: string | null;
  taskTitle: string | null;
}
