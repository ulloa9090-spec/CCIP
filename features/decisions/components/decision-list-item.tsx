import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Decision } from "@/features/decisions/types";

export function DecisionListItem({ decision }: { decision: Decision }) {
  const resolved = decision.actualOutcome !== null;
  const due = !resolved && decision.reviewDate !== null && decision.reviewDate <= new Date().toISOString().slice(0, 10);

  return (
    <Link href={`/journal/decisions/${decision.id}`}>
      <Card className="transition-colors hover:border-accent">
        <CardContent className="flex items-center justify-between gap-3 py-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-text-primary">{decision.title}</p>
            <p className="text-xs text-text-secondary">{format(new Date(decision.decidedAt), "MMM d, yyyy")}</p>
          </div>
          {due && <Badge variant="warning">Due for review</Badge>}
          {resolved && <Badge variant="success">Reviewed</Badge>}
        </CardContent>
      </Card>
    </Link>
  );
}
