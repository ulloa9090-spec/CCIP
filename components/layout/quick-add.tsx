"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { cn } from "@/lib/utils/cn";

type QuickAddType = "task" | "idea" | "note" | "project" | "goal" | "habit" | "event";

const types: { value: QuickAddType; label: string; placeholder: string }[] = [
  { value: "task", label: "Task", placeholder: "What needs to get done?" },
  { value: "idea", label: "Idea", placeholder: "Capture the idea title" },
  { value: "note", label: "Note", placeholder: "Quick note" },
  { value: "project", label: "Project", placeholder: "Project name" },
  { value: "goal", label: "Goal", placeholder: "Goal title" },
  { value: "habit", label: "Habit", placeholder: "Habit name" },
  { value: "event", label: "Event", placeholder: "Event title" },
];

export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<QuickAddType>("task");
  const [title, setTitle] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function reset() {
    setTitle("");
    setShowMore(false);
    setSubmitted(false);
  }

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
              <Input
                autoFocus={type === t.value}
                placeholder={t.placeholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
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
                  the {t.label.toLowerCase()} data model is wired up in a later phase.
                </p>
              )}
            </TabsPrimitive.Content>
          ))}
        </TabsPrimitive.Root>

        <div className="mt-5 flex items-center justify-between gap-3">
          {submitted ? (
            <p className="text-xs text-warning">
              Capture isn&apos;t persisted yet — Quick Add saves once accounts &amp; the database
              are connected (Phase 2).
            </p>
          ) : (
            <span />
          )}
          <Button
            size="sm"
            disabled={!title.trim()}
            onClick={() => setSubmitted(true)}
          >
            Add {types.find((t) => t.value === type)?.label}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
