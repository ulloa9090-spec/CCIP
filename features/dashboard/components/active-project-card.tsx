import Link from "next/link";
import { Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { DashboardActiveProjectData, ModuleResult } from "@/features/dashboard/types";
import { safeModule, getActiveProjectData } from "@/features/dashboard/get-dashboard-data";
import { WidgetCard } from "./widget-card";
import { WidgetError } from "./widget-error";

export function ActiveProjectCardBody({
  result,
}: {
  result: ModuleResult<DashboardActiveProjectData>;
}) {
  return (
    <WidgetCard title="Active Project" icon={<Home className="h-4 w-4" />}>
      {result.status === "error" ? (
        <WidgetError />
      ) : result.data.project === null ? (
        <EmptyState
          title="No Active Project set"
          description="Choose a project to make it your primary focus."
          action={
            <Button size="sm" asChild>
              <Link href="/projects">Choose a Project</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-text-primary">{result.data.project.name}</p>
            <Badge variant="accent">Active</Badge>
          </div>
          <ProgressBar
            value={result.data.project.progress}
            ariaLabel={`${result.data.project.name} progress`}
          />
          {result.data.project.nextMilestone && (
            <p className="text-xs text-text-secondary">
              Next: {result.data.project.nextMilestone}
            </p>
          )}
        </div>
      )}
    </WidgetCard>
  );
}

export async function ActiveProjectCard() {
  const result = await safeModule(getActiveProjectData);
  return <ActiveProjectCardBody result={result} />;
}
