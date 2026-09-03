import { format } from "date-fns";
import type { CalendarItem } from "@/features/calendar/types";
import { cn } from "@/lib/utils/cn";

const KIND_STYLES: Record<CalendarItem["kind"], string> = {
  time_block: "border-l-4 border-accent",
  event: "border-l-4 border-text-primary",
  due_date: "border-l-4 border-dashed border-text-secondary",
};

export function AgendaStrip({ items }: { items: CalendarItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-text-secondary">Nothing on the calendar today.</p>;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li
          key={item.id}
          className={cn(
            "flex items-center gap-2 rounded-(--radius-token-sm) bg-surface px-2 py-1.5 text-sm",
            KIND_STYLES[item.kind],
          )}
        >
          <span className="w-16 shrink-0 text-xs text-text-secondary">
            {item.allDay ? "All day" : format(new Date(item.startAt), "h:mm a")}
          </span>
          <span className="flex-1 text-text-primary">{item.title}</span>
          {item.projectName && <span className="text-xs text-text-secondary">{item.projectName}</span>}
        </li>
      ))}
    </ul>
  );
}
