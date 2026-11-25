"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { CategoryIcon } from "@/components/features/categories/category-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { STATUS_LABEL } from "@/lib/instances/status";
import type { CategoryRef } from "@/lib/instances/types";
import { cn } from "@/lib/utils";
import type { InstanceStatus } from "@/types/domain";

export type Filters = {
  query: string;
  categoryId: string | "all";
  status: InstanceStatus | "all";
};

export const EMPTY_FILTERS: Filters = { query: "", categoryId: "all", status: "all" };

const STATUS_OPTIONS: InstanceStatus[] = ["overdue", "due_soon", "upcoming", "paid", "skipped"];

type Props = {
  filters: Filters;
  onChange: (next: Filters) => void;
  categories: CategoryRef[];
  /** Right-aligned slot (e.g. the List / Calendar toggle). */
  trailing?: React.ReactNode;
};

export function DashboardToolbar({ filters, onChange, categories, trailing }: Props) {
  const activeCategory = categories.find((c) => c.id === filters.categoryId);
  const isFiltered =
    filters.query !== "" || filters.categoryId !== "all" || filters.status !== "all";

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-meta"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          placeholder="Search bills or payees"
          aria-label="Search bills or payees"
          className="h-9 pl-9"
        />
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <FilterButton active={filters.categoryId !== "all"}>
              {activeCategory ? (
                <>
                  <CategoryIcon icon={activeCategory.icon} color={activeCategory.color} size="sm" />
                  {activeCategory.name}
                </>
              ) : (
                "All categories"
              )}
            </FilterButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-80 w-56 overflow-y-auto rounded-xl p-1.5"
          >
            <Option
              selected={filters.categoryId === "all"}
              onSelect={() => onChange({ ...filters, categoryId: "all" })}
            >
              All categories
            </Option>
            <DropdownMenuSeparator />
            {categories.map((c) => (
              <Option
                key={c.id}
                selected={filters.categoryId === c.id}
                onSelect={() => onChange({ ...filters, categoryId: c.id })}
              >
                <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                {c.name}
              </Option>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <FilterButton active={filters.status !== "all"}>
              {filters.status === "all" ? "Any status" : STATUS_LABEL[filters.status]}
            </FilterButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44 rounded-xl p-1.5">
            <Option
              selected={filters.status === "all"}
              onSelect={() => onChange({ ...filters, status: "all" })}
            >
              Any status
            </Option>
            <DropdownMenuSeparator />
            {STATUS_OPTIONS.map((s) => (
              <Option
                key={s}
                selected={filters.status === s}
                onSelect={() => onChange({ ...filters, status: s })}
              >
                {STATUS_LABEL[s]}
              </Option>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="text-meta"
            onClick={() => onChange({ query: "", categoryId: "all", status: "all" })}
          >
            <X aria-hidden="true" />
            Clear
          </Button>
        )}
      </div>
      {trailing && <div className="sm:ml-auto">{trailing}</div>}
    </div>
  );
}

function FilterButton({
  active,
  children,
  ...props
}: React.ComponentProps<"button"> & { active: boolean }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "h-9 shadow-none",
        active && "border-primary/30 bg-accent text-accent-foreground hover:bg-accent",
      )}
      {...props}
    >
      {children}
      <ChevronDown className="size-3.5 text-meta" aria-hidden="true" />
    </Button>
  );
}

function Option({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenuItem onSelect={onSelect} className="rounded-lg">
      {children}
      {selected && <Check className="ml-auto text-primary" aria-label="Selected" />}
    </DropdownMenuItem>
  );
}
