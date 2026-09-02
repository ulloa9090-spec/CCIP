import { Bell, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";
import { QuickAdd } from "./quick-add";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
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
        <QuickAdd />
        <Button
          variant="ghost"
          size="icon"
          disabled
          aria-label="Notifications (available in a later phase)"
        >
          <Bell className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Profile">
          <UserRound className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
