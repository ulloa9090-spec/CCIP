import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default function ReviewsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Reviews" description="Weekly and Monthly Review sessions." />
      <div className="p-6">
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title="No reviews yet"
          description="Your first Weekly Review will appear here once you have a week of activity."
          action={<Button size="sm">Start Weekly Review</Button>}
        />
      </div>
    </div>
  );
}
