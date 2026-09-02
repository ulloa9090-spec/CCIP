import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default function HabitsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Habits" description="Streaks and consistency, not one-off outcomes." />
      <div className="p-6">
        <EmptyState
          icon={<Repeat className="h-8 w-8" />}
          title="No habits yet"
          description="Add a habit you want to build consistency with."
          action={<Button size="sm">New Habit</Button>}
        />
      </div>
    </div>
  );
}
