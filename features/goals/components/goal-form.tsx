"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActionResult } from "@/lib/types/action-result";
import { GOAL_STATUSES, GOAL_TIMEFRAMES } from "@/lib/validation/goals";
import type { Goal, LifeArea } from "@/features/goals/types";

const initialState: ActionResult = {};

const TIMEFRAME_LABELS: Record<(typeof GOAL_TIMEFRAMES)[number], string> = {
  lifetime: "Lifetime",
  "5yr": "5 Year",
  "3yr": "3 Year",
  "1yr": "1 Year",
  "90day": "90 Day",
  monthly: "Monthly",
};

const STATUS_LABELS: Record<(typeof GOAL_STATUSES)[number], string> = {
  planned: "Planned",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function GoalForm({
  action,
  lifeAreas,
  cycles,
  initialValues,
  submitLabel,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  lifeAreas: LifeArea[];
  cycles: { id: string; name: string }[];
  initialValues?: Partial<Goal> & { metricName?: string; startingValue?: number | null; targetValue?: number | null; currentValue?: number | null; unit?: string | null };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [showMetric, setShowMetric] = useState(Boolean(initialValues?.metric?.metricName ?? initialValues?.metricName));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium text-text-primary">
          Title
        </label>
        <Input id="title" name="title" defaultValue={initialValues?.title} required />
        {state.fieldErrors?.title && <p className="text-xs text-danger">{state.fieldErrors.title}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-text-primary">
          Description
        </label>
        <Textarea id="description" name="description" defaultValue={initialValues?.description ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="areaId" className="text-sm font-medium text-text-primary">
            Life Area
          </label>
          <Select name="areaId" defaultValue={initialValues?.areaId}>
            <SelectTrigger id="areaId">
              <SelectValue placeholder="Choose an area" />
            </SelectTrigger>
            <SelectContent>
              {lifeAreas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.fieldErrors?.areaId && (
            <p className="text-xs text-danger">{state.fieldErrors.areaId}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="timeframe" className="text-sm font-medium text-text-primary">
            Timeframe
          </label>
          <Select name="timeframe" defaultValue={initialValues?.timeframe ?? "90day"}>
            <SelectTrigger id="timeframe">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOAL_TIMEFRAMES.map((tf) => (
                <SelectItem key={tf} value={tf}>
                  {TIMEFRAME_LABELS[tf]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-sm font-medium text-text-primary">
            Status
          </label>
          <Select name="status" defaultValue={initialValues?.status ?? "planned"}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOAL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="targetDate" className="text-sm font-medium text-text-primary">
            Target date
          </label>
          <Input id="targetDate" name="targetDate" type="date" defaultValue={initialValues?.targetDate ?? ""} />
        </div>
      </div>

      {cycles.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quarterCycleId" className="text-sm font-medium text-text-primary">
            90-Day Cycle (optional)
          </label>
          <Select name="quarterCycleId" defaultValue={initialValues?.quarterCycleId ?? undefined}>
            <SelectTrigger id="quarterCycleId">
              <SelectValue placeholder="Not linked to a cycle" />
            </SelectTrigger>
            <SelectContent>
              {cycles.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowMetric((v) => !v)}
        className="self-start text-xs font-medium text-text-secondary hover:text-text-primary"
      >
        {showMetric ? "Hide metric" : "Add a metric (optional)"}
      </button>

      {showMetric && (
        <div className="flex flex-col gap-3 rounded-(--radius-token-sm) border border-border p-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="metricName" className="text-sm font-medium text-text-primary">
              Metric name
            </label>
            <Input
              id="metricName"
              name="metricName"
              placeholder="e.g. Monthly revenue"
              defaultValue={initialValues?.metric?.metricName ?? initialValues?.metricName ?? ""}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="startingValue" className="text-xs text-text-secondary">
                Starting
              </label>
              <Input
                id="startingValue"
                name="startingValue"
                type="number"
                step="any"
                defaultValue={initialValues?.metric?.startingValue ?? initialValues?.startingValue ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="currentValue" className="text-xs text-text-secondary">
                Current
              </label>
              <Input
                id="currentValue"
                name="currentValue"
                type="number"
                step="any"
                defaultValue={initialValues?.metric?.currentValue ?? initialValues?.currentValue ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="targetValue" className="text-xs text-text-secondary">
                Target
              </label>
              <Input
                id="targetValue"
                name="targetValue"
                type="number"
                step="any"
                defaultValue={initialValues?.metric?.targetValue ?? initialValues?.targetValue ?? ""}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="unit" className="text-xs text-text-secondary">
              Unit (optional)
            </label>
            <Input
              id="unit"
              name="unit"
              placeholder="e.g. $, %, hours"
              defaultValue={initialValues?.metric?.unit ?? initialValues?.unit ?? ""}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium text-text-primary">
          Notes
        </label>
        <Textarea id="notes" name="notes" defaultValue={initialValues?.notes ?? ""} />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.message && <p className="text-sm text-success">{state.message}</p>}

      <Button type="submit" loading={pending} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
