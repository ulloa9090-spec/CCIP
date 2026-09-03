import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getTasks } from "@/features/tasks/queries";
import { getProjects } from "@/features/projects/queries";
import { getTodaySessions } from "@/features/focus/queries";
import { FocusTimer, SessionHistory } from "@/features/focus/components";

export default async function FocusPage() {
  const [tasks, projects, sessions] = await Promise.all([getTasks(), getProjects(), getTodaySessions()]);
  const totalMinutes = sessions.reduce((sum, s) => sum + s.actualMinutes, 0);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Focus"
        description={
          sessions.length > 0
            ? `${sessions.length} session${sessions.length === 1 ? "" : "s"} today · ${totalMinutes} min`
            : "Pick a duration and start a distraction-free block."
        }
      />

      <div className="flex flex-col gap-4 p-6">
        <Card>
          <CardContent className="pt-6">
            <FocusTimer tasks={tasks} projects={projects} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <SessionHistory sessions={sessions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
