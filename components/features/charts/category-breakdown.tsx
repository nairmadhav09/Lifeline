"use client";

import { PieChart } from "lucide-react";
import { CategoryIcon } from "@/components/features/categories/category-icon";
import type { InstanceItem } from "@/lib/instances/types";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Props = {
  items: InstanceItem[];
  currency: string;
  className?: string;
};

type Slice = {
  key: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  count: number;
};

/**
 * Spending by category as ranked horizontal bars (one hue, largest first).
 * Bars on a shared baseline compare more exactly than donut slices, and
 * each row is named and valued, so identity never rests on color.
 */
export function CategoryBreakdown({ items, currency, className }: Props) {
  const slices = new Map<string, Slice>();
  for (const i of items) {
    if (i.status === "skipped") continue;
    const key = i.category?.id ?? "none";
    const s = slices.get(key) ?? {
      key,
      name: i.category?.name ?? "Uncategorized",
      icon: i.category?.icon ?? "circle-ellipsis",
      color: i.category?.color ?? "slate",
      amount: 0,
      count: 0,
    };
    s.amount += i.status === "paid" ? (i.amountPaid ?? i.amountDue) : i.amountDue;
    s.count += 1;
    slices.set(key, s);
  }
  const ranked = [...slices.values()].sort((a, b) => b.amount - a.amount);
  const total = ranked.reduce((s, r) => s + r.amount, 0);
  const max = ranked[0]?.amount ?? 0;

  return (
    <section className={cn("surface p-5 sm:p-6", className)} aria-labelledby="by-category-title">
      <div className="mb-4">
        <h2 id="by-category-title" className="text-section">
          Spending by category
        </h2>
        <p className="mt-0.5 text-xs text-meta tabular-nums">
          {formatMoney(total, currency)} this month
        </p>
      </div>

      {ranked.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <PieChart className="mb-2 size-5 text-faint" aria-hidden="true" />
          <p className="text-sm text-meta">Nothing to break down this month.</p>
        </div>
      ) : (
        <ul className="space-y-3.5">
          {ranked.map((s) => {
            const share = total > 0 ? s.amount / total : 0;
            return (
              <li
                key={s.key}
                className="grid grid-cols-[auto_minmax(0,1fr)_6.5rem] items-center gap-x-3 gap-y-1.5"
              >
                <CategoryIcon icon={s.icon} color={s.color} size="sm" className="row-span-2" />
                <div className="flex min-w-0 items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] font-medium text-foreground">{s.name}</span>
                  <span className="shrink-0 text-xs text-meta tabular-nums">
                    {share > 0 && share < 0.005 ? "<1" : Math.round(share * 100)}%
                  </span>
                </div>
                <span className="row-span-2 text-right text-[13px] font-semibold text-foreground tabular-nums">
                  {formatMoney(s.amount, currency)}
                </span>
                <div className="h-2" aria-hidden="true">
                  <div
                    className="h-full rounded-r-[4px] bg-chart-accent transition-[width] duration-300 ease-out"
                    style={{ width: `${max > 0 ? Math.max((s.amount / max) * 100, 2) : 0}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
