import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { ANALYTICS_RANGES, type AnalyticsRangeDays } from "@/features/analytics/types";

export function RangeSelector({ active }: { active: AnalyticsRangeDays }) {
  return (
    <div className="flex w-fit gap-1 rounded-(--radius-token-sm) bg-surface p-1">
      {ANALYTICS_RANGES.map((r) => (
        <Link
          key={r}
          href={`/analytics?range=${r}`}
          className={cn(
            "rounded-(--radius-token-sm) px-3 py-1.5 text-sm font-medium text-text-secondary",
            active === r && "bg-surface-raised text-text-primary",
          )}
        >
          {r}d
        </Link>
      ))}
    </div>
  );
}
