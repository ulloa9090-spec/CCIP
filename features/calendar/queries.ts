import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent, CalendarItem, FocusContext, TimeBlock } from "./types";

export interface DateRange {
  start: Date;
  end: Date;
}

interface TimeBlockRow {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  focus_context: FocusContext | null;
  task_id: string | null;
  project_id: string | null;
  tasks: { title: string } | null;
  projects: { name: string } | null;
}

interface EventRow {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string | null;
  notes: string | null;
}

interface TaskDateRow {
  id: string;
  title: string;
  due_date: string | null;
  scheduled_date: string | null;
  projects: { name: string } | null;
}

function mapTimeBlockRow(row: TimeBlockRow): TimeBlock {
  return {
    id: row.id,
    title: row.title,
    taskId: row.task_id,
    taskTitle: row.tasks?.title ?? null,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    startAt: row.start_at,
    endAt: row.end_at,
    focusContext: row.focus_context,
  };
}

function mapEventRow(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: row.all_day,
    location: row.location,
    notes: row.notes,
  };
}

export async function getTimeBlocks({ start, end }: DateRange): Promise<TimeBlock[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_blocks")
    .select("id, title, start_at, end_at, focus_context, task_id, project_id, tasks ( title ), projects ( name )")
    .is("deleted_at", null)
    .lt("start_at", end.toISOString())
    .gt("end_at", start.toISOString());

  if (error) throw error;
  return ((data ?? []) as unknown as TimeBlockRow[]).map(mapTimeBlockRow);
}

export async function getEvents({ start, end }: DateRange): Promise<CalendarEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("id, title, start_at, end_at, all_day, location, notes")
    .is("deleted_at", null)
    .lt("start_at", end.toISOString())
    .gt("end_at", start.toISOString());

  if (error) throw error;
  return ((data ?? []) as unknown as EventRow[]).map(mapEventRow);
}

async function getTaskDateItems({ start, end }: DateRange): Promise<CalendarItem[]> {
  const supabase = await createClient();
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, due_date, scheduled_date, projects ( name )")
    .is("deleted_at", null)
    .or(
      `and(due_date.gte.${startDate},due_date.lt.${endDate}),and(scheduled_date.gte.${startDate},scheduled_date.lt.${endDate})`,
    );

  if (error) throw error;

  return ((data ?? []) as unknown as TaskDateRow[]).map((row) => {
    const date = row.scheduled_date ?? row.due_date!;
    return {
      id: `due_date:${row.id}`,
      kind: "due_date",
      sourceId: row.id,
      title: row.title,
      startAt: `${date}T00:00:00.000Z`,
      endAt: null,
      allDay: true,
      focusContext: null,
      projectName: row.projects?.name ?? null,
    };
  });
}

/** Merges time_blocks, calendar_events, and task due/scheduled dates into
 * one rendering-layer list for the Calendar grid and Today's agenda strip.
 * The three stay distinct rows in the database (blueprint §I.5) — this is
 * only the shape the UI draws from. A task with both a due_date and a
 * scheduled_date in range renders once, at whichever is more specific
 * (scheduled_date, falling back to due_date). */
export async function getCalendarItems(range: DateRange): Promise<CalendarItem[]> {
  const [blocks, events, taskItems] = await Promise.all([
    getTimeBlocks(range),
    getEvents(range),
    getTaskDateItems(range),
  ]);

  const blockItems: CalendarItem[] = blocks.map((b) => ({
    id: `time_block:${b.id}`,
    kind: "time_block",
    sourceId: b.id,
    title: b.title,
    startAt: b.startAt,
    endAt: b.endAt,
    allDay: false,
    focusContext: b.focusContext,
    projectName: b.projectName,
  }));

  const eventItems: CalendarItem[] = events.map((e) => ({
    id: `event:${e.id}`,
    kind: "event",
    sourceId: e.id,
    title: e.title,
    startAt: e.startAt,
    endAt: e.endAt,
    allDay: e.allDay,
    focusContext: null,
    projectName: null,
  }));

  return [...blockItems, ...eventItems, ...taskItems].sort((a, b) => a.startAt.localeCompare(b.startAt));
}
