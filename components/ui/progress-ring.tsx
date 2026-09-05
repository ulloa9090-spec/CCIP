import * as React from "react";
import { cn } from "@/lib/utils/cn";

const RING_TONE_CLASSES = {
  accent: "stroke-accent",
  success: "stroke-success",
  warning: "stroke-warning",
  danger: "stroke-danger",
} as const;

export interface ProgressRingProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0-100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  /** Defaults to "accent". Never the only signal for what the value means — pair with visible text. */
  tone?: keyof typeof RING_TONE_CLASSES;
}

export function ProgressRing({
  value,
  size = 56,
  strokeWidth = 5,
  label,
  tone = "accent",
  className,
  ...props
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-surface"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            "fill-none transition-[stroke-dashoffset] duration-emphasized ease-standard",
            RING_TONE_CLASSES[tone],
          )}
        />
      </svg>
      <span className="absolute text-title text-text-primary">{Math.round(clamped)}%</span>
    </div>
  );
}
