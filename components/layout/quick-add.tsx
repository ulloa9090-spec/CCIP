"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { cn } from "@/lib/utils/cn";

type QuickAddType = "task" | "idea" | "note" | "project" | "goal" | "habit" | "event";

/**
 * Every type is wired into the UI now (command registry pattern) but none
 * can actually persist yet — none of their tables exist (Phase 3 §9: don't
 * build functionality whose domain doesn't exist). `phase` is shown as a
 * badge and drives the disabled submit button's caption; flipping a type to
 * "live" once its table lands is a one-line change here, not a rebuild.
 */
const types: {
  value: QuickAddType;
  label: string;
  placeholder: string;
  phase: number;
}[] = [
  { value: "task", label: "Task", placeholder: "What needs to get done?", phase: 5 },
  { value: "goal", label: "Goal", placeholder: "Goal title", phase: 4 },
  { value: "project", label: "Project", placeholder: "Project name", phase: 5 },
  { value: "event", label: "Event", placeholder: "Event title", phase: 6 },
  { value: "habit", label: "Habit", placeholder: "Habit name", phase: 7 },
  { value: "idea", label: "Idea", placeholder: "Capture the idea title", phase: 8 },
  { value: "note", label: "Note", placeholder: "Quick note", phase: 8 },
];

export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<QuickAddType>("task");
  const [title, setTitle] = useState("");
  const [showMore, setShowMore] = useState(false);

  function reset() {
    setTitle("");
    setShowMore(false);
  }

  const active = types.find((t) => t.value === type)!;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <ModalTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Quick Add
        </Button>
      </ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle className="text-sm font-semibold text-text-primary">Quick Add</ModalTitle>
        </ModalHeader>

        <TabsPrimitive.Root value={type} onValueChange={(v) => setType(v as QuickAddType)}>
          <TabsPrimitive.List
            aria-label="What are you adding?"
            className="mb-4 flex flex-wrap gap-1 rounded-(--radius-token-sm) bg-surface p-1"
          >
            {types.map((t) => (
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

          {types.map((t) => (
            <TabsPrimitive.Content key={t.value} value={t.value} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Input
                  autoFocus={type === t.value}
                  placeholder={t.placeholder}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1"
                />
                <Badge variant="neutral" className="shrink-0">
                  Phase {t.phase}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                className="self-start text-xs font-medium text-text-secondary hover:text-text-primary"
              >
                {showMore ? "Hide options" : "More options"}
              </button>
              {showMore && (
                <p className="text-xs text-text-secondary">
                  Additional fields (description, due date, project link, tags…) appear here once
                  the {t.label.toLowerCase()} data model is wired up in Phase {t.phase}.
                </p>
              )}
            </TabsPrimitive.Content>
          ))}
        </TabsPrimitive.Root>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-text-secondary">
            {active.label} capture arrives in Phase {active.phase}.
          </p>
          <Button size="sm" disabled title={`Available in Phase ${active.phase}`}>
            Add {active.label}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
