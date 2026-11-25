"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Search,
  SearchX,
  Tag,
  X,
} from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/features/categories/category-icon";
import { StatusPill } from "@/components/features/dashboard/status-pill";
import { AddTaskButton, useTaskSheet } from "@/components/features/tasks/task-sheet-provider";
import { EmptyState } from "@/components/shared/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { archiveTasks, restoreTasks, setTasksCategory } from "@/lib/actions/tasks";
import type { TaskListItem } from "@/lib/data/tasks";
import type { CategoryRef } from "@/lib/instances/types";
import { describeSchedule, upcomingDueDates } from "@/lib/tasks/schedule";
import { daysBetween, formatShortDate, relativeDay } from "@/lib/utils/dates";
import { formatMoney, formatMoneyShort, pluralize } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/types/domain";

type Props = {
  tasks: TaskListItem[];
  categories: CategoryRef[];
  currency: string;
  today: string;
};

type Tab = "active" | "archived";
type Patch = { ids: string[]; patch: Partial<Pick<TaskListItem, "isArchived" | "category">> };

const PER_MONTH: Record<TaskListItem["schedule"]["recurrence"], number> = {
  monthly: 1,
  quarterly: 1 / 3,
  half_yearly: 1 / 6,
  yearly: 1 / 12,
  one_time: 0,
};

