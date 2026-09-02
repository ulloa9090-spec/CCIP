import { BarChart3, Flag, Home, Lightbulb, ListChecks, Repeat, Sunrise } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

/**
 * Dashboard is a scaffold in Phase 1 (Phase 0 blueprint §T): the four-level
 * hierarchy from §G is laid out now; each card is progressively wired to
 * real data as Phases 3-9 land their own domain.
 */
export default function DashboardPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Dashboard" description="What matters now. What to do today. Are you advancing?" />

      <div className="flex flex-col gap-6 p-6">
        {/* Level 1 */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-4 w-4" /> Active Project
              </CardTitle>
              <CardDescription>Your single primary focus right now.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                title="No Active Project set"
                description="Mark a project as Primary Active to see it here."
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sunrise className="h-4 w-4" /> Today
              </CardTitle>
              <CardDescription>Most Important Task, Top 3, and today&apos;s plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState title="Nothing planned yet" description="Set today's Most Important Task." />
            </CardContent>
          </Card>
        </div>

        {/* Level 2 */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-4 w-4" /> 90-Day Goal
              </CardTitle>
              <CardDescription>The quarter you&apos;re currently executing.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState title="No active cycle" description="Start a 90-Day Plan cycle." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" /> Weekly Priorities
              </CardTitle>
              <CardDescription>Up to 3 outcomes for this week.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState title="No priorities set" description="Choose this week's Top 3." />
            </CardContent>
          </Card>
        </div>

        {/* Level 3 */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-4 w-4" /> Habits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState title="No habits yet" description="Add a habit to track." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState title="Nothing this week" description="Schedule a task or event." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Focus</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState title="No sessions logged" description="Run a focus session." />
            </CardContent>
          </Card>
        </div>

        {/* Level 4 */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Weekly Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState title="Not enough data" description="Score appears after your first week." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" /> Idea Parking Lot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState title="No ideas captured" description="Use Quick Add to park an idea." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Weekly Review</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState title="Nothing to review yet" description="Check back at week's end." />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
