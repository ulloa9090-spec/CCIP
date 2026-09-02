import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default function CalendarPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Calendar"
        description="Task due dates, scheduled tasks, time blocks, and events — Day / Week / Month."
      />
      <div className="p-6">
        <EmptyState
          icon={<CalendarIcon className="h-8 w-8" />}
          title="Nothing scheduled"
          description="Schedule a task or add a time block to see it here."
          action={<Button size="sm">Add Time Block</Button>}
        />
      </div>
    </div>
  );
}
