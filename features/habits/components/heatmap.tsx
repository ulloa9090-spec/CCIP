import { format } from "date-fns";
import { isHabitDueOn, toDateStr } from "@/features/habits/progress";
import type { Habit } from "@/features/habits/types";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_DOT_CLASSES, pickCategoryColor } from "@/lib/design/category-colors";

export function Heatmap({
  habits,
  days,
  doneDatesByHabit,
}: {
  habits: Habit[];
  days: Date[];
  doneDatesByHabit: Record<string, string[]>;
}) {
  return (
    <div className="flex flex-col gap-3 overflow-x-auto">
      {habits.map((habit) => {
        const doneDates = new Set(doneDatesByHabit[habit.id] ?? []);
        return (
          <div key={habit.id} className="flex items-center gap-3">
            <span className="flex w-32 shrink-0 items-center gap-2 truncate text-sm font-medium text-text-primary">
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  CATEGORY_DOT_CLASSES[pickCategoryColor(habit.id)],
                )}
                aria-hidden="true"
              />
              <span className="truncate">{habit.name}</span>
            </span>
            <div className="flex gap-0.5">
              {days.map((d) => {
                const dateStr = toDateStr(d);
                const due = isHabitDueOn(habit, d);
                const done = doneDates.has(dateStr);
                return (
                  <span
                    key={dateStr}
                    title={`${format(d, "MMM d")}: ${due ? (done ? "done" : "missed") : "not required"}`}
                    className={cn(
                      "h-3.5 w-3.5 rounded-(--radius-token-sm)",
                      !due && "bg-surface",
                      due && done && "bg-success",
                      due && !done && "bg-danger/30",
                    )}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
