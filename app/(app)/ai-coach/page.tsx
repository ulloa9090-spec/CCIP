import Link from "next/link";
import { MessageSquare, Moon, Sparkles, Sunrise, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { generateEveningReview, generateMorningBrief, generateWeeklyCoach } from "@/features/ai/actions";
import { getThreads } from "@/features/ai/queries";
import { weekStartDate } from "@/features/tasks/queries";
import { NewConversationForm } from "@/features/ai/components/new-conversation-form";
import type { AiContextType } from "@/features/ai/types";

const CONTEXT_LABELS: Record<AiContextType, string> = {
  morning_brief: "Morning Brief",
  evening_review: "Evening Review",
  weekly_coach: "Weekly Coach",
  planning: "Planning",
  decision_assistant: "Decision",
  freeform: "Conversation",
};

export default async function AiCoachPage() {
  const threads = await getThreads();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="AI Coach"
        description="Morning Brief, Weekly Coach, Planning and Decision Assistants — every suggestion always requires your approval before anything changes."
      />

      <div className="flex flex-col gap-6 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sunrise className="h-4 w-4 text-accent" aria-hidden="true" />
                Morning Brief
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={generateMorningBrief}>
                <Button type="submit" size="sm">
                  Generate
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-accent" aria-hidden="true" />
                Evening Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={generateEveningReview}>
                <Button type="submit" size="sm">
                  Generate
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" aria-hidden="true" />
                Weekly Coach
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={generateWeeklyCoach.bind(null, weekStartDate())}>
                <Button type="submit" size="sm">
                  Generate
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-accent" aria-hidden="true" />
              New Conversation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NewConversationForm />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text-primary">Recent</h2>
          {threads.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-8 w-8" />}
              title="No conversations yet"
              description="Generate a brief above, or start a freeform conversation."
            />
          ) : (
            threads.map((t) => (
              <Link key={t.id} href={`/ai-coach/${t.id}`}>
                <Card className="transition-colors hover:border-accent">
                  <CardContent className="flex items-center justify-between gap-3 py-3">
                    <p className="text-sm font-medium text-text-primary">{t.title}</p>
                    <Badge variant="neutral">{CONTEXT_LABELS[t.contextType]}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
