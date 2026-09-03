import { Lightbulb } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getIdeas } from "@/features/ideas/queries";
import { IdeaBoard, NewIdeaModal } from "@/features/ideas/components";

export default async function IdeasPage() {
  const ideas = await getIdeas();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Ideas"
        description="Capture now, evaluate later. Drag a card to move it through the funnel."
        action={<NewIdeaModal />}
      />

      {ideas.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<Lightbulb className="h-8 w-8" />}
            title="No ideas captured"
            description="Capture anything — you don't have to act on it yet."
            action={<NewIdeaModal />}
          />
        </div>
      ) : (
        <IdeaBoard ideas={ideas} />
      )}
    </div>
  );
}
