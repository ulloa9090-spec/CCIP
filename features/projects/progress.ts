import type { Project } from "./types";

/**
 * Project progress (blueprint §K): 50% milestone completion + 50% task
 * completion, with a manual override taking precedence when set (not every
 * project decomposes cleanly into tasks — e.g. "write a book").
 */
export function computeProjectProgress(project: Project): number {
  if (project.progressOverride !== null) {
    return Math.max(0, Math.min(100, project.progressOverride));
  }

  const milestoneTotal = project.milestones.length;
  const milestoneDone = project.milestones.filter((m) => m.status === "done").length;
  const milestonePct = milestoneTotal > 0 ? (milestoneDone / milestoneTotal) * 100 : null;

  const taskPct =
    project.taskStats.total > 0 ? (project.taskStats.done / project.taskStats.total) * 100 : null;

  if (milestonePct === null && taskPct === null) return 0;
  if (milestonePct === null) return taskPct as number;
  if (taskPct === null) return milestonePct;
  return milestonePct * 0.5 + taskPct * 0.5;
}
