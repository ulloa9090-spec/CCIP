import Link from "next/link";
import { JOURNAL_CATEGORIES } from "@/lib/validation/journal";
import type { JournalCategory } from "@/features/journal/types";
import { cn } from "@/lib/utils/cn";

const CATEGORY_LABELS: Record<JournalCategory, string> = {
  daily_reflection: "Daily Reflection",
  learning: "Learning",
  win: "Win",
  problem: "Problem",
  observation: "Observation",
  free_note: "Free Note",
};

export function CategoryFilter({ active }: { active?: JournalCategory }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-(--radius-token-sm) bg-surface p-1">
      <Link
        href="/journal"
        className={cn(
          "rounded-(--radius-token-sm) px-2.5 py-1 text-xs font-medium text-text-secondary",
          !active && "bg-surface-raised text-text-primary",
        )}
      >
        All
      </Link>
      {JOURNAL_CATEGORIES.map((c) => (
        <Link
          key={c}
          href={`/journal?category=${c}`}
          className={cn(
            "rounded-(--radius-token-sm) px-2.5 py-1 text-xs font-medium text-text-secondary",
            active === c && "bg-surface-raised text-text-primary",
          )}
        >
          {CATEGORY_LABELS[c]}
        </Link>
      ))}
    </div>
  );
}
