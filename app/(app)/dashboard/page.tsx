import { Suspense } from "react";
import {
  ActiveProjectCard,
  CalendarSnapshotCard,
  DashboardGrid,
  DashboardHeader,
  FocusSummaryCard,
  HabitSnapshotCard,
  IdeaParkingCard,
  NinetyDayGoalCard,
  ProgressCard,
  RecentActivityCard,
  TodayCard,
  WeeklyPrioritiesCard,
  WeeklyReviewCard,
  WeeklyScoreCard,
  WidgetSkeleton,
} from "@/features/dashboard/components";

/**
 * Every widget is its own async Server Component with its own data fetch
 * (features/dashboard/get-dashboard-data.ts), wrapped in its own Suspense
 * boundary — each streams in independently rather than the whole page
 * waiting on the slowest module (Phase 3 §7).
 */
export default function DashboardPage() {
  return (
    <div className="flex flex-col">
      <Suspense fallback={<div className="h-[73px] border-b border-border" />}>
        <DashboardHeader />
      </Suspense>

      <DashboardGrid
        today={
          <Suspense fallback={<WidgetSkeleton />}>
            <TodayCard />
          </Suspense>
        }
        activeProject={
          <Suspense fallback={<WidgetSkeleton />}>
            <ActiveProjectCard />
          </Suspense>
        }
        ninetyDayGoal={
          <Suspense fallback={<WidgetSkeleton />}>
            <NinetyDayGoalCard />
          </Suspense>
        }
        weeklyPriorities={
          <Suspense fallback={<WidgetSkeleton />}>
            <WeeklyPrioritiesCard />
          </Suspense>
        }
        habits={
          <Suspense fallback={<WidgetSkeleton />}>
            <HabitSnapshotCard />
          </Suspense>
        }
        calendar={
          <Suspense fallback={<WidgetSkeleton />}>
            <CalendarSnapshotCard />
          </Suspense>
        }
        focus={
          <Suspense fallback={<WidgetSkeleton />}>
            <FocusSummaryCard />
          </Suspense>
        }
        progress={
          <Suspense fallback={<WidgetSkeleton />}>
            <ProgressCard />
          </Suspense>
        }
        weeklyScore={
          <Suspense fallback={<WidgetSkeleton />}>
            <WeeklyScoreCard />
          </Suspense>
        }
        ideas={
          <Suspense fallback={<WidgetSkeleton />}>
            <IdeaParkingCard />
          </Suspense>
        }
        weeklyReview={
          <Suspense fallback={<WidgetSkeleton />}>
            <WeeklyReviewCard />
          </Suspense>
        }
        activity={
          <Suspense fallback={<WidgetSkeleton />}>
            <RecentActivityCard />
          </Suspense>
        }
      />
    </div>
  );
}
