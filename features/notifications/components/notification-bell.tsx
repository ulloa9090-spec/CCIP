"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markAllNotificationsRead, markNotificationRead } from "@/features/notifications/actions";
import type { Notification } from "@/features/notifications/types";
import { cn } from "@/lib/utils/cn";

export function NotificationBell({ notifications: initial }: { notifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initial);
  const unreadCount = notifications.filter((n) => n.readAt === null).length;

  function handleOpen(n: Notification) {
    if (n.readAt) return;
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    markNotificationRead(n.id);
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
    markAllNotificationsRead();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" aria-hidden="true" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button type="button" onClick={handleMarkAllRead} className="text-xs font-medium text-accent hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-3 text-sm text-text-secondary">You&apos;re all caught up.</p>
        ) : (
          <div className="flex max-h-96 flex-col overflow-y-auto">
            {notifications.map((n) => {
              const content = (
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    {!n.readAt && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />}
                    <span className={cn("text-sm", n.readAt ? "text-text-secondary" : "font-medium text-text-primary")}>
                      {n.title}
                    </span>
                  </div>
                  {n.body && <p className="text-xs text-text-secondary">{n.body}</p>}
                </div>
              );
              return n.link ? (
                <DropdownMenuItem key={n.id} asChild onSelect={() => handleOpen(n)}>
                  <Link href={n.link}>{content}</Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem key={n.id} onSelect={() => handleOpen(n)}>
                  {content}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
