import Link from "next/link";
import type { Decision } from "@/features/decisions/types";

export function DueForReview({ decisions }: { decisions: Decision[] }) {
  if (decisions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-(--radius-token-md) border border-warning/30 bg-warning/5 p-3">
      <p className="text-sm font-semibold text-warning">
        {decisions.length} decision{decisions.length === 1 ? "" : "s"} due for review
      </p>
      <ul className="flex flex-col gap-1">
        {decisions.map((d) => (
          <li key={d.id}>
            <Link href={`/journal/decisions/${d.id}`} className="text-sm text-text-primary hover:underline">
              {d.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
