import { ListChecks } from "lucide-react";
import type { Metadata } from "next";
import { DashboardView } from "@/components/features/dashboard/dashboard-view";
import { MonthSwitcher } from "@/components/features/dashboard/month-switcher";
import { AddTaskButton } from "@/components/features/tasks/task-sheet-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getAnomalies } from "@/lib/data/anomalies";
import { getDashboardData } from "@/lib/data/dashboard";
import { getMonthContext } from "@/lib/data/month-context";
import { getMonthlyTotals } from "@/lib/data/trend";
import { formatMonthLabel, greetingForHour, hourInTz } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const { user, profile, timezone, currency, today, currentPeriod, period } =
    await getMonthContext(month);

  const [data, trend, anomalies] = await Promise.all([
    getDashboardData(period, today),
    getMonthlyTotals(period, 6),
    getAnomalies(period),
  ]);

  const firstName = (profile?.display_name || user.email?.split("@")[0] || "there").split(" ")[0];
  const isCurrent = period === currentPeriod;

  return (
    <>
      <PageHeader
        title={`${greetingForHour(hourInTz(timezone))}, ${firstName}`}
        description={
          isCurrent
            ? "Here's what needs your attention this month."
            : `Viewing ${formatMonthLabel(period)}.`
        }
        actions={
          <>
            <MonthSwitcher period={period} currentPeriod={currentPeriod} />
            <AddTaskButton />
          </>
        }
      />

      {data.hasAnyTasks ? (
        // key resets filters, selection & optimistic state when switching months.
        <DashboardView
          key={period}
          data={data}
          trend={trend}
          anomalies={anomalies}
          monthlyBudget={profile?.monthly_budget ?? null}
          period={period}
          today={today}
          currency={currency}
          userId={user.id}
        />
      ) : (
        <EmptyState
          icon={ListChecks}
          title="Add your first bill"
          description="Track rent, utilities, insurance and subscriptions in one place. Lifeline reminds you before each one is due."
          action={<AddTaskButton label="Add your first bill" />}
        />
      )}
    </>
  );
}
