"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { NAV_ITEMS, isActivePath, type NavItem } from "@/components/layout/nav-config";
import type { ShellUser } from "@/components/layout/types";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  user: ShellUser;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function Sidebar({ user, collapsed, onToggleCollapsed }: Props) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Primary"
      data-collapsed={collapsed}
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar backdrop-blur-xl md:flex",
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-[72px]" : "w-[248px]",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center",
          collapsed ? "justify-center px-0" : "justify-between pr-3 pl-5",
        )}
      >
        <Link
          href="/dashboard"
          className="rounded-lg focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
          aria-label="Lifeline home"
        >
          <Logo collapsed={collapsed} />
        </Link>
        {!collapsed && <CollapseButton collapsed={collapsed} onClick={onToggleCollapsed} />}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pt-2" aria-label="Main navigation">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <SidebarLink
                item={item}
                active={isActivePath(pathname, item.href)}
                collapsed={collapsed}
              />
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-col gap-1 border-t border-sidebar-border p-3">
        {collapsed && <CollapseButton collapsed={collapsed} onClick={onToggleCollapsed} />}
        <UserMenu user={user} collapsed={collapsed} />
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-xl text-sm font-medium",
        "transition-colors duration-150 ease-out",
        "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none",
        collapsed ? "justify-center px-0" : "px-3",
        active
          ? "bg-accent text-accent-foreground"
          : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute top-1/2 -left-3 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-gradient"
        />
      )}
      <Icon
        aria-hidden="true"
        className={cn(
          "size-[18px] shrink-0 transition-colors duration-150",
          active ? "text-primary" : "text-meta group-hover:text-foreground",
        )}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

function CollapseButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClick}
          aria-label={label}
          aria-expanded={!collapsed}
          className={cn("text-meta", collapsed && "mx-auto")}
        >
          <Icon className="size-[18px]" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
