"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { approveInsight, rejectInsight } from "@/features/ai/actions";
import type { AiInsight, PlanBreakdownItem } from "@/features/ai/types";

/** blueprint §M.3 — the only place a SUGGEST-tier AI output can become a
 * real change: Approve (optionally after editing here, i.e. "Modify")
 * calls the same Server Action a human edit would use; Ignore just marks
 * the suggestion rejected. Nothing here writes anything by itself. */
export function InsightCard({ insight }: { insight: AiInsight }) {
  const [status, setStatus] = useState(insight.status);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<PlanBreakdownItem[]>(
    insight.payload.kind === "plan_breakdown" ? insight.payload.items : [],
  );
  const [toDate, setToDate] = useState(insight.payload.kind === "suggest_reschedule" ? insight.payload.toDate : "");

  if (status !== "pending") {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-3 text-sm text-text-secondary">
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
          Suggestion {status === "approved" ? "applied." : "ignored."}
        </CardContent>
      </Card>
    );
  }

  async function handleApprove() {
    setBusy(true);
    setError(null);
    const editedPayload =
      insight.payload.kind === "plan_breakdown"
        ? { ...insight.payload, items }
        : { ...insight.payload, toDate };
    const result = await approveInsight(insight.id, editedPayload);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStatus("approved");
  }

  async function handleReject() {
    setBusy(true);
    setError(null);
    const result = await rejectInsight(insight.id);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStatus("rejected");
  }

  return (
    <Card className="border-accent/40">
      <CardHeader className="flex flex-row items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
        <CardTitle>Suggestion</CardTitle>
        <Badge variant="accent">{insight.type === "plan_breakdown" ? "Plan breakdown" : "Reschedule"}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {insight.payload.kind === "plan_breakdown" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-text-secondary">
              Add these to &quot;{insight.payload.targetTitle}&quot;:
            </p>
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Badge variant="neutral" className="w-20 shrink-0 justify-center">
                  {item.kind}
                </Badge>
                <Input
                  value={item.title}
                  onChange={(e) =>
                    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, title: e.target.value } : it)))
                  }
                  className="flex-1"
                />
                <button
                  type="button"
                  aria-label={`Remove ${item.title}`}
                  onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-text-secondary hover:text-danger"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {items.length === 0 && <p className="text-xs text-text-secondary">Nothing left to add.</p>}
          </div>
        )}

        {insight.payload.kind === "suggest_reschedule" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-text-secondary">
              Move &quot;{insight.payload.taskTitle}&quot;
              {insight.payload.fromDate ? ` from ${insight.payload.fromDate}` : ""} to:
            </p>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
            <p className="text-xs text-text-secondary">{insight.payload.reason}</p>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleApprove}
            loading={busy}
            disabled={insight.payload.kind === "plan_breakdown" && items.length === 0}
          >
            Approve
          </Button>
          <Button size="sm" variant="ghost" onClick={handleReject} disabled={busy}>
            Ignore
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
