import Link from "next/link";
import { format, isSameDay, isSameMonth, isToday } from "date-fns";
import type { CalendarItem } from "@/features/calendar/types";
import { toDateParam } from "@/features/calendar/lib/date-range";
import { cn } from "@/lib/utils/cn";

const KIND_DOT: Record<CalendarItem["kind"], string> = {
  time_block: "bg-accent",
  event: "bg-text-primary",
  due_date: "bg-text-secondary",
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;

export function MonthGrid({
  days,
  items,
  monthAnchor,
}: {
  days: Date[];
  items: CalendarItem[];
  monthAnchor: Date;
}) {
  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-(--radius-token-md) border border-border bg-border">
      {WEEKDAY_LABELS.map((label) => (
        <div key={label} className="bg-surface px-2 py-1.5 text-center text-xs font-medium text-text-secondary">
          {label}
        </div>
      ))}
      {days.map((day) => {
        const dayItems = items.filter((item) => isSameDay(new Date(item.startAt), day));
        const inMonth = isSameMonth(day, monthAnchor);
        return (
          <Link
            key={day.toISOString()}
            href={`/calendar?view=day&date=${toDateParam(day)}`}
            className={cn(
              "flex min-h-24 flex-col gap-1 bg-background p-1.5 text-left hover:bg-surface",
              !inMonth && "bg-surface/50 text-text-secondary",
            )}
          >
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                isToday(day) && "bg-accent font-semibold text-accent-foreground",
              )}
            >
              {format(day, "d")}
            </span>
            <div className="flex flex-col gap-0.5">
              {dayItems.slice(0, MAX_CHIPS).map((item) => (
                <span key={item.id} className="flex items-center gap-1 truncate text-xs text-text-secondary">
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", KIND_DOT[item.kind])} aria-hidden="true" />
                  <span className="truncate">{item.title}</span>
                </span>
              ))}
              {dayItems.length > MAX_CHIPS && (
                <span className="text-xs text-text-secondary">+{dayItems.length - MAX_CHIPS} more</span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
