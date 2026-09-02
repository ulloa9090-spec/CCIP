import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default function Plan90DaysPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="90-Day Plan"
        description="The quarter that operationalizes a goal into milestones."
      />
      <div className="p-6">
        <EmptyState
          icon={<Flag className="h-8 w-8" />}
          title="No active 90-day cycle"
          description="Start a cycle to turn a goal into a focused quarter with real milestones."
          action={<Button size="sm">Start a 90-Day Cycle</Button>}
        />
      </div>
    </div>
  );
}
