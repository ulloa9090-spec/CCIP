import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Analytics"
        description="Task completion, habit consistency, focus time, and Weekly Execution Score trends."
      />
      <div className="p-6">
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" />}
          title="Not enough data yet"
          description="Analytics populate once you have tasks, habits, and at least one Weekly Review."
        />
      </div>
    </div>
  );
}
