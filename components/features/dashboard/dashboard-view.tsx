"use client";

import { SearchX } from "lucide-react";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarPanel } from "@/components/features/calendar/calendar-panel";
import { CategoryBreakdown } from "@/components/features/charts/category-breakdown";
import { MonthlyTrendChart } from "@/components/features/charts/monthly-trend-chart";
import { BulkBar } from "@/components/features/dashboard/bulk-bar";
import { ViewToggle } from "@/components/features/dashboard/view-toggle";
import {
  DashboardToolbar,
  EMPTY_FILTERS,
  type Filters,
} from "@/components/features/dashboard/dashboard-toolbar";
import { InsightBanner } from "@/components/features/dashboard/insight-banner";
import { KpiCards } from "@/components/features/dashboard/kpi-cards";
import { TaskList } from "@/components/features/dashboard/task-list";
import type { RowActions } from "@/components/features/dashboard/task-row";
import { useTaskSheet } from "@/components/features/tasks/task-sheet-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  bulkMarkPaid,
  bulkMarkUnpaid,
  bulkSkip,
  bulkUnskip,
  markPaid as markPaidAction,
  markUnpaid as markUnpaidAction,
  skipInstance,
  unskipInstance,
} from "@/lib/actions/instances";
import { setTasksCategory } from "@/lib/actions/tasks";
import type { DashboardData } from "@/lib/data/dashboard";
import type { Anomaly } from "@/lib/data/anomalies";
import type { MonthTotal } from "@/lib/data/trend";
import { deriveOpenStatus, isOpen } from "@/lib/instances/status";
import type { InstanceItem, InstancePatch } from "@/lib/instances/types";
import { pluralize } from "@/lib/utils/format";
import type { ActionResult } from "@/types/domain";

type Props = {
  data: DashboardData;
  today: string;
  currency: string;
  userId: string;
  period: string;
  /** Six months of totals ending at `period` (dashboard variant only). */
  trend?: MonthTotal[];
  /** Rule-based unusual bills for the viewed month. */
  anomalies?: Anomaly[];
  monthlyBudget?: number | null;
  /** "calendar" = the standalone Calendar page: no KPIs/charts, calendar only. */
  variant?: "dashboard" | "calendar";
};

type Mode = "list" | "calendar";

type View = Pick<DashboardData, "month" | "nextWeek" | "nextDue">;
/** Patch keyed by instance id, or (for category changes) by task id. */
type Patch = { ids?: string[]; taskIds?: string[]; patch: InstancePatch };

function applyPatch(view: View, { ids, taskIds, patch }: Patch): View {
  const idSet = new Set(ids);
  const taskSet = new Set(taskIds);
  const update = (i: InstanceItem) =>
    idSet.has(i.id) || taskSet.has(i.taskId) ? { ...i, ...patch } : i;
  return {
    month: view.month.map(update),
    nextWeek: view.nextWeek.map(update),
    nextDue: view.nextDue ? update(view.nextDue) : null,
  };
}

