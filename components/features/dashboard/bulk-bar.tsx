"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, SkipForward, Tag, X } from "lucide-react";
import { CategoryIcon } from "@/components/features/categories/category-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CategoryRef } from "@/lib/instances/types";
import { formatMoney } from "@/lib/utils/format";

type Props = {
  count: number;
  openCount: number;
  total: number;
  currency: string;
  categories: CategoryRef[];
  onMarkPaid: () => void;
  onSkip: () => void;
  onSetCategory: (categoryId: string | null) => void;
  onClear: () => void;
};

/** Floating action bar shown while rows are selected. */
export function BulkBar({
  count,
  openCount,
  total,
  currency,
  categories,
  onMarkPaid,
  onSkip,
  onSetCategory,
  onClear,
}: Props) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          role="toolbar"
          aria-label={`${count} selected`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="fixed inset-x-4 bottom-20 z-40 mx-auto flex max-w-xl items-center gap-1 rounded-2xl border bg-card/95 p-1.5 pl-4 shadow-pop backdrop-blur-xl md:bottom-6"
        >
          <p className="mr-auto min-w-0 truncate text-sm">
            <span className="font-semibold text-foreground tabular-nums">{count} selected</span>
            <span className="hidden text-meta tabular-nums sm:inline">
              {" "}
              · {formatMoney(total, currency)}
            </span>
          </p>

          <Button size="sm" onClick={onMarkPaid} disabled={openCount === 0}>
            <Check aria-hidden="true" />
            <span className="hidden sm:inline">Mark paid</span>
            <span className="sr-only sm:hidden">Mark paid</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onSkip} disabled={openCount === 0}>
            <SkipForward aria-hidden="true" />
            <span className="hidden sm:inline">Skip</span>
            <span className="sr-only sm:hidden">Skip</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Tag aria-hidden="true" />
                <span className="hidden sm:inline">Category</span>
                <span className="sr-only sm:hidden">Change category</span>
                <ChevronDown className="size-3.5 text-meta" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              className="max-h-80 w-56 overflow-y-auto rounded-xl p-1.5"
            >
              <DropdownMenuLabel className="text-xs font-medium text-meta">
                Move to
              </DropdownMenuLabel>
              {categories.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  className="rounded-lg"
                  onSelect={() => onSetCategory(c.id)}
                >
                  <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                  {c.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-lg" onSelect={() => onSetCategory(null)}>
                <CategoryIcon icon="circle-ellipsis" color="slate" size="sm" />
                Uncategorized
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClear}
            aria-label="Clear selection"
            className="text-meta"
          >
            <X />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
