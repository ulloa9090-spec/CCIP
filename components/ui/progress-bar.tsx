import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0-100 */
  value: number;
  label?: string;
}

export function ProgressBar({ value, label, className, ...props }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width]"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {label && (
        <span className="text-xs text-text-secondary">
          {label} · {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
