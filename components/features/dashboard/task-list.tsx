"use client";

import { AnimatePresence, motion } from "framer-motion";
import { TaskRow, type RowActions } from "@/components/features/dashboard/task-row";
import { Checkbox } from "@/components/ui/checkbox";
import { GROUPS, groupOf, type GroupKey } from "@/lib/instances/status";
import type { InstanceItem } from "@/lib/instances/types";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Props = {
  items: InstanceItem[];
  today: string;
  userId: string;
  currency: string;
  actions: RowActions;
  selected: ReadonlySet<string>;
  onToggleSelect: (item: InstanceItem) => void;
  onSetSelected: (ids: string[], selected: boolean) => void;
};

export function TaskList({
  items,
  today,
  userId,
  currency,
  actions,
  selected,
  onToggleSelect,
  onSetSelected,
}: Props) {
  const grouped = new Map<GroupKey, InstanceItem[]>(GROUPS.map((g) => [g.key, []]));
  for (const item of items) grouped.get(groupOf(item, today))?.push(item);
  const selecting = selected.size > 0;

  return (
    // Container query root: rows pick their layout from the list's width, not the
    // viewport, so they stack cleanly in narrow places like the calendar day panel.
    <div className="@container space-y-6">
      {GROUPS.map(({ key, label: groupLabel }) => {
        let label = groupLabel;
        const rows = grouped.get(key) ?? [];
        if (rows.length === 0) return null;
        const total = rows.reduce(
          (s, i) =>
            s +
            (i.status === "paid"
              ? (i.amountPaid ?? i.amountDue)
              : i.status === "skipped"
                ? 0
                : i.amountDue),
          0,
        );
        if (key === "done") {
          const paid = rows.some((r) => r.status === "paid");
          const skipped = rows.some((r) => r.status === "skipped");
          label = paid && skipped ? "Paid & skipped" : skipped ? "Skipped" : "Paid";
        }
        const ids = rows.map((r) => r.id);
        const chosen = ids.filter((id) => selected.has(id)).length;
        const groupState = chosen === 0 ? false : chosen === ids.length ? true : "indeterminate";
        const headingId = `group-${key}`;

        return (
          <section key={key} aria-labelledby={headingId} className="group/section">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  checked={groupState}
                  onCheckedChange={() => onSetSelected(ids, groupState !== true)}
                  aria-label={`Select all ${label.toLowerCase()}`}
                  className={cn(
                    "transition-opacity duration-150",
                    selecting
                      ? "opacity-100"
                      : "opacity-0 group-hover/section:opacity-100 focus-visible:opacity-100",
                  )}
                />
                <h2 id={headingId} className="flex items-center gap-2 text-section">
                  {key === "overdue" && (
                    <span aria-hidden="true" className="size-2 rounded-full bg-rose-500" />
                  )}
                  {label}
                  <span className="text-xs font-medium text-meta tabular-nums">{rows.length}</span>
                </h2>
              </div>
              <p
                className={cn(
                  "text-xs font-medium tabular-nums",
                  key === "overdue" ? "text-status-overdue" : "text-meta",
                )}
              >
                {formatMoney(total, currency)}
              </p>
            </div>
            <ul className="divide-y divide-border overflow-hidden surface">
              <AnimatePresence initial={false}>
                {rows.map((item) => (
                  <motion.li
                    key={item.id}
                    layout="position"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <TaskRow
                      item={item}
                      today={today}
                      userId={userId}
                      actions={actions}
                      selected={selected.has(item.id)}
                      selecting={selecting}
                      onToggleSelect={onToggleSelect}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </section>
        );
      })}
    </div>
  );
}
