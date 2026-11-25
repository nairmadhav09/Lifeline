import { TrendingUp } from "lucide-react";
import type { Anomaly } from "@/lib/data/anomalies";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

/** Variable bills running well above their recent average this month. */
export function UnusualBills({
  anomalies,
  className,
}: {
  anomalies: Anomaly[];
  className?: string;
}) {
  return (
    <section className={cn("surface p-5 sm:p-6", className)} aria-labelledby="unusual-title">
      <div className="mb-4">
        <h2 id="unusual-title" className="text-section">
          Unusual this month
        </h2>
        <p className="mt-0.5 text-xs text-meta">
          Bills that change each month, compared with their previous 3 months
        </p>
      </div>

      {anomalies.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl bg-status-paid-bg px-4 py-3">
          <span className="text-sm text-status-paid">
            Nothing unusual. Every variable bill is within 20% of its recent average.
          </span>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {anomalies.map((a) => (
            <li key={a.taskId} className="flex items-start gap-3 rounded-xl border px-3.5 py-3">
              <span
                className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-status-due-soon-bg text-status-due-soon"
                aria-hidden="true"
              >
                <TrendingUp className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{a.title}</span> is{" "}
                  <span className="font-semibold tabular-nums">
                    {Math.round(a.change * 100)}% higher
                  </span>{" "}
                  than usual
                </p>
                <p className="mt-0.5 text-xs text-meta tabular-nums">
                  {formatMoney(a.current, a.currency)} this month vs.{" "}
                  {formatMoney(a.average, a.currency)} average
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
