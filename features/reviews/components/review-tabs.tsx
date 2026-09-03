import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function ReviewTabs({ active }: { active: "weekly" | "monthly" }) {
  return (
    <div className="flex w-fit gap-1 rounded-(--radius-token-sm) bg-surface p-1">
      <Link
        href="/reviews?tab=weekly"
        className={cn(
          "rounded-(--radius-token-sm) px-3 py-1.5 text-sm font-medium text-text-secondary",
          active === "weekly" && "bg-surface-raised text-text-primary",
        )}
      >
        Weekly
      </Link>
      <Link
        href="/reviews?tab=monthly"
        className={cn(
          "rounded-(--radius-token-sm) px-3 py-1.5 text-sm font-medium text-text-secondary",
          active === "monthly" && "bg-surface-raised text-text-primary",
        )}
      >
        Monthly
      </Link>
    </div>
  );
}
