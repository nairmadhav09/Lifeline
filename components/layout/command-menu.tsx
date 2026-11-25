"use client";

import { Moon, Plus, Sun } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useTaskSheet } from "@/components/features/tasks/task-sheet-provider";
import { NAV_ITEMS } from "@/components/layout/nav-config";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Global ⌘K / Ctrl+K palette.
 * Typing something that matches nothing offers to add it as a new bill.
 */
export function CommandMenu({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { openCreate } = useTaskSheet();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const run = (fn: () => void) => {
    onOpenChange(false);
    setQuery("");
    fn();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search or add a task"
      description="Jump to a page, or describe a bill to add it."
    >
      <CommandInput
        placeholder="Search pages and actions…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          <button
            type="button"
            onClick={() => run(() => openCreate({ title: query.trim().slice(0, 120) }))}
            className="mx-auto flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Plus className="size-4 text-meta" aria-hidden="true" />
            Add &ldquo;{query.trim()}&rdquo; as a new bill
          </button>
        </CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem value="add new bill task create" onSelect={() => run(() => openCreate())}>
            <Plus className="text-meta" aria-hidden="true" />
            Add a bill
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Go to">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={`go ${item.label}`}
                onSelect={() => run(() => router.push(item.href as Route))}
              >
                <Icon className="text-meta" aria-hidden="true" />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading="Preferences">
          <CommandItem
            value="toggle theme dark light mode"
            onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}
          >
            {resolvedTheme === "dark" ? (
              <Sun className="text-meta" aria-hidden="true" />
            ) : (
              <Moon className="text-meta" aria-hidden="true" />
            )}
            Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode
          </CommandItem>
        </CommandGroup>
      </CommandList>
      <div
        className="flex items-center gap-4 border-t bg-muted/40 px-4 py-2.5 text-xs text-meta"
        aria-hidden="true"
      >
        <span>
          <Kbd>↑</Kbd> <Kbd>↓</Kbd> to move
        </span>
        <span>
          <Kbd>↵</Kbd> to select
        </span>
        <span>
          <Kbd>esc</Kbd> to close
        </span>
      </div>
    </CommandDialog>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-card px-1 font-sans text-[10px] font-medium">
      {children}
    </kbd>
  );
}
