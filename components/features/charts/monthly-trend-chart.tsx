"use client";

import { format, parseISO } from "date-fns";
import { BarChart3, Table2 } from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useChartColors } from "@/components/features/charts/use-chart-colors";
import { Button } from "@/components/ui/button";
import type { MonthTotal } from "@/lib/data/trend";
import { formatMoney, formatMoneyCompact, formatMoneyShort } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Props = {
  data: MonthTotal[];
  /** The month being viewed: the emphasized bar. */
  period: string;
  currency: string;
  className?: string;
  height?: number;
};

type Row = MonthTotal & { label: string; isCurrent: boolean };

/**
 * Six months of total obligations. Single series → no legend box; the
 * viewed month is emphasized (accent) and the rest are context.
 */
export function MonthlyTrendChart({ data, period, currency, className, height = 200 }: Props) {
  const colors = useChartColors();
  const [asTable, setAsTable] = useState(false);
  const rows: Row[] = data.map((d) => ({
    ...d,
    label: format(parseISO(d.period), "MMM"),
    isCurrent: d.period === period,
  }));
  const current = rows.find((r) => r.isCurrent);
  const previous = rows[rows.findIndex((r) => r.isCurrent) - 1];
  const delta =
    current && previous && previous.due > 0 ? (current.due - previous.due) / previous.due : null;

  return (
    <section className={cn("surface p-5 sm:p-6", className)} aria-labelledby="trend-title">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 id="trend-title" className="text-section">
            Monthly obligations
          </h2>
          <p className="mt-0.5 text-xs text-meta">
            Last 6 months
            {delta !== null && (
              <>
                {" · "}
                {format(parseISO(period), "MMMM")} is{" "}
                <span className="font-medium text-body">
                  {Math.abs(Math.round(delta * 100))}% {delta >= 0 ? "higher" : "lower"}
                </span>{" "}
                than {format(parseISO(previous!.period), "MMMM")}
              </>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-meta"
          onClick={() => setAsTable((v) => !v)}
          aria-pressed={asTable}
          aria-label={asTable ? "Show as chart" : "Show as table"}
        >
          {asTable ? <BarChart3 /> : <Table2 />}
        </Button>
      </div>

      {asTable ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-meta">
              <th className="py-2 font-medium">Month</th>
              <th className="py-2 text-right font-medium">Due</th>
              <th className="py-2 text-right font-medium">Paid</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((r) => (
              <tr
                key={r.period}
                className={cn(
                  "border-b last:border-0",
                  r.isCurrent && "font-medium text-foreground",
                )}
              >
                <td className="py-2">{format(parseISO(r.period), "MMMM yyyy")}</td>
                <td className="py-2 text-right">{formatMoney(r.due, currency)}</td>
                <td className="py-2 text-right">{formatMoney(r.paid, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ height }} role="img" aria-label={summary(rows, currency)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              margin={{ top: 20, right: 4, bottom: 0, left: 0 }}
              barCategoryGap="30%"
            >
              <CartesianGrid vertical={false} stroke={colors.grid} strokeWidth={1} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: colors.axis }}
                tick={{ fill: colors.meta, fontSize: 12 }}
                tickMargin={8}
              />
              <YAxis
                width={48}
                tickLine={false}
                axisLine={false}
                tick={{ fill: colors.meta, fontSize: 12 }}
                tickFormatter={(v: number) => formatMoneyCompact(v, currency)}
                tickCount={4}
              />
              <Tooltip
                cursor={{ fill: colors.grid, opacity: 0.6 }}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as Row | undefined;
                  if (!active || !row) return null;
                  return (
                    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-pop">
                      <p className="text-sm font-semibold text-foreground tabular-nums">
                        {formatMoney(row.due, currency)}
                      </p>
                      <p className="text-meta">{format(parseISO(row.period), "MMMM yyyy")} · due</p>
                      <p className="mt-1 text-body tabular-nums">
                        {formatMoney(row.paid, currency)} paid
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="due" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.period} fill={r.isCurrent ? colors.accent : colors.context} />
                ))}
                {/* Selective direct label: only the emphasized month. */}
                <LabelList
                  dataKey="due"
                  position="top"
                  content={(props) => {
                    const { x, y, width, index } = props as {
                      x?: number;
                      y?: number;
                      width?: number;
                      index?: number;
                    };
                    const row = index !== undefined ? rows[index] : undefined;
                    if (
                      !row?.isCurrent ||
                      x === undefined ||
                      y === undefined ||
                      width === undefined
                    )
                      return null;
                    return (
                      <text
                        x={x + width / 2}
                        y={y - 6}
                        textAnchor="middle"
                        fill={colors.text}
                        fontSize={12}
                        fontWeight={600}
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {formatMoneyShort(Math.round(row.due), currency)}
                      </text>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function summary(rows: Row[], currency: string): string {
  return `Bar chart of monthly obligations: ${rows
    .map(
      (r) =>
        `${format(parseISO(r.period), "MMMM")} ${formatMoneyShort(Math.round(r.due), currency)}`,
    )
    .join(", ")}.`;
}
