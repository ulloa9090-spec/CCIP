import { CircleAlert } from "lucide-react";

/**
 * Inline, module-level error fallback — a failed widget renders this
 * instead of the Dashboard page crashing (Phase 3 §8). Never shows the raw
 * underlying error (blueprint §O.7): the real message is server-logged by
 * safeModule() in get-dashboard-data.ts.
 */
export function WidgetError() {
  return (
    <div className="flex items-center gap-2 py-4 text-sm text-text-secondary">
      <CircleAlert className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
      This section couldn&apos;t load. Try refreshing the page.
    </div>
  );
}
