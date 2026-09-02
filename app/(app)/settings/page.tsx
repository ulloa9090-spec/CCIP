import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

const settingsGroups = [
  { title: "Profile", description: "Name and account details." },
  { title: "Timezone & Week Start", description: "Used for streaks, daily/weekly boundaries." },
  { title: "Working Hours", description: "Shapes suggested time-block slots." },
  { title: "Theme", description: "Dark or light — toggle from the header for now." },
  { title: "Notification Preferences", description: "Critical, actionable, informational, silent." },
  { title: "AI Provider", description: "Choose the assistant backing AI Coach (Phase 10)." },
  { title: "Privacy", description: "Control what Atlas OS is allowed to use as AI context." },
  { title: "Data Export", description: "JSON/CSV/PDF export and full backup (Phase 12)." },
  { title: "Archived Content", description: "Everything you've archived instead of deleted." },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Settings" description="Account and workspace preferences." />
      <div className="grid gap-4 p-6 sm:grid-cols-2">
        {settingsGroups.map((group) => (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle>{group.title}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-text-secondary">
                Available once accounts are connected in Phase 2.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
