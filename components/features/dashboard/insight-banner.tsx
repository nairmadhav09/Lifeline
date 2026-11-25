"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Lightbulb, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Anomaly } from "@/lib/data/anomalies";
import type { InstanceItem } from "@/lib/instances/types";
import { formatMoneyShort, pluralize } from "@/lib/utils/format";

type Props = {
  nextWeek: InstanceItem[];
  overdue: InstanceItem[];
  anomalies?: Anomaly[];
  today: string;
  currency: string;
};

const storageKey = (today: string) => `lifeline:insight-dismissed:${today}`;

/**
 * Soft-gradient insight card. Every sentence is computed from the user's own
 * data (no AI): overdue bills, the week ahead, and unusually high bills.
 */
export function InsightBanner({ nextWeek, overdue, anomalies = [], today, currency }: Props) {
  const [dismissed, setDismissed] = useState(true); // hidden until we've read storage

  useEffect(() => {
    let value = false;
    try {
      value = window.localStorage.getItem(storageKey(today)) === "1";
    } catch {
      // storage unavailable (private mode): just show the banner
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is client-only
    setDismissed(value);
  }, [today]);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey(today), "1");
    } catch {
      // ignore
    }
  };

  const message = buildMessage(nextWeek, overdue, anomalies, currency);

  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.aside
          aria-label="Insight"
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="relative flex items-start gap-3 overflow-hidden rounded-2xl p-4 pr-12 ai-border sm:items-center sm:px-5">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-50/80 via-violet-50/50 to-transparent dark:from-indigo-500/10 dark:via-violet-500/5"
            />
            <span className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-[0_2px_6px_-1px_rgba(79,70,229,0.35)]">
              <Lightbulb className="size-4" aria-hidden="true" />
            </span>
            <p className="relative text-sm text-foreground">{message}</p>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={dismiss}
              aria-label="Dismiss insight"
              className="absolute top-3 right-3 text-meta sm:top-1/2 sm:-translate-y-1/2"
            >
              <X />
            </Button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function buildMessage(
  nextWeek: InstanceItem[],
  overdue: InstanceItem[],
  anomalies: Anomaly[],
  currency: string,
) {
  const weekTotal = nextWeek.reduce((s, i) => s + i.amountDue, 0);
  const overdueTotal = overdue.reduce((s, i) => s + i.amountDue, 0);
  const autopay = nextWeek.filter((i) => i.autopay).length;

  const parts: string[] = [];
  if (overdue.length > 0) {
    parts.push(
      `${pluralize(overdue.length, "payment")} ${overdue.length === 1 ? "is" : "are"} overdue (${formatMoneyShort(overdueTotal, currency)}).`,
    );
  }
  if (nextWeek.length > 0) {
    parts.push(
      `${pluralize(nextWeek.length, "payment")} ${nextWeek.length === 1 ? "is" : "are"} due in the next 7 days, totaling ${formatMoneyShort(weekTotal, currency)}${
        autopay > 0 ? ` (${autopay} on autopay)` : ""
      }.`,
    );
  }
  const top = anomalies[0];
  if (top) {
    parts.push(
      `${top.title} is ${Math.round(top.change * 100)}% higher than your ${top.months}-month average.`,
    );
  }
  if (parts.length === 0) return "You're all caught up. Nothing is due in the next 7 days.";
  return parts.join(" ");
}
