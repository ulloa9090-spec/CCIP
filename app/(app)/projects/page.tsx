import { FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default function ProjectsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Projects"
        description="Only one project can be your Primary Active Project at a time."
      />
      <div className="p-6">
        <EmptyState
          icon={<FolderKanban className="h-8 w-8" />}
          title="No projects yet"
          description="Create your first project and connect it to a goal."
          action={<Button size="sm">New Project</Button>}
        />
      </div>
    </div>
  );
}
