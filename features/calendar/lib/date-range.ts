import { addDays, addMonths, addWeeks, startOfDay, startOfMonth, startOfWeek } from "date-fns";

export type CalendarView = "day" | "week" | "month";

export interface ViewRange {
  view: CalendarView;
  /** The anchor date this view is centered/starts on. */
  anchor: Date;
  /** Inclusive-exclusive query range: items with start < end and end > start overlap it. */
  start: Date;
  end: Date;
  /** The days to render as columns (day: 1, week: 7) or cells (month: full 6-week grid). */
  days: Date[];
}

const WEEK_OPTS = { weekStartsOn: 1 as const }; // Monday — matches profiles.week_start_day default

export function parseViewParam(value: string | undefined): CalendarView {
  return value === "day" || value === "week" || value === "month" ? value : "week";
}

export function parseDateParam(value: string | undefined): Date {
  if (!value) return startOfDay(new Date());
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? startOfDay(new Date()) : parsed;
}

export function toDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getViewRange(view: CalendarView, anchor: Date): ViewRange {
  if (view === "day") {
    const start = startOfDay(anchor);
    return { view, anchor, start, end: addDays(start, 1), days: [start] };
  }

  if (view === "week") {
    const start = startOfWeek(anchor, WEEK_OPTS);
    const end = addDays(start, 7);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return { view, anchor, start, end, days };
  }

  // month: query range covers the full 6-week grid so leading/trailing days'
  // items still show, even though they belong to the adjacent month.
  const monthStart = startOfMonth(anchor);
  const start = startOfWeek(monthStart, WEEK_OPTS);
  const end = addDays(start, 42);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  return { view, anchor, start, end, days };
}

export function shiftAnchor(view: CalendarView, anchor: Date, direction: 1 | -1): Date {
  if (view === "day") return addDays(anchor, direction);
  if (view === "week") return addWeeks(anchor, direction);
  return addMonths(anchor, direction);
}
