import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { getChallengeById } from "@/features/challenges/queries";
import { ChallengeDayGrid, CompleteChallengeForm } from "@/features/challenges/components";
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

export default async function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const challenge = await getChallengeById(id);
  if (!challenge) notFound();

  const daysDone = challenge.days.filter((d) => d.completed).length;

  return (
    <div className="flex flex-col">
      <PageHeader
        title={challenge.title}
        description={challenge.goalTitle ? `Goal: ${challenge.goalTitle}` : undefined}
        action={<Badge variant={STATUS_VARIANT[challenge.status]}>{STATUS_LABEL[challenge.status]}</Badge>}
      />

      <div className="flex flex-col gap-4 p-6">
        {challenge.dailyAction && (
          <Card>
            <CardHeader>
              <CardTitle>Daily Action</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">{challenge.dailyAction}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              Day {daysDone} of 21
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChallengeDayGrid challengeId={challenge.id} days={challenge.days} />
          </CardContent>
        </Card>

        {challenge.status === "active" ? (
          <Card>
            <CardHeader>
              <CardTitle>Wrap Up</CardTitle>
            </CardHeader>
            <CardContent>
              <CompleteChallengeForm challengeId={challenge.id} />
            </CardContent>
          </Card>
        ) : (
          (challenge.reflections || challenge.finalScore !== null) && (
            <Card>
              <CardHeader>
                <CardTitle>Reflections</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {challenge.finalScore !== null && (
                  <p className="text-sm text-text-primary">Final score: {challenge.finalScore}</p>
                )}
                {challenge.reflections && (
                  <p className="text-sm text-text-secondary">{challenge.reflections}</p>
                )}
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
