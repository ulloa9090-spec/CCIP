import { notFound } from "next/navigation";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMonthlyReviewByMonth } from "@/features/reviews/queries";
import { MonthlyAutoSummary, MonthlyReviewForm } from "@/features/reviews/components";

export default async function MonthlyReviewPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;
  const review = await getMonthlyReviewByMonth(month);
  if (!review) notFound();

  const monthDate = new Date(`${month}T00:00:00`);

  return (
    <div className="flex flex-col">
      <PageHeader
        title={format(monthDate, "MMMM yyyy")}
        description="Monthly Review"
        action={review.status === "completed" ? <Badge variant="success">Completed</Badge> : <Badge variant="warning">In Progress</Badge>}
      />

      <div className="flex flex-col gap-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>This Month at a Glance</CardTitle>
          </CardHeader>
          <CardContent>{review.autoSummary && <MonthlyAutoSummary summary={review.autoSummary} />}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reflection</CardTitle>
          </CardHeader>
          <CardContent>
            {review.status === "completed" ? (
              <div className="flex flex-col gap-4">
                <ReflectionField label="Wins this month" value={review.wins} />
                <ReflectionField label="Failures or setbacks" value={review.failures} />
                <ReflectionField label="Lessons learned" value={review.lessons} />
                <ReflectionField label="Priorities for next month" value={review.nextMonthPriorities} />
              </div>
            ) : (
              <MonthlyReviewForm review={review} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReflectionField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-text-primary">{label}</span>
      <p className="whitespace-pre-wrap text-sm text-text-secondary">{value}</p>
    </div>
  );
}
