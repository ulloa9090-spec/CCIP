import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getGoals, getLifeAreas } from "@/features/goals/queries";
import { getProjects } from "@/features/projects/queries";
import { getNotifications } from "@/features/notifications/queries";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { evaluateAutomations } from "@/features/automations/evaluate";
import { MobileNav } from "./mobile-nav";
import { QuickAdd } from "./quick-add";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) await evaluateAutomations();

  const [lifeAreas, goals, projects, notifications] = user
    ? await Promise.all([getLifeAreas(), getGoals(), getProjects(), getNotifications()])
    : [[], [], [], []];

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background px-4">
      <MobileNav />

      <div className="flex flex-1 items-center">
        {/*
          Search is a non-functional placeholder in Phase 1 — wired to Global
          Search in Phase 8 (Phase 0 blueprint §D note on deferred wiring).
        */}
        <button
          type="button"
          disabled
          aria-label="Search (available in a later phase)"
          className="flex h-9 w-full max-w-sm items-center gap-2 rounded-(--radius-token-sm) border border-border bg-surface px-3 text-sm text-text-secondary disabled:cursor-not-allowed"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Search…
        </button>
      </div>

      <div className="flex items-center gap-2">
        <QuickAdd lifeAreas={lifeAreas} projects={projects} goals={goals} />
        {user && <NotificationBell notifications={notifications} />}
        <ThemeToggle />
        {user?.email && <UserMenu email={user.email} />}
      </div>
    </header>
  );
}
