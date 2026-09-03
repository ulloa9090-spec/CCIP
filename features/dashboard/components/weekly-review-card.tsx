import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardWeeklyReviewData, ModuleResult } from "@/features/dashboard/types";
import { safeModule, getWeeklyReviewData } from "@/features/dashboard/get-dashboard-data";
import { WidgetCard } from "./widget-card";
import { WidgetError } from "./widget-error";

export function WeeklyReviewCardBody({
  result,
}: {
  result: ModuleResult<DashboardWeeklyReviewData>;
}) {
  return (
    <WidgetCard title="Weekly Review" icon={<ClipboardList className="h-4 w-4" />}>
      {result.status === "error" ? (
        <WidgetError />
      ) : result.data.reviewDueNow ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-text-primary">This week&apos;s review is ready.</p>
          <Button size="sm" asChild className="self-start">
            <Link href="/reviews">Start Weekly Review</Link>
          </Button>
        </div>
      ) : result.data.lastReviewCompletedAt !== null ? (
        <p className="text-sm text-text-secondary">
          Last reviewed week of {new Date(`${result.data.lastReviewCompletedAt}T00:00:00`).toLocaleDateString()}.
        </p>
      ) : (
        <EmptyState
          title="Nothing to review yet"
          description="Your first weekly review will appear here."
        />
      )}
    </WidgetCard>
  );
}

export async function WeeklyReviewCard() {
  const result = await safeModule(getWeeklyReviewData);
  return <WeeklyReviewCardBody result={result} />;
}
