import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { PageHeader } from "@/components/layout/page-header";
import { getGoalById, getLifeAreas } from "@/features/goals/queries";
import { getCycles } from "@/features/plan-90-days/queries";
import { computeGoalProgress } from "@/features/goals/progress";
import { archiveGoal, updateGoal } from "@/features/goals/actions";
import { GoalForm, GoalStatusBadge } from "@/features/goals/components";

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [goal, lifeAreas, cycles] = await Promise.all([
    getGoalById(id),
    getLifeAreas(),
    getCycles(),
  ]);

  if (!goal) notFound();

  const progress = computeGoalProgress(goal);
  const cycleOptions = cycles.map((c) => ({ id: c.id, name: c.name }));
  const boundUpdate = updateGoal.bind(null, goal.id);
  const boundArchive = archiveGoal.bind(null, goal.id);

  return (
    <div className="flex flex-col">
      <PageHeader
        title={goal.title}
        description={goal.area ? `${goal.area.name} · ${goal.timeframe}` : goal.timeframe}
        action={<GoalStatusBadge status={goal.status} />}
      />

      <div className="grid gap-4 p-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            {progress === null ? (
              <p className="text-sm text-text-secondary">
                Add a metric to track progress toward this goal.
              </p>
            ) : (
              <ProgressRing value={progress} label={`${goal.title} progress`} />
            )}
            {goal.metric && (
              <p className="text-xs text-text-secondary">
                {goal.metric.metricName}: {goal.metric.currentValue ?? "—"} /{" "}
                {goal.metric.targetValue ?? "—"} {goal.metric.unit ?? ""}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Edit Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <GoalForm
              action={boundUpdate}
              lifeAreas={lifeAreas}
              cycles={cycleOptions}
              initialValues={goal}
              submitLabel="Save Changes"
            />
          </CardContent>
        </Card>
      </div>

      <div className="px-6 pb-6">
        <form action={boundArchive}>
          <button
            type="submit"
            className="flex items-center gap-1.5 text-xs font-medium text-danger hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Archive this goal
          </button>
        </form>
      </div>
    </div>
  );
}
