import { format } from "date-fns";
import type { FocusSession } from "@/features/focus/types";

export function SessionHistory({ sessions }: { sessions: FocusSession[] }) {
  if (sessions.length === 0) {
    return <p className="text-sm text-text-secondary">No sessions logged today.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {sessions.map((s) => (
        <li
          key={s.id}
          className="flex items-center justify-between gap-2 rounded-(--radius-token-sm) bg-surface px-3 py-2 text-sm"
        >
          <div className="flex flex-col">
            <span className="text-text-primary">
              {s.context || s.taskTitle || s.projectName || "Focus session"}
            </span>
            <span className="text-xs text-text-secondary">{format(new Date(s.startedAt), "h:mm a")}</span>
          </div>
          <span className="shrink-0 text-xs font-medium text-text-secondary">{s.actualMinutes} min</span>
        </li>
      ))}
    </ul>
  );
}
