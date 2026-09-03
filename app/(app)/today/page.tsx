import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getTodayScreenData } from "@/features/today/queries";
import { AgendaStrip, MostImportantTaskCard, OverdueAndCritical, QuickCapture } from "@/features/today/components";
import { TaskListItem } from "@/features/tasks/components";

function formatToday() {
  return new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export default async function TodayPage() {
  const { mostImportantTask, topThree, agenda, overdueAndCritical } = await getTodayScreenData();
  const tasksLeft = [mostImportantTask, ...topThree].filter((t) => t && t.status !== "done").length;

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Today"
        description={`${formatToday()} — ${tasksLeft} task${tasksLeft === 1 ? "" : "s"} left today`}
      />

      <div className="flex flex-1 flex-col gap-4 p-6">
        <MostImportantTaskCard task={mostImportantTask} />

        <Card>
          <CardHeader>
            <CardTitle>Top 3</CardTitle>
          </CardHeader>
          <CardContent>
            {topThree.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Nothing else lined up — capture something below or pull from your Tasks board.
              </p>
            ) : (
              <div className="flex flex-col">
                {topThree.map((t) => (
                  <TaskListItem key={t.id} task={t} allowMit />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4" />
              Today&apos;s Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AgendaStrip items={agenda} />
          </CardContent>
        </Card>

        <OverdueAndCritical tasks={overdueAndCritical} />
      </div>

      <QuickCapture />
    </div>
  );
}
