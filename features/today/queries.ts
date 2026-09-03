import "server-only";
import { getOverdueAndCriticalTasks, getTodayTasks } from "@/features/tasks/queries";
import { getCalendarItems } from "@/features/calendar/queries";
import type { Task } from "@/features/tasks/types";
import type { CalendarItem } from "@/features/calendar/types";

export interface TodayScreenData {
  mostImportantTask: Task | null;
  topThree: Task[];
  agenda: CalendarItem[];
  overdueAndCritical: Task[];
}

/** Composes the Today screen (blueprint §F) purely from Phase 5/6 data —
 * no new table of its own. Habits ("due today" checklist) are deliberately
 * left out until Phase 7 rather than shown as a non-functional section. */
export async function getTodayScreenData(): Promise<TodayScreenData> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfNextDay = new Date(startOfDay);
  startOfNextDay.setDate(startOfNextDay.getDate() + 1);

  const [todayTasks, agenda, overdueAndCritical] = await Promise.all([
    getTodayTasks(),
    getCalendarItems({ start: startOfDay, end: startOfNextDay }),
    getOverdueAndCriticalTasks(),
  ]);

  const mostImportantTask = todayTasks.find((t) => t.isMit) ?? null;
  const topThree = todayTasks.filter((t) => t.id !== mostImportantTask?.id).slice(0, 3);
  const overdueAndCriticalFiltered = overdueAndCritical.filter(
    (t) => t.id !== mostImportantTask?.id && !topThree.some((top) => top.id === t.id),
  );

  return { mostImportantTask, topThree, agenda, overdueAndCritical: overdueAndCriticalFiltered };
}
