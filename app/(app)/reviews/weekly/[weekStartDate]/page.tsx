import { notFound } from "next/navigation";
import { addDays, format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { getWeeklyReviewByWeek } from "@/features/reviews/queries";
import { getTasks } from "@/features/tasks/queries";
import { WeeklyAutoSummary, WeeklyReviewForm } from "@/features/reviews/components";

export default async function WeeklyReviewPage({
  params,
}: {
  params: Promise<{ weekStartDate: string }>;
}) {
  const { weekStartDate } = await params;
  const [review, tasks] = await Promise.all([getWeeklyReviewByWeek(weekStartDate), getTasks()]);
  if (!review) notFound();

  const weekStart = new Date(`${weekStartDate}T00:00:00`);
  const weekEnd = addDays(weekStart, 6);
  const candidateTasks = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled");

  return (
    <div className="flex flex-col">
      <PageHeader
        title={`Week of ${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`}
        description="Weekly Review"
        action={review.status === "completed" ? <Badge variant="success">Completed</Badge> : <Badge variant="warning">In Progress</Badge>}
      />

      <div className="flex flex-col gap-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>This Week at a Glance</CardTitle>
          </CardHeader>
          <CardContent>
            {review.autoSummary && <WeeklyAutoSummary metrics={review.autoSummary} />}
          </CardContent>
        </Card>

        {review.status === "completed" && (
          <Card>
            <CardHeader>
              <CardTitle>Weekly Execution Score</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              {review.executionScore !== null ? (
                <ProgressRing value={review.executionScore} label="Weekly Execution Score" size={72} />
              ) : (
                <p className="text-sm text-text-secondary">Not enough data yet.</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Reflection</CardTitle>
          </CardHeader>
          <CardContent>
            {review.status === "completed" ? (
              <div className="flex flex-col gap-4">
                <ReflectionField label="What did you complete this week?" value={review.reflectionCompleted} />
                <ReflectionField label="What did you miss or not get to?" value={review.reflectionMissed} />
                <ReflectionField label="Why did you miss it?" value={review.reflectionWhy} />
                <ReflectionField label="What progress did you make toward your goals?" value={review.reflectionProgress} />
                <ReflectionField label="Where did time get wasted?" value={review.reflectionTimeWasted} />
                <ReflectionField label="What should you stop doing?" value={review.reflectionStopDoing} />
                <ReflectionField label="What did you learn?" value={review.reflectionLearned} />
              </div>
            ) : (
              <WeeklyReviewForm review={review} candidateTasks={candidateTasks} />
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
