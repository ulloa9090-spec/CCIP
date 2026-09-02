import { Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default function TodayPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Today" description="Your Most Important Task, Top 3, and today's plan." />
      <div className="p-6">
        <EmptyState
          icon={<Sunrise className="h-8 w-8" />}
          title="Nothing planned for today yet"
          description="Set today's Most Important Task or capture something with Quick Add to get moving."
          action={<Button size="sm">Set Most Important Task</Button>}
        />
      </div>
    </div>
  );
}
