import { Target } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getGoals, getLifeAreas } from "@/features/goals/queries";
import { getCycles } from "@/features/plan-90-days/queries";
import { GoalListItem, NewGoalModal, LifeAreaQuickAdd } from "@/features/goals/components";

export default async function GoalsPage() {
  const [lifeAreas, goals, cycles] = await Promise.all([getLifeAreas(), getGoals(), getCycles()]);

  const cycleOptions = cycles.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Goals"
        description="Measurable outcomes, grouped by Life Area."
        action={<NewGoalModal lifeAreas={lifeAreas} cycles={cycleOptions} />}
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
        {lifeAreas.map((area) => (
          <span
            key={area.id}
            className="flex items-center gap-1.5 rounded-(--radius-token-sm) border border-border px-2.5 py-1 text-xs font-medium text-text-secondary"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: area.color ?? "var(--accent)" }}
              aria-hidden="true"
            />
            {area.name}
          </span>
        ))}
        <LifeAreaQuickAdd />
      </div>

      <div className="p-6">
        {goals.length === 0 ? (
          <EmptyState
            icon={<Target className="h-8 w-8" />}
            title="No goals yet"
            description="Create your first goal and connect it to a Life Area."
            action={<NewGoalModal lifeAreas={lifeAreas} cycles={cycleOptions} triggerLabel="New Goal" />}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {lifeAreas
              .map((area) => ({ area, areaGoals: goals.filter((g) => g.areaId === area.id) }))
              .filter(({ areaGoals }) => areaGoals.length > 0)
              .map(({ area, areaGoals }) => (
                <section key={area.id} className="flex flex-col gap-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: area.color ?? "var(--accent)" }}
                      aria-hidden="true"
                    />
                    {area.name}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {areaGoals.map((goal) => (
                      <GoalListItem key={goal.id} goal={goal} />
                    ))}
                  </div>
                </section>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
