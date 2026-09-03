import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/lib/supabase/server";

const otherGroups = [
  { title: "Working Hours", description: "Shapes suggested time-block slots." },
  { title: "Theme", description: "Dark or light — toggle from the header for now." },
  { title: "Notification Preferences", description: "Critical, actionable, informational, silent." },
  { title: "AI Provider", description: "Choose the assistant backing AI Coach (Phase 10)." },
  { title: "Privacy", description: "Control what Atlas OS is allowed to use as AI context." },
  { title: "Data Export", description: "JSON/CSV/PDF export and full backup (Phase 12)." },
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
    </div>
  );
}
