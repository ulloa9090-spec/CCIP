import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

/** Shaped to a WidgetCard's final layout so it doesn't cause layout shift. */
export function WidgetSkeleton({ lines = 2, className }: { lines?: number; className?: string }) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
