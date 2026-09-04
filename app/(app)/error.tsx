"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * blueprint §O.7 — unexpected errors get a generic, plain-language message
 * and a retry action, never a raw stack trace. Catches any throw from an
 * (app) route's Server or Client Component; logged server-side via
 * console.error (no request-body/user-content logging elsewhere in the
 * codebase either — see docs/SECURITY.md).
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <AlertTriangle className="h-8 w-8 text-danger" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-text-primary">Something went wrong.</p>
        <p className="text-sm text-text-secondary">Try again, or head back to the Dashboard.</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => reset()}>
          Try again
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
