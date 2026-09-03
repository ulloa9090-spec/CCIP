export interface LifeArea {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sortOrder: number;
}

export interface GoalMetric {
  id: string;
  metricName: string;
  startingValue: number | null;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
}

export type GoalTimeframe = "lifetime" | "5yr" | "3yr" | "1yr" | "90day" | "monthly";
export type GoalStatus = "planned" | "active" | "paused" | "completed" | "cancelled";

export interface Goal {
  id: string;
  areaId: string;
  quarterCycleId: string | null;
  title: string;
  description: string | null;
  timeframe: GoalTimeframe;
  targetDate: string | null;
  status: GoalStatus;
  notes: string | null;
  createdAt: string;
  metric: GoalMetric | null;
  area: LifeArea | null;
}

export interface QuarterCycleMilestone {
  title: string;
  targetDate: string | null;
  done: boolean;
}

export interface QuarterCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  expectedOutcome: string | null;
  primaryIndicator: string | null;
  strategy: string | null;
  risks: string | null;
  keyMilestones: QuarterCycleMilestone[];
}
