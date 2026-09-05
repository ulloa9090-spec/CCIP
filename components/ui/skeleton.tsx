import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-(--radius-token-sm) bg-surface duration-[1.4s] ease-standard",
        className,
      )}
      {...props}
    />
  );
}