export function DashboardView({
  data,
  today,
  currency,
  userId,
  period,
  trend = [],
  anomalies = [],
  monthlyBudget = null,
  variant = "dashboard",
}: Props) {
  const [mode, setMode] = useState<Mode>(variant === "calendar" ? "calendar" : "list");
  const [view, addOptimistic] = useOptimistic<View, Patch | Patch[]>(
    { month: data.month, nextWeek: data.nextWeek, nextDue: data.nextDue },
    (state, p) => (Array.isArray(p) ? p.reduce(applyPatch, state) : applyPatch(state, p)),
  );
  const [, startTransition] = useTransition();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const { openEdit } = useTaskSheet();

  /**
   * Optimistic mutation: patch the UI now, run the server action, and let
   * React drop the optimistic layer when fresh server data arrives (or roll
   * back automatically if the action fails).
   */
  const mutate = (
    patches: Patch | Patch[],
    run: () => Promise<ActionResult<unknown>>,
    success?: { message: string; undo?: () => void },
  ) => {
    const toastId = success
      ? toast.success(success.message, {
          action: success.undo ? { label: "Undo", onClick: success.undo } : undefined,
        })
      : undefined;
    startTransition(async () => {
      addOptimistic(patches);
      const res = await run();
      if (!res.ok) {
        if (toastId !== undefined) toast.dismiss(toastId);
        toast.error(res.error);
      }
    });
  };

  const reopenPatch = (item: InstanceItem): Patch => ({
    ids: [item.id],
    patch: {
      status: deriveOpenStatus(item.dueDate, today),
      amountPaid: null,
      paidAt: null,
      confirmationNumber: null,
      receiptPath: null,
    },
  });

  // ---------- Single-row actions ----------
  const actions: RowActions = {
    markPaid: (item, details) =>
      mutate(
        {
          ids: [item.id],
          patch: {
            status: "paid",
            amountPaid: details?.amountPaid ?? item.amountDue,
            paidAt: details?.paidOn ? `${details.paidOn}T12:00:00.000Z` : new Date().toISOString(),
            confirmationNumber: details?.confirmationNumber ?? null,
            receiptPath: details?.receipt?.path ?? item.receiptPath,
          },
        },
        () => markPaidAction({ instanceId: item.id, ...details }),
        { message: `${item.title} marked paid`, undo: () => actions.markUnpaid(item) },
      ),
    markUnpaid: (item) =>
      mutate(reopenPatch(item), () => markUnpaidAction(item.id), {
        message: `${item.title} marked unpaid`,
      }),
    skip: (item) =>
      mutate({ ids: [item.id], patch: { status: "skipped" } }, () => skipInstance(item.id), {
        message: `${item.title} skipped this month`,
        undo: () => actions.unskip(item),
      }),
    unskip: (item) =>
      mutate(
        { ids: [item.id], patch: { status: deriveOpenStatus(item.dueDate, today) } },
        () => unskipInstance(item.id),
        { message: `${item.title} restored` },
      ),
    edit: (item) => openEdit(item.taskId),
  };

  // ---------- Selection & bulk actions ----------
  const selectedItems = view.month.filter((i) => selected.has(i.id));
  const selectedOpen = selectedItems.filter((i) => isOpen(i.status));
  const clearSelection = () => setSelected(new Set());

  const toggleSelect = (item: InstanceItem) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  const setManySelected = (ids: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const reopenAll = (items: InstanceItem[]): Patch[] => items.map(reopenPatch);

  const bulk = {
    markPaid: () => {
      const items = selectedOpen;
      const ids = items.map((i) => i.id);
      const paidAt = new Date().toISOString();
      clearSelection();
      mutate(
        items.map((i) => ({
          ids: [i.id],
          patch: { status: "paid", amountPaid: i.amountDue, paidAt },
        })),
        () => bulkMarkPaid(ids),
        {
          message: `${pluralize(items.length, "bill")} marked paid`,
          undo: () =>
            mutate(reopenAll(items), () => bulkMarkUnpaid(ids), {
              message: `${pluralize(items.length, "bill")} marked unpaid`,
            }),
        },
      );
    },
    skip: () => {
      const items = selectedOpen;
      const ids = items.map((i) => i.id);
      clearSelection();
      mutate({ ids, patch: { status: "skipped" } }, () => bulkSkip(ids), {
        message: `${pluralize(items.length, "bill")} skipped`,
        undo: () =>
          mutate(
            items.map((i) => ({
              ids: [i.id],
              patch: { status: deriveOpenStatus(i.dueDate, today) },
            })),
            () => bulkUnskip(ids),
            { message: `${pluralize(items.length, "bill")} restored` },
          ),
      });
    },
    setCategory: (categoryId: string | null) => {
      const items = selectedItems;
      const taskIds = [...new Set(items.map((i) => i.taskId))];
      const category = data.categories.find((c) => c.id === categoryId) ?? null;
      // Remember each task's previous category so Undo can put them back.
      const previous = new Map<string | null, string[]>();
      for (const i of items) {
        const key = i.category?.id ?? null;
        const list = previous.get(key) ?? [];
        if (!list.includes(i.taskId)) list.push(i.taskId);
        previous.set(key, list);
      }
      clearSelection();
      mutate({ taskIds, patch: { category } }, () => setTasksCategory(taskIds, categoryId), {
        message: `Moved ${pluralize(taskIds.length, "bill")} to ${category?.name ?? "Uncategorized"}`,
        undo: () =>
          mutate(
            [...previous].map(([catId, ids]) => ({
              taskIds: ids,
              patch: { category: data.categories.find((c) => c.id === catId) ?? null },
            })),
            async () => {
              const results = await Promise.all(
                [...previous].map(([catId, ids]) => setTasksCategory(ids, catId)),
              );
              return results.find((r) => !r.ok) ?? { ok: true, data: undefined };
            },
          ),
      });
    },
  };

  // ---------- Derived view ----------
  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return view.month.filter((i) => {
      if (filters.categoryId !== "all" && i.category?.id !== filters.categoryId) return false;
      if (filters.status !== "all" && i.status !== filters.status) return false;
      if (q && !`${i.title} ${i.payee ?? ""} ${i.category?.name ?? ""}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [view.month, filters]);

  const overdue = view.month.filter((i) => i.status === "overdue");
  const nextWeek = view.nextWeek.filter((i) => isOpen(i.status));
  const nextDue =
    view.nextDue && isOpen(view.nextDue.status) ? view.nextDue : (nextWeek[0] ?? null);

  const listProps = {
    today,
    userId,
    currency,
    actions,
    selected,
    onToggleSelect: toggleSelect,
    onSetSelected: setManySelected,
  };

  return (
    <>
      {variant === "dashboard" && (
        <>
          <KpiCards
            month={view.month}
            nextDue={nextDue}
            today={today}
            currency={currency}
            monthlyBudget={monthlyBudget}
          />
          <InsightBanner
            nextWeek={nextWeek}
            overdue={overdue}
            anomalies={anomalies}
            today={today}
            currency={currency}
          />
        </>
      )}

      {view.month.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nothing due this month"
          description="None of your bills fall in this month. Use the arrows to look at another one."
        />
      ) : (
        <>
          <DashboardToolbar
            filters={filters}
            onChange={setFilters}
            categories={data.categories}
            trailing={
              variant === "dashboard" ? <ViewToggle value={mode} onChange={setMode} /> : undefined
            }
          />
          {mode === "calendar" ? (
            <CalendarPanel period={period} items={filtered} {...listProps} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No bills match"
              description="Try a different search, or clear the filters to see everything this month."
              action={
                <Button variant="outline" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <TaskList items={filtered} {...listProps} />
          )}
        </>
      )}

      {variant === "dashboard" && view.month.length > 0 && (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <CategoryBreakdown items={view.month} currency={currency} />
          <MonthlyTrendChart data={trend} period={period} currency={currency} />
        </div>
      )}

      <BulkBar
        count={selectedItems.length}
        openCount={selectedOpen.length}
        total={selectedItems.reduce((s, i) => s + i.amountDue, 0)}
        currency={currency}
        categories={data.categories}
        onMarkPaid={bulk.markPaid}
        onSkip={bulk.skip}
        onSetCategory={bulk.setCategory}
        onClear={clearSelection}
      />
    </>
  );
}
