import { NotebookPen } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getJournalEntries } from "@/features/journal/queries";
import { CategoryFilter, JournalEntryItem, NewEntryModal } from "@/features/journal/components";
import { getGoals } from "@/features/goals/queries";
import { getProjects } from "@/features/projects/queries";
import { getTasks } from "@/features/tasks/queries";
import { getDecisions, getDueForReview } from "@/features/decisions/queries";
import { DecisionListItem, DueForReview, NewDecisionModal } from "@/features/decisions/components";
import type { JournalCategory } from "@/features/journal/types";
import { JOURNAL_CATEGORIES } from "@/lib/validation/journal";

function isJournalCategory(value: string | undefined): value is JournalCategory {
  return !!value && (JOURNAL_CATEGORIES as readonly string[]).includes(value);
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const category = isJournalCategory(params.category) ? params.category : undefined;

  const [goals, projects, tasks, decisions, dueDecisions] = await Promise.all([
    getGoals(),
    getProjects(),
    getTasks(),
    getDecisions(),
    getDueForReview(),
  ]);
  const entries = await getJournalEntries({ category });

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Journal"
        description="Reflections, learnings, wins, and decisions — in one place."
        action={<NewEntryModal goals={goals} projects={projects} tasks={tasks} decisions={decisions} />}
      />

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <CategoryFilter active={category} />

          {entries.length === 0 ? (
            <EmptyState
              icon={<NotebookPen className="h-8 w-8" />}
              title="No entries yet"
              description="Capture a reflection, a win, or a lesson learned."
              action={<NewEntryModal goals={goals} projects={projects} tasks={tasks} decisions={decisions} />}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {entries.map((entry) => (
                <JournalEntryItem key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Decision Log</CardTitle>
              <NewDecisionModal goals={goals} projects={projects} tasks={tasks} />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <DueForReview decisions={dueDecisions} />
              {decisions.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Log a decision to track what you chose, why, and what actually happened.
                </p>
              ) : (
                decisions.slice(0, 10).map((d) => <DecisionListItem key={d.id} decision={d} />)
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
