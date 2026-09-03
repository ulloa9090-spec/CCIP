"use client";

import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useState } from "react";
import { KANBAN_COLUMNS } from "@/lib/validation/tasks";
import { updateTaskStatus } from "@/features/tasks/actions";
import type { Task, TaskStatus } from "@/features/tasks/types";
import { KanbanColumn } from "./kanban-column";

const COLUMN_STATUSES = new Set<string>(KANBAN_COLUMNS.map((c) => c.status));

export function KanbanBoard({ tasks: initialTasks }: { tasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const newStatus = String(over.id) as TaskStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    updateTaskStatus(taskId, newStatus);
  }

  const boardTasks = tasks.filter((t) => COLUMN_STATUSES.has(t.status));

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto p-6">
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.status}
            status={column.status}
            label={column.label}
            tasks={boardTasks.filter((t) => t.status === column.status)}
          />
        ))}
      </div>
    </DndContext>
  );
}
