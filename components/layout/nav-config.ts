import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  ListChecks,
  Settings,
  Sparkles,
} from "lucide-react";
import type { Route } from "next";

/** Cookie that remembers the collapsed sidebar so SSR renders the right width. */
export const SIDEBAR_COOKIE = "lifeline_sidebar_collapsed";

export type NavItem = {
  href: Route;
  label: string;
  /** Shorter label for the mobile tab bar. */
  shortLabel?: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/documents", label: "Documents", shortLabel: "Docs", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
