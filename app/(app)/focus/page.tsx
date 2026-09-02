import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default function FocusPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Focus" description="Run a timed focus session and log real work." />
      <div className="p-6">
        <EmptyState
          icon={<Timer className="h-8 w-8" />}
          title="No focus sessions logged"
          description="Start a focus session to log deep work time against a task or project."
          action={<Button size="sm">Start Focus Session</Button>}
        />
      </div>
    </div>
  );
}
