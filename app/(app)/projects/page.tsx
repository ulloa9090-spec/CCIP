import { FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getActiveProject, getProjects } from "@/features/projects/queries";
import { getGoals } from "@/features/goals/queries";
import { computeProjectProgress } from "@/features/projects/progress";
import { NewProjectModal, ProjectListItem } from "@/features/projects/components";

const STATUS_ORDER = ["active", "secondary", "waiting", "someday", "completed", "archived"] as const;
const STATUS_LABELS: Record<(typeof STATUS_ORDER)[number], string> = {
  active: "Active",
  secondary: "Secondary",
  waiting: "Waiting",
  someday: "Someday",
  completed: "Completed",
  archived: "Archived",
};

export default async function ProjectsPage() {
  const [projects, goals, activeProject] = await Promise.all([
    getProjects(),
    getGoals(),
    getActiveProject(),
  ]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Projects"
        description="Only one project can be your Primary Active Project at a time."
        action={<NewProjectModal goals={goals} />}
      />

      <div className="flex flex-col gap-6 p-6">
        {activeProject && (
          <Card>
            <CardHeader>
              <CardTitle>Primary Active Project</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm font-medium text-text-primary">{activeProject.name}</p>
              <ProgressBar
                value={computeProjectProgress(activeProject)}
                ariaLabel={`${activeProject.name} progress`}
              />
            </CardContent>
          </Card>
        )}

        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="h-8 w-8" />}
            title="No projects yet"
            description="Create your first project and connect it to a goal."
            action={<NewProjectModal goals={goals} />}
          />
        ) : (
          STATUS_ORDER.map((status) => {
            const group = projects.filter((p) => p.status === status);
            if (group.length === 0) return null;
            return (
              <section key={status} className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-text-primary">{STATUS_LABELS[status]}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.map((project) => (
                    <ProjectListItem key={project.id} project={project} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
