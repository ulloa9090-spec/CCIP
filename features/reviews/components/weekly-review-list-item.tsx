import Link from "next/link";
import { addDays, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { WeeklyReview } from "@/features/reviews/types";

export function WeeklyReviewListItem({ review }: { review: WeeklyReview }) {
  const weekStart = new Date(`${review.weekStartDate}T00:00:00`);
  const weekEnd = addDays(weekStart, 6);

  return (
    <Link href={`/reviews/weekly/${review.weekStartDate}`}>
      <Card className="transition-colors hover:border-accent">
        <CardContent className="flex items-center justify-between gap-3 py-3">
          <p className="text-sm font-medium text-text-primary">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </p>
          <div className="flex items-center gap-2">
            {review.executionScore !== null && (
              <span className="text-xs font-semibold text-text-primary">{review.executionScore}%</span>
            )}
            {review.status === "completed" ? (
              <Badge variant="success">Completed</Badge>
            ) : (
              <Badge variant="warning">In Progress</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
