import { ListTodo } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getTasks } from "@/features/tasks/queries";
import { getProjects } from "@/features/projects/queries";
import { getGoals } from "@/features/goals/queries";
import { KanbanBoard, NewTaskModal } from "@/features/tasks/components";

export default async function TasksPage() {
  const [tasks, projects, goals] = await Promise.all([getTasks(), getProjects(), getGoals()]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Tasks"
        description="Drag a task between columns to move it through your workflow."
        action={<NewTaskModal projects={projects} goals={goals} />}
      />

      {tasks.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<ListTodo className="h-8 w-8" />}
            title="No tasks yet"
            description="Create your first task and drag it across the board as you work it."
            action={<NewTaskModal projects={projects} goals={goals} />}
          />
        </div>
      ) : (
        <KanbanBoard tasks={tasks} />
      )}
    </div>
  );
}
