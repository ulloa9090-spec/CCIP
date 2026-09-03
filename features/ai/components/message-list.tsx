import { cn } from "@/lib/utils/cn";
import type { AiMessageRecord } from "@/features/ai/types";

export function MessageList({ messages }: { messages: AiMessageRecord[] }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {messages.map((m) => (
        <div
          key={m.id}
          className={cn(
            "max-w-[85%] whitespace-pre-wrap rounded-(--radius-token-md) px-3 py-2 text-sm",
            m.role === "user"
              ? "self-end bg-accent text-accent-foreground"
              : "self-start bg-surface text-text-primary",
          )}
        >
          {m.content}
        </div>
      ))}
    </div>
  );
}
