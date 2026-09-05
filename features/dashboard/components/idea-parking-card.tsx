import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardIdeaData, ModuleResult } from "@/features/dashboard/types";
import { safeModule, getIdeaData } from "@/features/dashboard/get-dashboard-data";
import { WidgetCard } from "./widget-card";
import { WidgetError } from "./widget-error";

export function IdeaParkingCardBody({ result }: { result: ModuleResult<DashboardIdeaData> }) {
  return (
    <WidgetCard title="Idea Parking Lot" icon={<Lightbulb className="h-4 w-4" />} accent="amber">
      {result.status === "error" ? (
        <WidgetError />
      ) : result.data.ideas.length === 0 ? (
        <EmptyState
          title="No ideas captured"
          description="Use Quick Add to park an idea."
          action={
            <Button size="sm" asChild>
              <Link href="/ideas">Open Ideas</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-1">
          {result.data.ideas.map((idea) => (
            <li key={idea.id} className="text-sm text-text-secondary">
              {idea.title}
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export async function IdeaParkingCard() {
  const result = await safeModule(getIdeaData);
  return <IdeaParkingCardBody result={result} />;
}
