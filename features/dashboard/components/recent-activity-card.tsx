import { formatDistanceToNowStrict } from "date-fns";
import { BookOpen, CheckCircle2, ClipboardCheck, Flame, History, Lightbulb, Timer } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_CHIP_CLASSES, type CategoryColor } from "@/lib/design/category-colors";
import type { ActivityItemType, DashboardActivityData, ModuleResult } from "@/features/dashboard/types";
import { safeModule, getRecentActivityData } from "@/features/dashboard/get-dashboard-data";
import { WidgetCard } from "./widget-card";
import { WidgetError } from "./widget-error";

const TYPE_META: Record<ActivityItemType, { icon: typeof CheckCircle2; color: CategoryColor }> = {
  task: { icon: CheckCircle2, color: "blue" },
  habit: { icon: Flame, color: "orange" },
  focus: { icon: Timer, color: "teal" },
  journal: { icon: BookOpen, color: "cyan" },
  idea: { icon: Lightbulb, color: "amber" },
  review: { icon: ClipboardCheck, color: "violet" },
};

function occurredAtLabel(occurredAt: string): string {
  // Plain dates (yyyy-mm-dd, no time component) render as calendar days;
  // full ISO timestamps get real relative time ("2h ago").
  const hasTime = occurredAt.includes("T");
  const date = new Date(hasTime ? occurredAt : `${occurredAt}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return `${formatDistanceToNowStrict(date)} ago`;
}

export function RecentActivityCardBody({
  result,
}: {
  result: ModuleResult<DashboardActivityData>;
}) {
  return (
    <WidgetCard title="Recent Activity" icon={<History className="h-4 w-4" />} accent="violet">
      {result.status === "error" ? (
        <WidgetError />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          title="Nothing yet"
          description="Completed tasks, habits, and sessions will show up here."
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {result.data.items.map((item) => {
            const { icon: Icon, color } = TYPE_META[item.type];
            return (
              <li key={item.id} className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    CATEGORY_CHIP_CLASSES[color],
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="flex-1 truncate text-body text-text-primary">{item.title}</span>
                <span className="shrink-0 text-caption text-text-secondary">
                  {occurredAtLabel(item.occurredAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}

export async function RecentActivityCard() {
  const result = await safeModule(getRecentActivityData);
  return <RecentActivityCardBody result={result} />;
}
