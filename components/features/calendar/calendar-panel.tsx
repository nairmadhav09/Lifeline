"use client";

import { format, parseISO } from "date-fns";
import { CalendarCheck2 } from "lucide-react";
import { useState } from "react";
import { MonthCalendar } from "@/components/features/calendar/month-calendar";
import { TaskList } from "@/components/features/dashboard/task-list";
import type { RowActions } from "@/components/features/dashboard/task-row";
import { useTaskSheet } from "@/components/features/tasks/task-sheet-provider";
import { Button } from "@/components/ui/button";
import type { InstanceItem } from "@/lib/instances/types";
import { ordinal } from "@/lib/tasks/schedule";
import { formatMoney } from "@/lib/utils/format";

type Props = {
  period: string;
  today: string;
  items: InstanceItem[];
  userId: string;
  currency: string;
  actions: RowActions;
  selected: ReadonlySet<string>;
  onToggleSelect: (item: InstanceItem) => void;
  onSetSelected: (ids: string[], selected: boolean) => void;
};

/** Month grid + the selected day's bills. Clicking a day shows its bills beside the grid. */
export function CalendarPanel({ period, today, items, ...listProps }: Props) {
  const { openCreate } = useTaskSheet();
  const inMonth = today.slice(0, 7) === period.slice(0, 7);
  const firstDue = [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]?.dueDate;
  const [selectedDate, setSelectedDate] = useState<string>(inMonth ? today : (firstDue ?? period));

  const dayItems = items.filter((i) => i.dueDate === selectedDate);
  const dayTotal = dayItems
    .filter((i) => i.status !== "skipped")
    .reduce((s, i) => s + i.amountDue, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <section className="surface p-3 sm:p-5" aria-label="Calendar">
        <MonthCalendar
          period={period}
          today={today}
          items={items}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          currency={listProps.currency}
        />
      </section>

      <section aria-labelledby="day-title" aria-live="polite">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 id="day-title" className="text-section">
            {format(parseISO(selectedDate), "EEEE, MMMM d")}
          </h2>
          {dayItems.length > 0 && (
            <p className="text-xs font-medium text-meta tabular-nums">
              {formatMoney(dayTotal, listProps.currency)}
            </p>
          )}
        </div>
        {dayItems.length === 0 ? (
          <div className="flex flex-col items-center surface px-6 py-10 text-center">
            <CalendarCheck2 className="mb-2 size-5 text-faint" aria-hidden="true" />
            <p className="text-sm text-body">Nothing due on this day.</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() =>
                openCreate({
                  dueDay: Number(selectedDate.slice(8, 10)),
                  dueMonth: Number(selectedDate.slice(5, 7)),
                  startDate: selectedDate < today ? today : selectedDate,
                })
              }
            >
              Add a bill due on the {ordinal(Number(selectedDate.slice(8, 10)))}
            </Button>
          </div>
        ) : (
          <TaskList items={dayItems} today={today} {...listProps} />
        )}
      </section>
    </div>
  );
}
