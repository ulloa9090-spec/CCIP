import Link from "next/link";
import { ProgressBar } from "@/components/ui/progress-bar";
import { computeGoalProgress } from "@/features/goals/progress";
import type { Goal } from "@/features/goals/types";
import { GoalStatusBadge } from "./goal-status-badge";

export function GoalListItem({ goal }: { goal: Goal }) {
  const progress = computeGoalProgress(goal);

  return (
    <Link
      href={`/goals/${goal.id}`}
      className="flex flex-col gap-2 rounded-(--radius-token-sm) border border-border p-3 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-text-primary">{goal.title}</p>
        <GoalStatusBadge status={goal.status} />
      </div>
      {progress !== null && <ProgressBar value={progress} ariaLabel={`${goal.title} progress`} />}
      {goal.targetDate && (
        <p className="text-xs text-text-secondary">
          Target: {new Date(goal.targetDate).toLocaleDateString()}
        </p>
      )}
    </Link>
  );
}
