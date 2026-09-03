export type ChallengeStatus = "active" | "completed" | "abandoned";

export interface ChallengeDay {
  id: string;
  dayNumber: number;
  completed: boolean;
  note: string | null;
}

export interface Challenge {
  id: string;
  goalId: string | null;
  goalTitle: string | null;
  title: string;
  dailyAction: string | null;
  startDate: string;
  status: ChallengeStatus;
  finalScore: number | null;
  reflections: string | null;
  createdAt: string;
  days: ChallengeDay[];
}
