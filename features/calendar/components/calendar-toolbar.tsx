import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { shiftAnchor, toDateParam, type ViewRange } from "@/features/calendar/lib/date-range";

const VIEWS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
] as const;

function rangeTitle(range: ViewRange): string {
  if (range.view === "day") return format(range.anchor, "EEEE, MMMM d");
  if (range.view === "month") return format(range.anchor, "MMMM yyyy");
  const last = range.days[range.days.length - 1];
  const sameMonth = range.days[0].getMonth() === last.getMonth();
  return sameMonth
    ? `${format(range.days[0], "MMM d")} – ${format(last, "d, yyyy")}`
    : `${format(range.days[0], "MMM d")} – ${format(last, "MMM d, yyyy")}`;
}

function viewHref(view: string, date: Date) {
  return `/calendar?view=${view}&date=${toDateParam(date)}`;
}

export function CalendarToolbar({ range }: { range: ViewRange }) {
  const prev = shiftAnchor(range.view, range.anchor, -1);
  const next = shiftAnchor(range.view, range.anchor, 1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" asChild>
          <Link href={viewHref(range.view, new Date())}>Today</Link>
        </Button>
        <Button variant="ghost" size="icon" asChild aria-label="Previous">
          <Link href={viewHref(range.view, prev)}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" asChild aria-label="Next">
          <Link href={viewHref(range.view, next)}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-sm font-semibold text-text-primary">{rangeTitle(range)}</h2>
      </div>

      <div className="flex gap-1 rounded-(--radius-token-sm) bg-surface p-1">
        {VIEWS.map((v) => (
          <Link
            key={v.value}
            href={viewHref(v.value, range.anchor)}
            className={cn(
              "rounded-(--radius-token-sm) px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors",
              range.view === v.value && "bg-surface-raised text-text-primary",
            )}
          >
            {v.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
