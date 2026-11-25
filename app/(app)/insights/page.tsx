import { LineChart } from "lucide-react";
import type { Metadata } from "next";
import { CategoryBreakdown } from "@/components/features/charts/category-breakdown";
import { MonthlyTrendChart } from "@/components/features/charts/monthly-trend-chart";
import { UnusualBills } from "@/components/features/charts/unusual-bills";
import { MonthSwitcher } from "@/components/features/dashboard/month-switcher";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getAnomalies } from "@/lib/data/anomalies";
import { getDashboardData } from "@/lib/data/dashboard";
import { getMonthContext } from "@/lib/data/month-context";
import { getMonthlyTotals } from "@/lib/data/trend";

export const metadata: Metadata = { title: "Insights" };

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const { currency, today, currentPeriod, period } = await getMonthContext(month);
  const [data, trend, anomalies] = await Promise.all([
    getDashboardData(period, today),
    getMonthlyTotals(period, 6),
    getAnomalies(period),
  ]);

  return (
    <>
      <PageHeader
        title="Insights"
        description="Where your money goes each month."
        actions={
          <MonthSwitcher period={period} currentPeriod={currentPeriod} basePath="/insights" />
        }
      />

      {data.hasAnyTasks ? (
        <div className="space-y-6">
          <MonthlyTrendChart data={trend} period={period} currency={currency} height={260} />
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <CategoryBreakdown items={data.month} currency={currency} />
            <UnusualBills anomalies={anomalies} />
          </div>
        </div>
      ) : (
        <EmptyState
          icon={LineChart}
          title="Insights are on their way"
          description="Add a few bills and Lifeline will show where your money goes each month."
        />
      )}
    </>
  );
}
