"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { useState } from "react";
import type { Habit } from "@/features/habits/types";
import { cn } from "@/lib/utils/cn";
import { WeekGrid } from "./week-grid";
import { Heatmap } from "./heatmap";

export function HabitsView({
  habits,
  weekDays,
  heatmapDays,
  doneDatesByHabit,
  streaks,
  consistency,
  today,
}: {
  habits: Habit[];
  weekDays: Date[];
  heatmapDays: Date[];
  doneDatesByHabit: Record<string, string[]>;
  streaks: Record<string, number>;
  consistency: Record<string, number | null>;
  today: Date;
}) {
  const [view, setView] = useState<"week" | "heatmap">("week");

  return (
    <TabsPrimitive.Root value={view} onValueChange={(v) => setView(v as typeof view)}>
      <TabsPrimitive.List className="mb-3 flex gap-1 rounded-(--radius-token-sm) bg-surface p-1">
        {[
          { value: "week", label: "This Week" },
          { value: "heatmap", label: "30-Day Heatmap" },
        ].map((t) => (
          <TabsPrimitive.Trigger
            key={t.value}
            value={t.value}
            className={cn(
              "rounded-(--radius-token-sm) px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors",
              "data-[state=active]:bg-surface-raised data-[state=active]:text-text-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            )}
          >
            {t.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      <TabsPrimitive.Content value="week">
        <WeekGrid
          habits={habits}
          weekDays={weekDays}
          doneDatesByHabit={doneDatesByHabit}
          streaks={streaks}
          consistency={consistency}
          today={today}
        />
      </TabsPrimitive.Content>
      <TabsPrimitive.Content value="heatmap">
        <Heatmap habits={habits} days={heatmapDays} doneDatesByHabit={doneDatesByHabit} />
      </TabsPrimitive.Content>
    </TabsPrimitive.Root>
  );
}
