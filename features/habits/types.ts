export type HabitFrequency = "daily" | "weekdays" | "weekly" | "custom";

export interface Habit {
  id: string;
  goalId: string | null;
  goalTitle: string | null;
  projectId: string | null;
  projectName: string | null;
  name: string;
  description: string | null;
  category: string | null;
  frequency: HabitFrequency;
  /** 0 = Sunday .. 6 = Saturday, matching Date#getDay(). Only set when frequency is "custom". */
  customDays: number[] | null;
  target: number;
  preferredTime: string | null;
  startDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  logDate: string;
  completed: boolean;
  note: string | null;
}
