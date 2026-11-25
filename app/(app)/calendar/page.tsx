import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { DashboardView } from "@/components/features/dashboard/dashboard-view";
import { MonthSwitcher } from "@/components/features/dashboard/month-switcher";
import { AddTaskButton } from "@/components/features/tasks/task-sheet-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getDashboardData } from "@/lib/data/dashboard";
import { getMonthContext } from "@/lib/data/month-context";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const { user, currency, today, currentPeriod, period } = await getMonthContext(month);
  const data = await getDashboardData(period, today);

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Every due date this month. Pick a day to see and pay its bills."
        actions={
          <>
            <MonthSwitcher period={period} currentPeriod={currentPeriod} basePath="/calendar" />
            <AddTaskButton />
          </>
        }
      />
      {data.hasAnyTasks ? (
        <DashboardView
          key={period}
          variant="calendar"
          data={data}
          period={period}
          today={today}
          currency={currency}
          userId={user.id}
        />
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="Nothing scheduled"
          description="Due dates appear on the calendar as soon as you add a bill."
          action={<AddTaskButton label="Add your first bill" />}
        />
      )}
    </>
  );
}
