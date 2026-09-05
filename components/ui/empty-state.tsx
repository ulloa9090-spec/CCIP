import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-(--radius-token-md) border border-dashed border-border p-10 text-center",
        className,
      )}
      {...props}
    >
      {icon && <div className="text-text-secondary">{icon}</div>}
      <div className="flex flex-col gap-1">
        <p className="text-title text-text-primary">{title}</p>
        {description && <p className="max-w-sm text-body text-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}
