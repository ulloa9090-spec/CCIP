"use server";

import { toCsv } from "@/lib/utils/csv";
import { getFullDataExport } from "./data";

export type ExportResult = { filename: string; content: string } | { error: string };

export async function exportDataAsJson(): Promise<ExportResult> {
  try {
    const bundle = await getFullDataExport();
    return {
      filename: `atlas-os-export-${bundle.exportedAt.slice(0, 10)}.json`,
      content: JSON.stringify(bundle, null, 2),
    };
  } catch {
    return { error: "Couldn't export your data. Try again." };
  }
}

export async function exportTasksAsCsv(): Promise<ExportResult> {
  try {
    const bundle = await getFullDataExport();
    const content = toCsv(bundle.tasks, [
      { key: "title", header: "Title" },
      { key: "status", header: "Status" },
      { key: "priority", header: "Priority" },
      { key: "due_date", header: "Due Date" },
      { key: "scheduled_date", header: "Scheduled Date" },
      { key: "completed_at", header: "Completed At" },
      { key: "created_at", header: "Created At" },
    ]);
    return { filename: "atlas-os-tasks.csv", content };
  } catch {
    return { error: "Couldn't export your tasks. Try again." };
  }
}

export async function exportJournalAsCsv(): Promise<ExportResult> {
  try {
    const bundle = await getFullDataExport();
    const content = toCsv(bundle.journal_entries, [
      { key: "category", header: "Category" },
      { key: "body", header: "Entry" },
      { key: "created_at", header: "Created At" },
    ]);
    return { filename: "atlas-os-journal.csv", content };
  } catch {
    return { error: "Couldn't export your journal. Try again." };
  }
}
