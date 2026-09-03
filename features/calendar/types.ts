export type FocusContext =
  | "deep_work"
  | "study"
  | "planning"
  | "family"
  | "exercise"
  | "admin"
  | "other";

export interface CalendarEvent {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  location: string | null;
  notes: string | null;
}

export interface TimeBlock {
  id: string;
  title: string;
  taskId: string | null;
  taskTitle: string | null;
  projectId: string | null;
  projectName: string | null;
  startAt: string;
  endAt: string;
  focusContext: FocusContext | null;
}

export type CalendarItemKind = "time_block" | "event" | "due_date";

/** One rendering-layer shape for the grid — Time Blocks, Events, and task
 * due dates stay distinct rows in the database (blueprint §I.5); this is
 * only how the Calendar/Today UI draws them on one grid. */
export interface CalendarItem {
  id: string;
  kind: CalendarItemKind;
  sourceId: string;
  title: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  focusContext: FocusContext | null;
  projectName: string | null;
}
