"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, UserRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { primaryNavItems } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="h-6 w-6 rounded-full bg-accent" aria-hidden="true" />
        <span className="text-sm font-semibold text-text-primary">Atlas OS</span>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-2">
        <ul className="flex flex-col gap-0.5">
          {primaryNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-(--radius-token-sm) px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    isActive
                      ? "bg-accent/15 text-accent"
                      : "text-text-secondary hover:bg-surface-raised hover:text-text-primary",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border px-2 py-2">
        <ul className="flex flex-col gap-0.5">
          <li>
            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-(--radius-token-sm) px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
              Settings
            </Link>
          </li>
          <li>
            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-(--radius-token-sm) px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
              Profile
            </Link>
          </li>
        </ul>
      </div>
    </aside>
  );
}
