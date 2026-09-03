import { Flag } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getCurrentCycle, getCycles } from "@/features/plan-90-days/queries";
import { getGoals } from "@/features/goals/queries";
import { computeCycleProgress } from "@/features/goals/progress";
import { GoalListItem } from "@/features/goals/components";
import { CycleMilestones, NewCycleModal } from "@/features/plan-90-days/components";

export default async function Plan90DaysPage() {
  const [currentCycle, allCycles] = await Promise.all([getCurrentCycle(), getCycles()]);
  const linkedGoals = currentCycle ? await getGoals({ quarterCycleId: currentCycle.id }) : [];
  const progress = currentCycle ? computeCycleProgress(currentCycle, linkedGoals) : null;
  const pastCycles = allCycles.filter((c) => c.id !== currentCycle?.id);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="90-Day Plan"
        description="The quarter that operationalizes a goal into milestones."
        action={<NewCycleModal triggerLabel={currentCycle ? "New Cycle" : "Start a 90-Day Cycle"} />}
      />

      <div className="flex flex-col gap-6 p-6">
        {!currentCycle ? (
          <EmptyState
            icon={<Flag className="h-8 w-8" />}
            title="No active 90-day cycle"
            description="Start a cycle to turn a goal into a focused quarter with real milestones."
            action={<NewCycleModal />}
          />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{currentCycle.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-xs text-text-secondary">
                  {new Date(currentCycle.startDate).toLocaleDateString()} –{" "}
                  {new Date(currentCycle.endDate).toLocaleDateString()}
                </p>
                {currentCycle.expectedOutcome && (
                  <p className="text-sm text-text-primary">{currentCycle.expectedOutcome}</p>
                )}
                {progress === null ? (
                  <p className="text-sm text-text-secondary">
                    Progress appears once a linked goal has a metric.
                  </p>
                ) : (
                  <ProgressBar value={progress} ariaLabel={`${currentCycle.name} progress`} label="Progress" />
                )}
                {currentCycle.primaryIndicator && (
                  <p className="text-xs text-text-secondary">
                    Primary indicator: {currentCycle.primaryIndicator}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Milestones</CardTitle>
                </CardHeader>
                <CardContent>
                  <CycleMilestones cycleId={currentCycle.id} milestones={currentCycle.keyMilestones} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Linked Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  {linkedGoals.length === 0 ? (
                    <p className="text-sm text-text-secondary">
                      Link a goal to this cycle from the goal&apos;s edit form.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {linkedGoals.map((goal) => (
                        <GoalListItem key={goal.id} goal={goal} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {pastCycles.length > 0 && (
          <details className="rounded-(--radius-token-md) border border-border p-4">
            <summary className="cursor-pointer text-sm font-medium text-text-primary">
              Past cycles ({pastCycles.length})
            </summary>
            <div className="mt-3 flex flex-col gap-2">
              {pastCycles.map((cycle) => (
                <div key={cycle.id} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary">{cycle.name}</span>
                  <span className="text-text-secondary">
                    {new Date(cycle.startDate).toLocaleDateString()} –{" "}
                    {new Date(cycle.endDate).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
