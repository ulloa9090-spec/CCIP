"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { createGoal } from "@/features/goals/actions";
import type { LifeArea } from "@/features/goals/types";
import type { ActionResult } from "@/lib/types/action-result";
import { cn } from "@/lib/utils/cn";

type QuickAddType = "task" | "idea" | "note" | "project" | "goal" | "habit" | "event";

/**
 * Every type is wired into the UI (command registry pattern). Most still
 * can't persist — their tables don't exist yet (Phase 3 §9). `phase` drives
 * the disabled submit button's caption for those; a type is flipped to
 * "live" here the same phase its table lands (Goal went live in Phase 4).
 */
const types: {
  value: QuickAddType;
  label: string;
  placeholder: string;
  phase: number;
  live?: boolean;
}[] = [
  { value: "task", label: "Task", placeholder: "What needs to get done?", phase: 5 },
  { value: "goal", label: "Goal", placeholder: "Goal title", phase: 4, live: true },
  { value: "project", label: "Project", placeholder: "Project name", phase: 5 },
  { value: "event", label: "Event", placeholder: "Event title", phase: 6 },
  { value: "habit", label: "Habit", placeholder: "Habit name", phase: 7 },
  { value: "idea", label: "Idea", placeholder: "Capture the idea title", phase: 8 },
  { value: "note", label: "Note", placeholder: "Quick note", phase: 8 },
];

const initialState: ActionResult = {};

function GoalQuickAddForm({ lifeAreas }: { lifeAreas: LifeArea[] }) {
  const [state, formAction, pending] = useActionState(createGoal, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="timeframe" value="90day" />
      <input type="hidden" name="status" value="planned" />
      <Input name="title" placeholder="Goal title" autoFocus required />
      {state.fieldErrors?.title && <p className="text-xs text-danger">{state.fieldErrors.title}</p>}

      <Select name="areaId">
        <SelectTrigger>
          <SelectValue placeholder="Life Area" />
        </SelectTrigger>
        <SelectContent>
          {lifeAreas.map((area) => (
            <SelectItem key={area.id} value={area.id}>
              {area.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {state.fieldErrors?.areaId && <p className="text-xs text-danger">{state.fieldErrors.areaId}</p>}
      {state.error && <p className="text-xs text-danger">{state.error}</p>}

      <div className="mt-2 flex justify-end">
        <Button type="submit" size="sm" loading={pending}>
          Add Goal
        </Button>
      </div>
    </form>
  );
}

export function QuickAdd({ lifeAreas = [] }: { lifeAreas?: LifeArea[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<QuickAddType>("task");
  const [title, setTitle] = useState("");
  const [showMore, setShowMore] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  // Header persists across (app) route changes, so a successful live-type
  // submission (e.g. Goal's createGoal redirecting to /goals/[id]) would
  // otherwise leave the modal open over the new page. Close it whenever
  // navigation happens while it's open — adjusting state during render
  // (React's documented pattern for "reset on prop change"), not in an
  // effect, since a plain effect here would cause an extra render pass.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (open) setOpen(false);
  }

  function reset() {
    setTitle("");
    setShowMore(false);
    setType("task");
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

          <TabsPrimitive.Content value="goal">
            <GoalQuickAddForm lifeAreas={lifeAreas} />
          </TabsPrimitive.Content>

          {types
            .filter((t) => !t.live)
            .map((t) => (
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
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-text-secondary">
                    {t.label} capture arrives in Phase {t.phase}.
                  </p>
                  <Button size="sm" disabled title={`Available in Phase ${t.phase}`}>
                    Add {t.label}
                  </Button>
                </div>
              </TabsPrimitive.Content>
            ))}
        </TabsPrimitive.Root>
      </ModalContent>
    </Modal>
  );
}
