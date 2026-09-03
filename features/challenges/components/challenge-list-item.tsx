import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Challenge } from "@/features/challenges/types";

const STATUS_VARIANT: Record<Challenge["status"], "accent" | "success" | "neutral"> = {
  active: "accent",
  completed: "success",
  abandoned: "neutral",
};

const STATUS_LABEL: Record<Challenge["status"], string> = {
  active: "Active",
  completed: "Completed",
  abandoned: "Abandoned",
};

export function ChallengeListItem({ challenge }: { challenge: Challenge }) {
  const daysDone = challenge.days.filter((d) => d.completed).length;

  return (
    <Link href={`/habits/challenges/${challenge.id}`}>
      <Card className="transition-colors hover:border-accent">
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-text-primary">{challenge.title}</p>
            <p className="text-xs text-text-secondary">
              Day {daysDone} of 21 {challenge.goalTitle && `· ${challenge.goalTitle}`}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[challenge.status]}>{STATUS_LABEL[challenge.status]}</Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
