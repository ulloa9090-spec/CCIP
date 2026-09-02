import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default function IdeasPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Ideas"
        description="The Idea Parking Lot — capture without committing."
      />
      <div className="p-6">
        <EmptyState
          icon={<Lightbulb className="h-8 w-8" />}
          title="Idea Parking Lot is empty"
          description="Capture ideas here without promoting them to a project until you're ready."
          action={<Button size="sm">New Idea</Button>}
        />
      </div>
    </div>
  );
}
