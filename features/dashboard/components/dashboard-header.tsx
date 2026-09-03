import { getCurrentDashboardUser } from "@/features/dashboard/get-dashboard-data";

function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Real per-user greeting — pulls the authenticated user's name/email
 * server-side (never hardcoded), matching Phase 3 §10.
 */
export async function DashboardHeader() {
  const user = await getCurrentDashboardUser();
  const name = user.fullName?.trim() || user.email.split("@")[0];
  const today = new Date();

  return (
    <div className="flex flex-col gap-1 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">
          {greeting(today)}, {name}
        </h1>
        <p className="text-sm text-text-secondary">
          Focus on one thing. Do it well. Repeat.
        </p>
      </div>
      <p className="text-sm text-text-secondary">
        {today.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
    </div>
  );
}
