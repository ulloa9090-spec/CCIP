"use client";

import { useState } from "react";
import { addHours, roundToNearestMinutes } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Task } from "@/features/tasks/types";
import type { Project } from "@/features/projects/types";
import { NewEventModal } from "./new-event-modal";
import { NewTimeBlockModal } from "./new-time-block-modal";

export function QuickCreateButtons({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  const [newEvent, setNewEvent] = useState(false);
  const [newBlock, setNewBlock] = useState(false);

  const start = roundToNearestMinutes(new Date(), { nearestTo: 30 });
  const end = addHours(start, 1);

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={() => setNewBlock(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Time Block
      </Button>
      <Button size="sm" onClick={() => setNewEvent(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Event
      </Button>

      <NewTimeBlockModal
        open={newBlock}
        onOpenChange={setNewBlock}
        tasks={tasks}
        projects={projects}
        startAt={start}
        endAt={end}
      />
      <NewEventModal open={newEvent} onOpenChange={setNewEvent} startAt={start} endAt={end} />
    </div>
  );
}
