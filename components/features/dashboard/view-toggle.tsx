"use client";

import { CalendarDays, List } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "list" | "calendar";

const OPTIONS: { value: Mode; label: string; icon: typeof List }[] = [
  { value: "list", label: "List", icon: List },
  { value: "calendar", label: "Calendar", icon: CalendarDays },
];

export function ViewToggle({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  return (
    <div role="radiogroup" aria-label="View" className="inline-flex rounded-xl bg-muted p-1">
      {OPTIONS.map(({ value: v, label, icon: Icon }) => {
        const selected = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(v)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium",
              "transition-[background-color,color,box-shadow] duration-150 ease-out",
              "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none",
              selected ? "bg-card text-foreground shadow-card" : "text-meta hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
