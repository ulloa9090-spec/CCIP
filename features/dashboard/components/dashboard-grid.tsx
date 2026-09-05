import type { ReactNode } from "react";

/**
 * Single grid shared by the real Dashboard and the dev preview route, so
 * layout/ordering logic exists in exactly one place.
 *
 * Ordering (Phase 3 §11 — reorder, don't just shrink):
 * - Mobile (base, unprefixed order-*): Today, Active Project, Habits, Focus
 *   float to the top; everything else follows. Quick Add lives in the
 *   Header, always visible regardless of breakpoint.
 * - md/lg (`md:order-*`): resets to the desktop four-level hierarchy
 *   (blueprint §G) — Today/Active Project, then 90-Day Goal/Weekly
 *   Priorities, then Habits/Calendar/Focus, then Progress/Score/Ideas/Review.
 */
export function DashboardGrid({
  today,
  activeProject,
  ninetyDayGoal,
  weeklyPriorities,
  habits,
  calendar,
  focus,
  progress,
  weeklyScore,
  ideas,
  weeklyReview,
  activity,
}: {
  today: ReactNode;
  activeProject: ReactNode;
  ninetyDayGoal: ReactNode;
  weeklyPriorities: ReactNode;
  habits: ReactNode;
  calendar: ReactNode;
  focus: ReactNode;
  progress: ReactNode;
  weeklyScore: ReactNode;
  ideas: ReactNode;
  weeklyReview: ReactNode;
  activity: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
      <div className="order-1 md:order-1 md:col-span-2">{today}</div>
      <div className="order-2 md:order-2">{activeProject}</div>
      <div className="order-5 md:order-3 md:col-span-2">{ninetyDayGoal}</div>
      <div className="order-6 md:order-4">{weeklyPriorities}</div>
      <div className="order-3 md:order-5">{habits}</div>
      <div className="order-7 md:order-6">{calendar}</div>
      <div className="order-4 md:order-7">{focus}</div>
      <div className="order-8 md:order-8">{progress}</div>
      <div className="order-9 md:order-9">{weeklyScore}</div>
      <div className="order-10 md:order-10">{ideas}</div>
      <div className="order-11 md:order-11">{weeklyReview}</div>
      <div className="order-12 md:order-12 md:col-span-2">{activity}</div>
    </div>
  );
}
