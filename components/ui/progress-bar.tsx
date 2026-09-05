import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0-100 */
  value: number;
  /** Shown visibly beneath the bar as "label · X%". */
  label?: string;
  /**
   * Accessible name when no visible `label` is wanted (e.g. the label would
   * duplicate text already shown elsewhere in the card). Falls back to
   * `label`, then to a generic "Progress" — the bar always has an
   * accessible name regardless of what the caller passes.
   */
  ariaLabel?: string;
}

export function ProgressBar({
  value,
  label,
  ariaLabel,
  className,
  ...props
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel ?? label ?? "Progress"}
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-emphasized ease-standard"
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
