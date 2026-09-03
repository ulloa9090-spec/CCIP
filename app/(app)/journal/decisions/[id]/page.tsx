import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { getDecisionById } from "@/features/decisions/queries";
import { ResolveDecisionForm } from "@/features/decisions/components";
import { startDecisionAssistant } from "@/features/ai/actions";

export default async function DecisionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decision = await getDecisionById(id);
  if (!decision) notFound();

  const resolved = decision.actualOutcome !== null;

  return (
    <div className="flex flex-col">
      <PageHeader
        title={decision.title}
        description={`Decided ${format(new Date(decision.decidedAt), "MMMM d, yyyy")}`}
        action={resolved ? <Badge variant="success">Reviewed</Badge> : <Badge variant="warning">Open</Badge>}
      />

      <div className="flex flex-col gap-4 p-6">
        {decision.context && (
          <Card>
            <CardHeader>
              <CardTitle>Context</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-text-secondary">{decision.context}</p>
            </CardContent>
          </Card>
        )}

        {decision.options.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Options Considered</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1">
                {decision.options.map((option, i) => (
                  <li
                    key={i}
                    className="text-sm text-text-secondary"
                    data-chosen={option === decision.chosenOption || undefined}
                  >
                    {option === decision.chosenOption ? (
                      <span className="font-medium text-text-primary">{option} (chosen)</span>
                    ) : (
                      option
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {decision.reasoning && (
          <Card>
            <CardHeader>
              <CardTitle>Reasoning</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-text-secondary">{decision.reasoning}</p>
            </CardContent>
          </Card>
        )}

        {decision.expectedOutcome && (
          <Card>
            <CardHeader>
              <CardTitle>Expected Outcome</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">{decision.expectedOutcome}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Review</CardTitle>
          </CardHeader>
          <CardContent>
            {resolved ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-text-primary">{decision.actualOutcome}</p>
                {decision.lesson && (
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium text-text-primary">Lesson:</span> {decision.lesson}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <form action={startDecisionAssistant.bind(null, decision.id)}>
                  <Button type="submit" size="sm" variant="secondary" className="gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Ask AI for Perspective
                  </Button>
                </form>
                <ResolveDecisionForm decisionId={decision.id} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
