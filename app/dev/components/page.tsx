import { CircleAlert, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ProgressRing } from "@/components/ui/progress-ring";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
        {title}
      </h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

/**
 * Internal-only verification surface for the design system primitives
 * (Phase 1 acceptance criteria §U). Not part of product navigation.
 */
export default function ComponentsDevPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 p-8">
      <h1 className="text-xl font-semibold text-text-primary">Design System — Dev Preview</h1>

      <Section title="Button">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
      </Section>

      <Section title="Input & Textarea">
        <Input placeholder="Default input" className="max-w-xs" />
        <Input placeholder="Error state" error className="max-w-xs" />
        <Input placeholder="Disabled" disabled className="max-w-xs" />
        <Textarea placeholder="Textarea" className="max-w-xs" />
      </Section>

      <Section title="Select">
        <Select>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Pick a status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="secondary">Secondary</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
          </SelectContent>
        </Select>
      </Section>

      <Section title="Badge">
        <Badge variant="neutral">Neutral</Badge>
        <Badge variant="accent">Accent</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="danger">Danger</Badge>
      </Section>

      <Section title="Progress">
        <ProgressBar value={45} label="Project progress" className="w-56" />
        <ProgressRing value={72} />
      </Section>

      <Section title="Card">
        <Card className="w-72">
          <CardHeader>
            <CardTitle>Active Project</CardTitle>
            <CardDescription>Licencia CDL + Negocio Transporte</CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressBar value={45} />
          </CardContent>
        </Card>
      </Section>

      <Section title="Skeleton">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-16 w-16 rounded-full" />
      </Section>

      <Section title="Tooltip">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="icon">
                <CircleAlert className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>This is a tooltip</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Section>

      <Section title="Empty State">
        <EmptyState
          icon={<Inbox className="h-8 w-8" />}
          title="No projects yet"
          description="Create your first project and connect it to a goal."
          action={<Button size="sm">New Project</Button>}
          className="w-full"
        />
      </Section>
    </div>
  );
}
