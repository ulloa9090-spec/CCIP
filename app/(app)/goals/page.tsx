import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default function GoalsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Goals" description="Measurable outcomes, grouped by Life Area." />
      <div className="p-6">
        <EmptyState
          icon={<Target className="h-8 w-8" />}
          title="No goals yet"
          description="Create your first goal and connect it to a Life Area."
          action={<Button size="sm">New Goal</Button>}
        />
      </div>
    </div>
  );
}
