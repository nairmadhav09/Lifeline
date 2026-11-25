"use client";

import { Check, ChevronsUpDown, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useTransition } from "react";
import { signOut } from "@/app/(auth)/actions";
import type { ShellUser } from "@/components/layout/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, initials } from "@/lib/utils";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function UserAvatar({ user, className }: { user: ShellUser; className?: string }) {
  return (
    <Avatar className={cn("size-8 ring-1 ring-border", className)}>
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
      <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
        {initials(user.name)}
      </AvatarFallback>
    </Avatar>
  );
}

export function UserMenu({
  user,
  collapsed = false,
  compact = false,
}: {
  user: ShellUser;
  collapsed?: boolean;
  /** Avatar-only trigger, used in the mobile top bar. */
  compact?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const [pending, startTransition] = useTransition();
  const iconOnly = collapsed || compact;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${user.name}`}
        className={cn(
          "flex items-center gap-2.5 rounded-xl text-left transition-colors duration-150 ease-out",
          "hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none data-[state=open]:bg-muted",
          iconOnly ? "justify-center p-1" : "w-full p-2",
        )}
      >
        <UserAvatar user={user} />
        {!iconOnly && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-foreground">
                {user.name}
              </span>
              <span className="block truncate text-xs text-meta">{user.email}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-meta" aria-hidden="true" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={compact ? "bottom" : "top"}
        align={compact ? "end" : "start"}
        sideOffset={8}
        className="w-60 rounded-xl p-1.5 shadow-pop"
      >
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-[13px] font-medium text-foreground">
            {user.name}
          </span>
          <span className="block truncate text-xs text-meta">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="rounded-lg">
          <Link href="/settings">
            <Settings aria-hidden="true" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-meta">Theme</DropdownMenuLabel>
        {THEMES.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            className="rounded-lg"
            onSelect={(e) => {
              e.preventDefault();
              setTheme(value);
            }}
          >
            <Icon aria-hidden="true" />
            {label}
            {theme === value && <Check className="ml-auto text-primary" aria-label="Selected" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="rounded-lg"
          disabled={pending}
          onSelect={() => startTransition(() => signOut())}
        >
          <LogOut aria-hidden="true" />
          {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
