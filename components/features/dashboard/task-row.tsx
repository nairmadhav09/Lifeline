"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Repeat2,
  RotateCcw,
  SkipForward,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { CategoryIcon } from "@/components/features/categories/category-icon";
import { MarkPaidForm } from "@/components/features/dashboard/mark-paid-form";
import { StatusPill } from "@/components/features/dashboard/status-pill";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { MarkPaidInput } from "@/lib/actions/instances";
import { isOpen } from "@/lib/instances/status";
import type { InstanceItem } from "@/lib/instances/types";
import { daysBetween, formatShortDate, relativeDay } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export type RowActions = {
  markPaid: (item: InstanceItem, details?: Omit<MarkPaidInput, "instanceId">) => void;
  markUnpaid: (item: InstanceItem) => void;
  skip: (item: InstanceItem) => void;
  unskip: (item: InstanceItem) => void;
  edit: (item: InstanceItem) => void;
};

type Props = {
  item: InstanceItem;
  today: string;
  userId: string;
  actions: RowActions;
  selected: boolean;
  /** True when any row is selected: checkboxes stay visible. */
  selecting: boolean;
  onToggleSelect: (item: InstanceItem) => void;
};

export function TaskRow({
  item,
  today,
  userId,
  actions,
  selected,
  selecting,
  onToggleSelect,
}: Props) {
  const open = isOpen(item.status);
  const days = daysBetween(today, item.dueDate);
  const paidDate = item.paidAt ? formatShortDate(item.paidAt.slice(0, 10)) : null;
  const shownAmount = item.status === "paid" ? (item.amountPaid ?? item.amountDue) : item.amountDue;

  return (
    <div
      className={cn(
        "group relative grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3.5 sm:px-5",
        "transition-colors duration-150 ease-out hover:bg-muted/40",
        "@2xl:grid-cols-[auto_minmax(0,1fr)_9.5rem_7rem_6.5rem_auto]",
        selected && "bg-accent/50 hover:bg-accent/60",
      )}
    >
      {/* Category icon doubles as the selection checkbox (revealed on hover / when selecting). */}
      <div className="relative size-9">
        <CategoryIcon
          icon={item.category?.icon}
          color={item.category?.color}
          label={item.category?.name ?? "Uncategorized"}
          className={cn(
            "transition-opacity duration-150",
            !open && "opacity-60",
            (selecting || selected) && "opacity-0",
            "group-hover:opacity-0 group-has-[:focus-visible]:opacity-0",
          )}
        />
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-xl transition-opacity duration-150",
            selecting || selected
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 has-[:focus-visible]:opacity-100",
          )}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(item)}
            aria-label={`Select ${item.title}`}
          />
        </div>
      </div>

      {/* Title + payee */}
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => actions.edit(item)}
            className={cn(
              "truncate rounded text-left text-sm font-medium underline-offset-2 hover:underline",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              open ? "text-foreground" : "text-body",
              item.status === "skipped" && "line-through decoration-faint",
            )}
            aria-label={`Edit ${item.title}`}
          >
            {item.title}
          </button>
          {item.autopay && (
            <Badge
              variant="outline"
              className="hidden h-5 gap-1 px-1.5 text-[11px] text-meta @md:inline-flex"
            >
              <Repeat2 aria-hidden="true" />
              Autopay
            </Badge>
          )}
          {item.receiptPath && (
            <Paperclip className="size-3.5 shrink-0 text-faint" aria-label="Receipt attached" />
          )}
        </div>
        <p className="truncate text-xs text-meta">
          {item.payee ?? item.category?.name ?? "—"}
          {item.isVariable && open && " · estimated"}
        </p>
      </div>

      {/* Amount (mobile: top-right) */}
      <p
        className={cn(
          "text-right text-sm font-semibold tabular-nums @2xl:order-4",
          open ? "text-foreground" : "text-meta",
        )}
      >
        {formatMoney(shownAmount, item.currency)}
      </p>

      {/* Due date */}
      <div className="col-span-2 col-start-2 flex items-center gap-2 text-xs @2xl:order-3 @2xl:col-span-1 @2xl:col-start-auto @2xl:block">
        {item.status === "paid" && paidDate ? (
          <>
            <p className="font-medium text-body tabular-nums">Paid {paidDate}</p>
            <p className="text-meta tabular-nums @2xl:mt-0.5">
              due {formatShortDate(item.dueDate)}
            </p>
          </>
        ) : (
          <>
            <p
              className={cn(
                "font-medium tabular-nums",
                item.status === "overdue"
                  ? "text-status-overdue"
                  : item.status === "due_soon"
                    ? "text-status-due-soon"
                    : "text-body",
              )}
            >
              {open ? relativeDay(days) : "Skipped"}
            </p>
            <p className="text-meta tabular-nums @2xl:mt-0.5">{formatShortDate(item.dueDate)}</p>
          </>
        )}
        <StatusPill status={item.status} className="ml-auto @2xl:hidden" />
      </div>

      {/* Status (desktop) */}
      <div className="hidden @2xl:order-5 @2xl:block">
        <StatusPill status={item.status} />
      </div>

      {/* Actions */}
      <div className="col-span-3 flex items-center justify-end gap-1 @2xl:order-6 @2xl:col-span-1">
        {open ? (
          <MarkPaidControl item={item} today={today} userId={userId} actions={actions} />
        ) : (
          <PaidCheck status={item.status} />
        )}
        <RowMenu item={item} actions={actions} />
      </div>
    </div>
  );
}

