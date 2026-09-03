import { notFound } from "next/navigation";
import { Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { PageHeader } from "@/components/layout/page-header";
import { getProjectById } from "@/features/projects/queries";
import { getGoals } from "@/features/goals/queries";
import { getTasks } from "@/features/tasks/queries";
import { computeProjectProgress } from "@/features/projects/progress";
import { archiveProject, updateProject } from "@/features/projects/actions";
import {
  MilestoneList,
  PrimaryProjectControl,
  ProjectForm,
  ProjectStatusBadge,
} from "@/features/projects/components";
import { TaskListItem } from "@/features/tasks/components";
import { startPlanningAssistant } from "@/features/ai/actions";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, goals, tasks] = await Promise.all([
    getProjectById(id),
    getGoals(),
    getTasks({ projectId: id }),
  ]);

  if (!project) notFound();

  const progress = computeProjectProgress(project);
  const boundUpdate = updateProject.bind(null, project.id);
  const boundArchive = archiveProject.bind(null, project.id);

  return (
    <div className="flex flex-col">
      <PageHeader
        title={project.name}
        description={project.goalTitle ? `Goal: ${project.goalTitle}` : undefined}
        action={
          <div className="flex items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            <PrimaryProjectControl projectId={project.id} isPrimaryActive={project.isPrimaryActive} />
          </div>
        }
      />

      <div className="grid gap-4 p-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <ProgressRing value={progress} label={`${project.name} progress`} />
            <p className="text-xs text-text-secondary">
              {project.taskStats.done} / {project.taskStats.total} tasks ·{" "}
              {project.milestones.filter((m) => m.status === "done").length} /{" "}
              {project.milestones.length} milestones
            </p>
            <form action={startPlanningAssistant.bind(null, "project", project.id)}>
              <Button type="submit" size="sm" variant="secondary" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Ask AI to Break This Down
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Edit Project</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectForm action={boundUpdate} goals={goals} initialValues={project} submitLabel="Save Changes" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 px-6 pb-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <MilestoneList projectId={project.id} milestones={project.milestones} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-text-secondary">
                No tasks yet. Use Quick Add or the Tasks board to add one to this project.
              </p>
            ) : (
              <div className="flex flex-col">
                {tasks.map((task) => (
                  <TaskListItem key={task.id} task={task} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="px-6 pb-6">
        <form action={boundArchive}>
          <button
            type="submit"
            className="flex items-center gap-1.5 text-xs font-medium text-danger hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Archive this project
          </button>
        </form>
      </div>
    </div>
  );
}
