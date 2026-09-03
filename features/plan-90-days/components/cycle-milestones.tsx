import { Check } from "lucide-react";
import { toggleCycleMilestone } from "@/features/plan-90-days/actions";
import type { QuarterCycleMilestone } from "@/features/goals/types";
import { cn } from "@/lib/utils/cn";

export function CycleMilestones({
  cycleId,
  milestones,
}: {
  cycleId: string;
  milestones: QuarterCycleMilestone[];
}) {
  if (milestones.length === 0) {
    return <p className="text-sm text-text-secondary">No milestones defined for this cycle.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {milestones.map((milestone, index) => (
        <li key={index}>
          <form action={toggleCycleMilestone.bind(null, cycleId, index)}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-(--radius-token-sm) px-1 py-1 text-left text-sm hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  milestone.done ? "border-success bg-success text-white" : "border-border",
                )}
                aria-hidden="true"
              >
                {milestone.done && <Check className="h-3 w-3" />}
              </span>
              <span className={cn(milestone.done && "text-text-secondary line-through")}>
                {milestone.title}
              </span>
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
