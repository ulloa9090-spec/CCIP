import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default function AiCoachPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="AI Coach"
        description="Morning Brief, Weekly Coach, Planning and Decision Assistants."
        action={<Badge variant="accent">Phase 10</Badge>}
      />
      <div className="p-6">
        <EmptyState
          icon={<Sparkles className="h-8 w-8" />}
          title="AI Coach arrives in Phase 10"
          description="Every suggestion here will always require your approval before anything changes — nothing is written automatically."
        />
      </div>
    </div>
  );
}
