import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={error || undefined}
        className={cn(
          "flex h-9 w-full rounded-(--radius-token-sm) border border-border bg-surface px-3 text-sm text-text-primary",
          "placeholder:text-text-secondary",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-danger focus-visible:ring-danger",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
