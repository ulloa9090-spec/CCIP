"use client";

import { Check } from "lucide-react";
import { toggleChallengeDay } from "@/features/challenges/actions";
import type { ChallengeDay } from "@/features/challenges/types";
import { cn } from "@/lib/utils/cn";

export function ChallengeDayGrid({ challengeId, days }: { challengeId: string; days: ChallengeDay[] }) {
  return (
    <div className="grid grid-cols-7 gap-2 sm:grid-cols-7">
      {days.map((day) => (
        <button
          key={day.id}
          type="button"
          onClick={() => toggleChallengeDay(challengeId, day.id, !day.completed)}
          aria-label={`${day.completed ? "Unmark" : "Mark"} day ${day.dayNumber} as done`}
          className={cn(
            "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-(--radius-token-sm) border text-xs font-medium",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            day.completed
              ? "border-success bg-success text-white"
              : "border-border text-text-secondary hover:bg-surface",
          )}
        >
          {day.completed ? <Check className="h-4 w-4" /> : <span>{day.dayNumber}</span>}
        </button>
      ))}
    </div>
  );
}
