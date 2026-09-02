import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-(--radius-token-sm) bg-surface", className)}
      {...props}
    />
  );
}
