import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default function JournalPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Journal" description="Reflections, learnings, wins, and free notes." />
      <div className="p-6">
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title="No entries yet"
          description="Write your first journal entry."
          action={<Button size="sm">New Entry</Button>}
        />
      </div>
    </div>
  );
}
