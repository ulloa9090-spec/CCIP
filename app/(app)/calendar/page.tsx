import { PageHeader } from "@/components/layout/page-header";
import { getCalendarItems, getEvents, getTimeBlocks } from "@/features/calendar/queries";
import { getViewRange, parseDateParam, parseViewParam } from "@/features/calendar/lib/date-range";
import { CalendarToolbar, MonthGrid, QuickCreateButtons, TimeGrid } from "@/features/calendar/components";
import { getTasks } from "@/features/tasks/queries";
import { getProjects } from "@/features/projects/queries";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const params = await searchParams;
  const view = parseViewParam(params.view);
  const anchor = parseDateParam(params.date);
  const range = getViewRange(view, anchor);

  const [items, timeBlocks, events, tasks, projects] = await Promise.all([
    getCalendarItems(range),
    getTimeBlocks(range),
    getEvents(range),
    getTasks(),
    getProjects(),
  ]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Calendar"
        description="Time Blocks, Calendar Events, and task due dates on one grid."
        action={<QuickCreateButtons tasks={tasks} projects={projects} />}
      />

      <CalendarToolbar range={range} />

      <div className="flex-1 p-6">
        {view === "month" ? (
          <MonthGrid days={range.days} items={items} monthAnchor={range.anchor} />
        ) : (
          <TimeGrid
            days={range.days}
            items={items}
            timeBlocks={timeBlocks}
            events={events}
            tasks={tasks}
            projects={projects}
          />
        )}
      </div>
    </div>
  );
}
