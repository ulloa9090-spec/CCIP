import { ClipboardList } from "lucide-react";
import { startOfMonth } from "date-fns";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { weekStartDate } from "@/features/tasks/queries";
import { toDateStr } from "@/features/habits/progress";
import { getMonthlyReviews, getWeeklyReviews } from "@/features/reviews/queries";
import { startOrGetMonthlyReview, startOrGetWeeklyReview } from "@/features/reviews/actions";
import {
  MonthlyReviewListItem,
  ReviewTabs,
  WeeklyReviewListItem,
} from "@/features/reviews/components";

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "monthly" ? "monthly" : "weekly";

  const currentWeekStart = weekStartDate();
  const currentMonth = toDateStr(startOfMonth(new Date()));

  const [weeklyReviews, monthlyReviews] = await Promise.all([getWeeklyReviews(), getMonthlyReviews()]);

  const thisWeekReview = weeklyReviews.find((r) => r.weekStartDate === currentWeekStart);
  const thisMonthReview = monthlyReviews.find((r) => r.month === currentMonth);

  return (
    <div className="flex flex-col">
      <PageHeader title="Reviews" description="Weekly and Monthly Review sessions." />

      <div className="flex flex-col gap-4 p-6">
        <ReviewTabs active={tab} />

        {tab === "weekly" ? (
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>This Week</CardTitle>
              </CardHeader>
              <CardContent>
                {thisWeekReview?.status === "completed" ? (
                  <p className="text-sm text-text-secondary">
                    This week&apos;s review is complete.{" "}
                    <Link href={`/reviews/weekly/${currentWeekStart}`} className="font-medium text-accent hover:underline">
                      View it
                    </Link>
                    .
                  </p>
                ) : (
                  <form action={startOrGetWeeklyReview.bind(null, currentWeekStart)}>
                    <Button type="submit" size="sm">
                      {thisWeekReview ? "Continue This Week's Review" : "Start This Week's Review"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {weeklyReviews.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-8 w-8" />}
                title="No reviews yet"
                description="Your first Weekly Review will appear here once you start one."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {weeklyReviews.map((r) => (
                  <WeeklyReviewListItem key={r.id} review={r} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>This Month</CardTitle>
              </CardHeader>
              <CardContent>
                {thisMonthReview?.status === "completed" ? (
                  <p className="text-sm text-text-secondary">
                    This month&apos;s review is complete.{" "}
                    <Link href={`/reviews/monthly/${currentMonth}`} className="font-medium text-accent hover:underline">
                      View it
                    </Link>
                    .
                  </p>
                ) : (
                  <form action={startOrGetMonthlyReview.bind(null, currentMonth)}>
                    <Button type="submit" size="sm">
                      {thisMonthReview ? "Continue This Month's Review" : "Start This Month's Review"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {monthlyReviews.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-8 w-8" />}
                title="No reviews yet"
                description="Your first Monthly Review will appear here once you start one."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {monthlyReviews.map((r) => (
                  <MonthlyReviewListItem key={r.id} review={r} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
