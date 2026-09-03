import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { getInsightsForThread, getMessages, getThreadById } from "@/features/ai/queries";
import { MessageList } from "@/features/ai/components/message-list";
import { ChatInput } from "@/features/ai/components/chat-input";
import { InsightCard } from "@/features/ai/components/insight-card";

export default async function AiThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const thread = await getThreadById(threadId);
  if (!thread) notFound();

  const [messages, insights] = await Promise.all([getMessages(threadId), getInsightsForThread(threadId)]);
  const pendingInsights = insights.filter((i) => i.status === "pending");
  const awaitingReply = messages.length > 0 && messages[messages.length - 1]!.role === "user";

  return (
    <div className="flex flex-col">
      <PageHeader title={thread.title} action={<Badge variant="neutral">{thread.contextType.replace("_", " ")}</Badge>} />

      <div className="flex flex-1 flex-col">
        <MessageList messages={messages} />

        {awaitingReply && (
          <p className="px-4 pb-2 text-sm text-text-secondary">
            AI Coach is unavailable right now — check back later, or ask again below.
          </p>
        )}

        {pendingInsights.length > 0 && (
          <div className="flex flex-col gap-3 px-4 pb-4">
            {pendingInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}

        <ChatInput threadId={threadId} />
      </div>
    </div>
  );
}
