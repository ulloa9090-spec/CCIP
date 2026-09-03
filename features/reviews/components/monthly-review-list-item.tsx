import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { MonthlyReview } from "@/features/reviews/types";

export function MonthlyReviewListItem({ review }: { review: MonthlyReview }) {
  const month = new Date(`${review.month}T00:00:00`);

  return (
    <Link href={`/reviews/monthly/${review.month}`}>
      <Card className="transition-colors hover:border-accent">
        <CardContent className="flex items-center justify-between gap-3 py-3">
          <p className="text-sm font-medium text-text-primary">{format(month, "MMMM yyyy")}</p>
          {review.status === "completed" ? (
            <Badge variant="success">Completed</Badge>
          ) : (
            <Badge variant="warning">In Progress</Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
