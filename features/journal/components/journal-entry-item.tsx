import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { JournalCategory, JournalEntry } from "@/features/journal/types";

const CATEGORY_VARIANT: Record<JournalCategory, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  daily_reflection: "neutral",
  learning: "accent",
  win: "success",
  problem: "danger",
  observation: "warning",
  free_note: "neutral",
};

const CATEGORY_LABELS: Record<JournalCategory, string> = {
  daily_reflection: "Daily Reflection",
  learning: "Learning",
  win: "Win",
  problem: "Problem",
  observation: "Observation",
  free_note: "Free Note",
};

export function JournalEntryItem({ entry }: { entry: JournalEntry }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={CATEGORY_VARIANT[entry.category]}>{CATEGORY_LABELS[entry.category]}</Badge>
          <span className="text-xs text-text-secondary">{format(new Date(entry.createdAt), "MMM d, h:mm a")}</span>
        </div>
        <p className="whitespace-pre-wrap text-sm text-text-primary">{entry.body}</p>
        {(entry.goalTitle || entry.projectName || entry.taskTitle || entry.decisionTitle) && (
          <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
            {entry.goalId && entry.goalTitle && (
              <Link href={`/goals/${entry.goalId}`} className="hover:text-accent hover:underline">
                Goal: {entry.goalTitle}
              </Link>
            )}
            {entry.projectId && entry.projectName && (
              <Link href={`/projects/${entry.projectId}`} className="hover:text-accent hover:underline">
                Project: {entry.projectName}
              </Link>
            )}
            {entry.taskTitle && <span>Task: {entry.taskTitle}</span>}
            {entry.decisionId && entry.decisionTitle && (
              <Link href={`/journal/decisions/${entry.decisionId}`} className="hover:text-accent hover:underline">
                Decision: {entry.decisionTitle}
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
