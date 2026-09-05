import {
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  ListChecks,
  Repeat,
  Timer,
  type LucideIcon,
} from "lucide-react";
import type { CategoryColor } from "@/lib/design/category-colors";

/**
 * Icon + color per Analytics metric (Design System Premium Polish, ADR
 * 0020) — reuses the same domain colors already assigned on the Dashboard
 * (Habits=orange, Focus=teal, Weekly Score=rose, Weekly Priorities=cyan)
 * so the same concept reads as the same color everywhere in the app.
 * `overdueTasks` uses the real `danger` status token instead of a category
 * color — being overdue is a severity signal, not a category.
 */
export interface MetricAccent {
  icon: LucideIcon;
  color: CategoryColor | "danger";
}

export const METRIC_ACCENT: Record<string, MetricAccent> = {
  taskCompletionRate: { icon: CheckCircle2, color: "blue" },
  weeklyPriorityCompletion: { icon: ListChecks, color: "cyan" },
  habitConsistency: { icon: Repeat, color: "orange" },
  focusMinutes: { icon: Timer, color: "teal" },
  overdueTasks: { icon: AlertTriangle, color: "danger" },
  createdVsCompleted: { icon: BarChart3, color: "indigo" },
  weeklyScoreTrend: { icon: Award, color: "rose" },
};

export const DEFAULT_METRIC_ACCENT: MetricAccent = { icon: BarChart3, color: "blue" };

export function getMetricAccent(key: string): MetricAccent {
  return METRIC_ACCENT[key] ?? DEFAULT_METRIC_ACCENT;
}
