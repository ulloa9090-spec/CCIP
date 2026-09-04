import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/lib/supabase/server";
import { AiProviderForm } from "@/features/settings/components/ai-provider-form";
import { getAutomations } from "@/features/automations/queries";
import {
  AutomationListItem,
  NewTaskOverdueAutomationModal,
  NewWeeklyScheduleAutomationModal,
} from "@/features/automations/components";
import { DataExportPanel } from "@/features/export/components/data-export-panel";

const otherGroups = [
  { title: "Working Hours", description: "Shapes suggested time-block slots." },
  { title: "Theme", description: "Dark or light — toggle from the header for now." },
  { title: "Notification Preferences", description: "Critical, actionable, informational, silent." },
  { title: "Privacy", description: "Control what Atlas OS is allowed to use as AI context." },
  { title: "Archived Content", description: "Everything you've archived instead of deleted." },
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, timezone, week_start_day, theme")
        .eq("user_id", user.id)
        .single()
    : { data: null };

  const { data: settings } = user
    ? await supabase.from("settings").select("ai_provider").eq("user_id", user.id).single()
    : { data: null };

  const automations = user ? await getAutomations() : [];

  return (
    <div className="flex flex-col">
      <PageHeader title="Settings" description="Account and workspace preferences." />
      <div className="grid gap-4 p-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Name and account details.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm text-text-secondary">
            <p>
              <span className="text-text-primary">Email:</span> {user?.email ?? "—"}
            </p>
            <p>
              <span className="text-text-primary">Full name:</span>{" "}
              {profile?.full_name ?? "Not set"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timezone &amp; Week Start</CardTitle>
            <CardDescription>Used for streaks, daily/weekly boundaries.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm text-text-secondary">
            <p>
              <span className="text-text-primary">Timezone:</span> {profile?.timezone ?? "UTC"}
            </p>
            <p>
              <span className="text-text-primary">Week starts:</span>{" "}
              {profile?.week_start_day === 0 ? "Sunday" : "Monday"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Provider</CardTitle>
            <CardDescription>Choose the assistant backing AI Coach.</CardDescription>
          </CardHeader>
          <CardContent>
            <AiProviderForm currentProvider={settings?.ai_provider ?? null} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Export</CardTitle>
            <CardDescription>JSON export and CSV export — includes a full backup of your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataExportPanel />
          </CardContent>
        </Card>

        {otherGroups.map((group) => (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle>{group.title}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-text-secondary">Editable in a later phase.</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="px-6 pb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Automations</CardTitle>
              <CardDescription>Trigger → Condition → Action — checked whenever you load a page, never a background job.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <NewTaskOverdueAutomationModal />
              <NewWeeklyScheduleAutomationModal />
            </div>
          </CardHeader>
          <CardContent>
            {automations.length === 0 ? (
              <EmptyState
                title="No automations yet"
                description="Get notified when a task goes overdue, or on a weekly schedule."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {automations.map((a) => (
                  <AutomationListItem key={a.id} automation={a} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