function MarkPaidControl({
  item,
  today,
  userId,
  actions,
}: Pick<Props, "item" | "today" | "userId" | "actions">) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="flex items-center rounded-xl border border-input bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => actions.markPaid(item)}
        className="rounded-r-none border-r border-input text-foreground hover:bg-status-paid-bg hover:text-status-paid"
        aria-label={`Mark ${item.title} paid, ${formatMoney(item.amountDue, item.currency)}`}
      >
        <Check aria-hidden="true" />
        Mark paid
      </Button>
      <Popover open={detailsOpen} onOpenChange={setDetailsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="w-7 rounded-l-none text-meta"
            aria-label={`Enter payment details for ${item.title}`}
          >
            <ChevronDown className="size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} className="w-80 rounded-2xl p-4 shadow-pop">
          <MarkPaidForm
            item={item}
            userId={userId}
            today={today}
            onCancel={() => setDetailsOpen(false)}
            onSubmit={(details) => {
              setDetailsOpen(false);
              actions.markPaid(item, details);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Satisfying check that draws itself when an item becomes paid. */
function PaidCheck({ status }: { status: InstanceItem["status"] }) {
  return (
    <AnimatePresence initial={false}>
      {status === "paid" ? (
        <motion.span
          key="paid"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 26 }}
          className="inline-flex size-8 items-center justify-center rounded-full bg-status-paid-bg text-status-paid"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none">
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.08, ease: "easeOut" }}
            />
          </svg>
        </motion.span>
      ) : (
        <span
          className="inline-flex size-8 items-center justify-center rounded-full bg-status-skipped-bg text-status-skipped"
          aria-hidden="true"
        >
          <SkipForward className="size-3.5" />
        </span>
      )}
    </AnimatePresence>
  );
}

function RowMenu({ item, actions }: { item: InstanceItem; actions: RowActions }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`More actions for ${item.title}`}
          className="text-meta opacity-100 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 md:opacity-0"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5">
        <DropdownMenuItem className="rounded-lg" onSelect={() => actions.edit(item)}>
          <Pencil aria-hidden="true" />
          Edit bill
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {item.status === "paid" && (
          <DropdownMenuItem className="rounded-lg" onSelect={() => actions.markUnpaid(item)}>
            <Undo2 aria-hidden="true" />
            Mark as unpaid
          </DropdownMenuItem>
        )}
        {item.status === "skipped" && (
          <DropdownMenuItem className="rounded-lg" onSelect={() => actions.unskip(item)}>
            <RotateCcw aria-hidden="true" />
            Restore
          </DropdownMenuItem>
        )}
        {isOpen(item.status) && (
          <DropdownMenuItem className="rounded-lg" onSelect={() => actions.skip(item)}>
            <SkipForward aria-hidden="true" />
            Skip this month
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
