import Link from "next/link";
import {
  ActiveProjectCardBody,
  CalendarSnapshotCardBody,
  DashboardGrid,
  FocusSummaryCardBody,
  HabitSnapshotCardBody,
  IdeaParkingCardBody,
  NinetyDayGoalCardBody,
  ProgressCardBody,
  TodayCardBody,
  WeeklyPrioritiesCardBody,
  WeeklyReviewCardBody,
  WeeklyScoreCardBody,
} from "@/features/dashboard/components";
import { emptyFixtures, populatedFixtures, errorFixtures } from "@/features/dashboard/demo/fixtures";
import { cn } from "@/lib/utils/cn";

type State = "empty" | "populated" | "error";

const STATES: { value: State; label: string }[] = [
  { value: "empty", label: "Empty (new user)" },
  { value: "populated", label: "Populated (demo data)" },
  { value: "error", label: "Error (Today module fails)" },
];

/**
 * Internal-only, dev-only Dashboard visual QA surface (Phase 3 §13). Not
 * linked from navigation, not protected by proxy.ts (nothing here touches
 * auth or Supabase), renders the exact same *CardBody components the real
 * Dashboard uses — fed fixture data instead of a live query — so layout,
 * responsive behavior, and empty/error states can be checked without a
 * real session. See features/dashboard/demo/fixtures.ts.
 */
export default async function DashboardPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state: rawState } = await searchParams;
  const state: State = rawState === "populated" || rawState === "error" ? rawState : "empty";
  const fixtures = state === "populated" ? populatedFixtures : emptyFixtures;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 border-b border-border bg-warning/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-primary">
          Dashboard dev preview — fixture data only, not part of the product.
        </p>
        <div className="flex gap-2">
          {STATES.map((s) => (
            <Link
              key={s.value}
              href={`/dev/dashboard-preview?state=${s.value}`}
              className={cn(
                "rounded-(--radius-token-sm) border border-border px-2.5 py-1 text-xs font-medium",
                state === s.value
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface text-text-secondary hover:text-text-primary",
              )}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <DashboardGrid
        today={<TodayCardBody result={state === "error" ? errorFixtures.today : fixtures.today} />}
        activeProject={<ActiveProjectCardBody result={fixtures.activeProject} />}
        ninetyDayGoal={<NinetyDayGoalCardBody result={fixtures.ninetyDayGoal} />}
        weeklyPriorities={<WeeklyPrioritiesCardBody result={fixtures.weeklyPriorities} />}
        habits={<HabitSnapshotCardBody result={fixtures.habits} />}
        calendar={<CalendarSnapshotCardBody result={fixtures.calendar} />}
        focus={<FocusSummaryCardBody result={fixtures.focus} />}
        progress={<ProgressCardBody result={fixtures.progress} />}
        weeklyScore={<WeeklyScoreCardBody result={fixtures.weeklyScore} />}
        ideas={<IdeaParkingCardBody result={fixtures.ideas} />}
        weeklyReview={<WeeklyReviewCardBody result={fixtures.weeklyReview} />}
      />
    </div>
  );
}
