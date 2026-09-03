"use client";

import { useState } from "react";
import { addMinutes, differenceInMinutes, format, isSameDay, isToday } from "date-fns";
import type { CalendarEvent, CalendarItem, TimeBlock } from "@/features/calendar/types";
import type { Task } from "@/features/tasks/types";
import type { Project } from "@/features/projects/types";
import { cn } from "@/lib/utils/cn";
import { NewTimeBlockModal } from "./new-time-block-modal";
import { EditTimeBlockModal } from "./edit-time-block-modal";
import { EditEventModal } from "./edit-event-modal";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ROW_HEIGHT = 48; // px per hour

const KIND_STYLE: Record<CalendarItem["kind"], string> = {
  time_block: "bg-accent/20 border-accent text-accent",
  event: "bg-text-primary/10 border-text-primary text-text-primary",
  due_date: "bg-surface border-dashed border-text-secondary text-text-secondary",
};

interface Slot {
  start: Date;
  end: Date;
}

export function TimeGrid({
  days,
  items,
  timeBlocks,
  events,
  tasks,
  projects,
}: {
  days: Date[];
  items: CalendarItem[];
  timeBlocks: TimeBlock[];
  events: CalendarEvent[];
  tasks: Task[];
  projects: Project[];
}) {
  const [newSlot, setNewSlot] = useState<Slot | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const editingBlock = timeBlocks.find((b) => b.id === editingBlockId) ?? null;
  const editingEvent = events.find((e) => e.id === editingEventId) ?? null;

  function openItem(item: CalendarItem) {
    if (item.kind === "time_block") setEditingBlockId(item.sourceId);
    else if (item.kind === "event") setEditingEventId(item.sourceId);
  }

  return (
    <div className="flex overflow-x-auto">
      <div className="flex flex-col pt-6 text-xs text-text-secondary">
        {HOURS.map((h) => (
          <div key={h} style={{ height: ROW_HEIGHT }} className="flex items-start justify-end pr-2">
            {h === 0 ? "" : format(new Date(2000, 0, 1, h), "h a")}
          </div>
        ))}
      </div>

      <div
        className={cn("grid flex-1", days.length > 1 && "divide-x divide-border")}
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(140px, 1fr))` }}
      >
        {days.map((day) => {
          const dayItems = items.filter((item) => !item.allDay && isSameDay(new Date(item.startAt), day));
          const allDayItems = items.filter((item) => item.allDay && isSameDay(new Date(item.startAt), day));

          return (
            <div key={day.toISOString()} className="flex flex-col">
              <div
                className={cn(
                  "flex h-6 items-center justify-center border-b border-border text-xs font-medium",
                  isToday(day) && "text-accent",
                )}
              >
                {format(day, "EEE d")}
              </div>

              {allDayItems.length > 0 && (
                <div className="flex flex-col gap-0.5 border-b border-border p-1">
                  {allDayItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openItem(item)}
                      disabled={item.kind === "due_date"}
                      className={cn(
                        "truncate rounded-(--radius-token-sm) border px-1.5 py-0.5 text-left text-xs disabled:cursor-default",
                        KIND_STYLE[item.kind],
                      )}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative" style={{ height: ROW_HEIGHT * 24 }}>
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h);
                      setNewSlot({ start, end: addMinutes(start, 60) });
                    }}
                    className="absolute inset-x-0 border-t border-border/60 hover:bg-surface"
                    style={{ top: h * ROW_HEIGHT, height: ROW_HEIGHT }}
                    aria-label={`Create a time block at ${format(new Date(day.getFullYear(), day.getMonth(), day.getDate(), h), "h a")} on ${format(day, "EEEE, MMMM d")}`}
                  />
                ))}
                {dayItems.map((item) => {
                  const start = new Date(item.startAt);
                  const end = item.endAt ? new Date(item.endAt) : addMinutes(start, 30);
                  const top = ((start.getHours() * 60 + start.getMinutes()) / 60) * ROW_HEIGHT;
                  const height = Math.max((differenceInMinutes(end, start) / 60) * ROW_HEIGHT, 20);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openItem(item)}
                      className={cn(
                        "absolute inset-x-1 overflow-hidden rounded-(--radius-token-sm) border px-1.5 py-0.5 text-left text-xs",
                        KIND_STYLE[item.kind],
                      )}
                      style={{ top, height }}
                    >
                      <span className="block truncate font-medium">{item.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <NewTimeBlockModal
        open={newSlot !== null}
        onOpenChange={(open) => !open && setNewSlot(null)}
        tasks={tasks}
        projects={projects}
        startAt={newSlot?.start ?? new Date()}
        endAt={newSlot?.end ?? addMinutes(new Date(), 60)}
      />
      <EditTimeBlockModal
        open={editingBlock !== null}
        onOpenChange={(open) => !open && setEditingBlockId(null)}
        block={editingBlock}
        tasks={tasks}
        projects={projects}
      />
      <EditEventModal
        open={editingEvent !== null}
        onOpenChange={(open) => !open && setEditingEventId(null)}
        event={editingEvent}
      />
    </div>
  );
}
