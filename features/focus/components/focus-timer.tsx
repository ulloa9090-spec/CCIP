"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { FOCUS_DURATION_PRESETS } from "@/lib/validation/focus";
import { logFocusSession } from "@/features/focus/actions";
import type { Task } from "@/features/tasks/types";
import type { Project } from "@/features/projects/types";

type TimerStatus = "idle" | "running" | "paused" | "review";

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusTimer({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [plannedMinutes, setPlannedMinutes] = useState(25);
  const [customMinutes, setCustomMinutes] = useState("");
  const [taskId, setTaskId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [context, setContext] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const startedAtRef = useRef<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function handleStart() {
    startedAtRef.current = new Date();
    setElapsedSeconds(0);
    setStatus("running");
    intervalRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
  }

  function handlePause() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus("paused");
  }

  function handleResume() {
    setStatus("running");
    intervalRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
  }

  function handleFinish() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus("review");
  }

  async function handleSave() {
    setSaving(true);
    await logFocusSession({
      taskId: taskId || null,
      projectId: projectId || null,
      context: context || null,
      plannedMinutes,
      actualMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
      startedAt: (startedAtRef.current ?? new Date()).toISOString(),
      note: note || null,
    });
    setSaving(false);
    reset();
  }

  function reset() {
    setStatus("idle");
    setElapsedSeconds(0);
    setNote("");
    startedAtRef.current = null;
  }

  if (status === "review") {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <p className="text-sm text-text-secondary">Session complete</p>
        <p className="text-4xl font-semibold tabular-nums text-text-primary">{formatClock(elapsedSeconds)}</p>
        <div className="w-full max-w-sm">
          <Textarea
            placeholder="Quick note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            Discard
          </button>
          <Button onClick={handleSave} loading={saving}>
            Save Session
          </Button>
        </div>
      </div>
    );
  }

  if (status === "running" || status === "paused") {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <p className="text-6xl font-semibold tabular-nums text-text-primary">{formatClock(elapsedSeconds)}</p>
        {context && <p className="text-sm text-text-secondary">{context}</p>}
        <div className="flex gap-2">
          {status === "running" ? (
            <Button variant="secondary" onClick={handlePause} className="gap-1.5">
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleResume} className="gap-1.5">
              <Play className="h-4 w-4" />
              Resume
            </Button>
          )}
          <Button variant="destructive" onClick={handleFinish} className="gap-1.5">
            <Square className="h-4 w-4" />
            Finish
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-wrap justify-center gap-2">
        {FOCUS_DURATION_PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setPlannedMinutes(m);
              setCustomMinutes("");
            }}
            className={cn(
              "rounded-(--radius-token-sm) border px-3 py-1.5 text-sm font-medium",
              plannedMinutes === m && !customMinutes
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-text-secondary hover:bg-surface",
            )}
          >
            {m}m
          </button>
        ))}
        <Input
          type="number"
          min={1}
          max={480}
          placeholder="Custom"
          value={customMinutes}
          onChange={(e) => {
            setCustomMinutes(e.target.value);
            const n = Number(e.target.value);
            if (n > 0) setPlannedMinutes(n);
          }}
          className="w-24"
        />
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <Select value={taskId} onValueChange={setTaskId}>
          <SelectTrigger>
            <SelectValue placeholder="Link a task (optional)" />
          </SelectTrigger>
          <SelectContent>
            {tasks.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Link a project (optional)" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Context (e.g. Deep Work)" value={context} onChange={(e) => setContext(e.target.value)} />
      </div>

      <Button size="lg" onClick={handleStart} className="mx-auto gap-1.5">
        <Play className="h-4 w-4" />
        Start Focus
      </Button>
    </div>
  );
}
