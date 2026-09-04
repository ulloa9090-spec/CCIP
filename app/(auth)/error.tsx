"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AuthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <AlertTriangle className="h-8 w-8 text-danger" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-text-primary">Something went wrong.</p>
          <p className="text-sm text-text-secondary">Try again, or start over.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => reset()}>
            Try again
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/login">Back to login</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
