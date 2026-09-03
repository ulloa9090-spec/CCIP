"use client";

import { Check } from "lucide-react";
import { format, isToday } from "date-fns";
import { toggleHabitLog } from "@/features/habits/actions";
import { isHabitDueOn, toDateStr } from "@/features/habits/progress";
import type { Habit } from "@/features/habits/types";
import { cn } from "@/lib/utils/cn";

export function WeekGrid({
  habits,
  weekDays,
  doneDatesByHabit,
  streaks,
  consistency,
  today,
}: {
  habits: Habit[];
  weekDays: Date[];
  doneDatesByHabit: Record<string, string[]>;
  streaks: Record<string, number>;
  consistency: Record<string, number | null>;
  today: Date;
}) {
  const todayStr = toDateStr(today);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left text-xs font-medium text-text-secondary">Habit</th>
            {weekDays.map((d) => (
              <th
                key={d.toISOString()}
                className={cn("p-2 text-center text-xs font-medium text-text-secondary", isToday(d) && "text-accent")}
              >
                {format(d, "EEE d")}
              </th>
            ))}
            <th className="p-2 text-center text-xs font-medium text-text-secondary">Streak</th>
            <th className="p-2 text-center text-xs font-medium text-text-secondary">7d</th>
          </tr>
        </thead>
        <tbody>
          {habits.map((habit) => {
            const doneDates = new Set(doneDatesByHabit[habit.id] ?? []);
            return (
              <tr key={habit.id} className="border-t border-border">
                <td className="p-2 font-medium text-text-primary">{habit.name}</td>
                {weekDays.map((d) => {
                  const dateStr = toDateStr(d);
                  const due = isHabitDueOn(habit, d);
                  const done = doneDates.has(dateStr);
                  const future = dateStr > todayStr;
                  return (
                    <td key={dateStr} className="p-1 text-center">
                      {due && !future ? (
                        <button
                          type="button"
                          onClick={() => toggleHabitLog(habit.id, dateStr, !done)}
                          aria-label={`${done ? "Unmark" : "Mark"} ${habit.name} for ${format(d, "EEEE, MMMM d")}`}
                          className={cn(
                            "mx-auto flex h-6 w-6 items-center justify-center rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                            done ? "border-success bg-success text-white" : "border-border hover:bg-surface",
                          )}
                        >
                          {done && <Check className="h-3.5 w-3.5" />}
                        </button>
                      ) : due && future ? (
                        <span
                          className="mx-auto flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-border/60 text-text-secondary/40"
                          aria-hidden="true"
                        >
                          ·
                        </span>
                      ) : (
                        <span className="block text-text-secondary/40" aria-hidden="true">
                          –
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="p-2 text-center text-text-secondary">{streaks[habit.id] ?? 0}</td>
                <td className="p-2 text-center text-text-secondary">
                  {consistency[habit.id] == null ? "–" : `${consistency[habit.id]}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
