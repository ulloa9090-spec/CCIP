import Link from "next/link";
import { Star } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { computeProjectProgress } from "@/features/projects/progress";
import type { Project } from "@/features/projects/types";
import { ProjectStatusBadge } from "./project-status-badge";

export function ProjectListItem({ project }: { project: Project }) {
  const progress = computeProjectProgress(project);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex flex-col gap-2 rounded-(--radius-token-sm) border border-border p-3 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
          {project.isPrimaryActive && <Star className="h-3.5 w-3.5 shrink-0 text-accent" />}
          {project.name}
        </p>
        <ProjectStatusBadge status={project.status} />
      </div>
      <ProgressBar value={progress} ariaLabel={`${project.name} progress`} />
      {project.goalTitle && <p className="text-xs text-text-secondary">Goal: {project.goalTitle}</p>}
    </Link>
  );
}
