import { CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default function TasksPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Tasks" description="Every task, filterable and sortable." />
      <div className="p-6">
        <EmptyState
          icon={<CheckSquare className="h-8 w-8" />}
          title="Your task list is empty"
          description="Capture a task with Quick Add to get moving."
          action={<Button size="sm">New Task</Button>}
        />
      </div>
    </div>
  );
}