export function TasksView({ tasks, categories, currency, today }: Props) {
  const [items, addOptimistic] = useOptimistic<TaskListItem[], Patch>(
    tasks,
    (state, { ids, patch }) => {
      const set = new Set(ids);
      return state.map((t) => (set.has(t.id) ? { ...t, ...patch } : t));
    },
  );
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("active");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const { openEdit } = useTaskSheet();

  const active = items.filter((t) => !t.isArchived);
  const archived = items.filter((t) => t.isArchived);
  const monthly = active.reduce((s, t) => s + t.amount * PER_MONTH[t.schedule.recurrence], 0);

  const q = query.trim().toLowerCase();
  const visible = (tab === "active" ? active : archived).filter(
    (t) => !q || `${t.title} ${t.payee ?? ""} ${t.category?.name ?? ""}`.toLowerCase().includes(q),
  );

  const selectedVisible = visible.filter((t) => selected.has(t.id));
  const allState =
    selectedVisible.length === 0
      ? false
      : selectedVisible.length === visible.length
        ? true
        : "indeterminate";

  const mutate = (
    patch: Patch,
    run: () => Promise<ActionResult<unknown>>,
    success: string,
    undo?: () => void,
  ) => {
    const toastId = toast.success(
      success,
      undo ? { action: { label: "Undo", onClick: undo } } : undefined,
    );
    startTransition(async () => {
      addOptimistic(patch);
      const res = await run();
      if (!res.ok) {
        toast.dismiss(toastId);
        toast.error(res.error);
      }
    });
  };

  const archive = (ids: string[]) => {
    const n = pluralize(ids.length, "bill");
    setSelected(new Set());
    mutate(
      { ids, patch: { isArchived: true } },
      () => archiveTasks(ids),
      `${n} archived`,
      () => restore(ids, false),
    );
  };
  const restore = (ids: string[], withUndo = true) => {
    const n = pluralize(ids.length, "bill");
    setSelected(new Set());
    mutate(
      { ids, patch: { isArchived: false } },
      () => restoreTasks(ids),
      `${n} restored`,
      withUndo ? () => archive(ids) : undefined,
    );
  };
  const moveTo = (ids: string[], categoryId: string | null) => {
    const category = categories.find((c) => c.id === categoryId) ?? null;
    setSelected(new Set());
    mutate(
      { ids, patch: { category } },
      () => setTasksCategory(ids, categoryId),
      `Moved ${pluralize(ids.length, "bill")} to ${category?.name ?? "Uncategorized"}`,
    );
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No bills yet"
        description="Add your first bill and Lifeline will track every future due date for you."
        action={<AddTaskButton label="Add your first bill" />}
      />
    );
  }

  return (
    <>
      <p className="-mt-3 mb-6 text-sm text-body tabular-nums">
        {pluralize(active.length, "active bill")} · about{" "}
        <span className="font-medium text-foreground">
          {formatMoneyShort(Math.round(monthly), currency)}
        </span>{" "}
        a month on average
      </p>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div
          role="tablist"
          aria-label="Bill status"
          className="inline-flex rounded-xl bg-muted p-1"
        >
          {(
            [
              ["active", `Active`, active.length],
              ["archived", `Archived`, archived.length],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={tab === key}
              onClick={() => {
                setTab(key);
                setSelected(new Set());
              }}
              className={cn(
                "h-8 rounded-lg px-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ease-out",
                "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none",
                tab === key
                  ? "bg-card text-foreground shadow-card"
                  : "text-meta hover:text-foreground",
              )}
            >
              {label} <span className="ml-0.5 text-xs text-meta tabular-nums">{count}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-meta"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bills or payees"
            aria-label="Search bills or payees"
            className="h-9 pl-9"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={tab === "archived" && !query ? Archive : SearchX}
          title={tab === "archived" && !query ? "Nothing archived" : "No bills match"}
          description={
            tab === "archived" && !query
              ? "Bills you archive appear here with their payment history intact."
              : "Try a different search."
          }
        />
      ) : (
        <div className="@container overflow-hidden surface">
          <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2.5 text-xs font-medium text-meta sm:px-5">
            <Checkbox
              checked={allState}
              onCheckedChange={() =>
                setSelected(allState === true ? new Set() : new Set(visible.map((t) => t.id)))
              }
              aria-label="Select all bills"
            />
            <span className="flex-1">Bill</span>
            <span className="hidden w-44 @2xl:block">Next due</span>
            <span className="text-right @md:w-28">Amount</span>
            <span className="w-8" aria-hidden="true" />
          </div>
          <ul className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {visible.map((t) => (
                <motion.li
                  key={t.id}
                  layout="position"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <TaskListRow
                    task={t}
                    today={today}
                    selected={selected.has(t.id)}
                    onToggle={() => toggle(t.id)}
                    onEdit={() => openEdit(t.id)}
                    onArchive={() => setConfirmIds([t.id])}
                    onRestore={() => restore([t.id])}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}

      {/* Bulk bar */}
      <AnimatePresence>
        {selectedVisible.length > 0 && (
          <motion.div
            role="toolbar"
            aria-label={`${selectedVisible.length} selected`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-x-4 bottom-20 z-40 mx-auto flex max-w-md items-center gap-1 rounded-2xl border bg-card/95 p-1.5 pl-4 shadow-pop backdrop-blur-xl md:bottom-6"
          >
            <p className="mr-auto text-sm font-semibold text-foreground tabular-nums">
              {selectedVisible.length} selected
            </p>
            {tab === "active" ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Tag aria-hidden="true" />
                      Category
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
                        onSelect={() =>
                          moveTo(
                            selectedVisible.map((t) => t.id),
                            c.id,
                          )
                        }
                      >
                        <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                        {c.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="rounded-lg"
                      onSelect={() =>
                        moveTo(
                          selectedVisible.map((t) => t.id),
                          null,
                        )
                      }
                    >
                      <CategoryIcon icon="circle-ellipsis" color="slate" size="sm" />
                      Uncategorized
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmIds(selectedVisible.map((t) => t.id))}
                >
                  <Archive aria-hidden="true" />
                  Archive
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => restore(selectedVisible.map((t) => t.id))}>
                <ArchiveRestore aria-hidden="true" />
                Restore
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSelected(new Set())}
              aria-label="Clear selection"
              className="text-meta"
            >
              <X />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={confirmIds !== null} onOpenChange={(o) => !o && setConfirmIds(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmIds?.length === 1
                ? `Archive ${items.find((t) => t.id === confirmIds[0])?.title ?? "this bill"}?`
                : `Archive ${pluralize(confirmIds?.length ?? 0, "bill")}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Archived bills stop appearing on your dashboard and their unpaid bills are removed.
              Payment history is kept, and you can restore them anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmIds) archive(confirmIds);
                setConfirmIds(null);
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TaskListRow({
  task,
  today,
  selected,
  onToggle,
  onEdit,
  onArchive,
  onRestore,
}: {
  task: TaskListItem;
  today: string;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const per =
    task.schedule.recurrence === "monthly"
      ? "/mo"
      : task.schedule.recurrence === "yearly"
        ? "/yr"
        : "";
  // Instances only exist ~2 months ahead; for quarterly/yearly bills fall back
  // to the schedule itself so "next due" is never wrongly blank.
  const nextDate = task.next?.dueDate ?? upcomingDueDates(task.schedule, today, 1)[0] ?? null;
  const overdue = task.next?.status === "overdue";
  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 ease-out hover:bg-muted/40 sm:px-5",
        selected && "bg-accent/50 hover:bg-accent/60",
        task.isArchived && "opacity-75",
      )}
    >
      <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Select ${task.title}`} />
      <CategoryIcon
        icon={task.category?.icon}
        color={task.category?.color}
        label={task.category?.name ?? "Uncategorized"}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="line-clamp-2 rounded text-left text-sm font-medium [overflow-wrap:anywhere] text-foreground underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {task.title}
          </button>
          {task.autopay && (
            <Badge
              variant="outline"
              className="hidden h-5 shrink-0 gap-1 px-1.5 text-[11px] text-meta @xl:inline-flex"
            >
              <Repeat2 aria-hidden="true" />
              Autopay
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-meta">
          {describeSchedule(task.schedule)}
          {task.payee && ` · ${task.payee}`}
        </p>
        {/* Narrow lists: next due moves under the name. */}
        {!task.isArchived && nextDate && (
          <p
            className={cn(
              "text-xs tabular-nums @2xl:hidden",
              overdue ? "text-status-overdue" : "text-body",
            )}
          >
            {overdue ? "Overdue" : "Next"} · {formatShortDate(nextDate)}
          </p>
        )}
      </div>
      <div className="hidden w-44 text-xs @2xl:block">
        {task.isArchived ? (
          <span className="text-meta">Archived</span>
        ) : nextDate ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-body tabular-nums">
              {formatShortDate(nextDate)}
              <span className="text-meta">
                {" "}
                · {relativeDay(daysBetween(today, nextDate)).toLowerCase()}
              </span>
            </span>
            {overdue && <StatusPill status="overdue" />}
          </div>
        ) : (
          <span className="text-meta">No upcoming dates</span>
        )}
      </div>
      <p className="shrink-0 text-right text-sm font-semibold text-foreground tabular-nums @md:w-28">
        {formatMoney(task.amount, task.currency)}
        <span className="text-xs font-normal text-meta">{per}</span>
        {task.isVariable && <span className="block text-[11px] font-normal text-meta">varies</span>}
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`More actions for ${task.title}`}
            className="text-meta transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 md:opacity-0"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 rounded-xl p-1.5">
          <DropdownMenuItem className="rounded-lg" onSelect={onEdit}>
            <Pencil aria-hidden="true" />
            Edit bill
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {task.isArchived ? (
            <DropdownMenuItem className="rounded-lg" onSelect={onRestore}>
              <ArchiveRestore aria-hidden="true" />
              Restore
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem className="rounded-lg" onSelect={onArchive}>
              <Archive aria-hidden="true" />
              Archive…
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
