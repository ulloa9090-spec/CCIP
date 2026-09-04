import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <p className="text-lg font-semibold text-text-primary">Page not found</p>
      <p className="text-sm text-text-secondary">That page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Button asChild size="sm">
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  );
}
