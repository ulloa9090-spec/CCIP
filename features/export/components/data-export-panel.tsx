"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { exportDataAsJson, exportJournalAsCsv, exportTasksAsCsv, type ExportResult } from "@/features/export/actions";

type ExportKind = "json" | "tasks-csv" | "journal-csv";

const EXPORTERS: Record<ExportKind, () => Promise<ExportResult>> = {
  json: exportDataAsJson,
  "tasks-csv": exportTasksAsCsv,
  "journal-csv": exportJournalAsCsv,
};

const MIME_TYPES: Record<ExportKind, string> = {
  json: "application/json",
  "tasks-csv": "text/csv",
  "journal-csv": "text/csv",
};

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function DataExportPanel() {
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(kind: ExportKind) {
    setBusy(kind);
    setError(null);
    const result = await EXPORTERS[kind]();
    setBusy(null);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    downloadTextFile(result.filename, result.content, MIME_TYPES[kind]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" loading={busy === "json"} onClick={() => handleExport("json")}>
          Export All Data (JSON)
        </Button>
        <Button size="sm" variant="secondary" loading={busy === "tasks-csv"} onClick={() => handleExport("tasks-csv")}>
          Export Tasks (CSV)
        </Button>
        <Button size="sm" variant="secondary" loading={busy === "journal-csv"} onClick={() => handleExport("journal-csv")}>
          Export Journal (CSV)
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <p className="text-xs text-text-secondary">The JSON export includes every table — a full backup of your account.</p>
    </div>
  );
}
