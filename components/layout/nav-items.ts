import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Calendar,
  CheckSquare,
  ClipboardList,
  Flag,
  FolderKanban,
  Home,
  Lightbulb,
  Repeat,
  Sparkles,
  Sunrise,
  Target,
  Timer,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Primary navigation, order matches Phase 0 blueprint §D. */
export const primaryNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Today", href: "/today", icon: Sunrise },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "90-Day Plan", href: "/plan-90-days", icon: Flag },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Habits", href: "/habits", icon: Repeat },
  { label: "Focus", href: "/focus", icon: Timer },
  { label: "Journal", href: "/journal", icon: BookOpen },
  { label: "Ideas", href: "/ideas", icon: Lightbulb },
  { label: "Reviews", href: "/reviews", icon: ClipboardList },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "AI Coach", href: "/ai-coach", icon: Sparkles },
];
