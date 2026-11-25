import type { Metadata } from "next";
import { TasksView } from "@/components/features/tasks/tasks-view";
import { AddTaskButton } from "@/components/features/tasks/task-sheet-provider";
import { PageHeader } from "@/components/shared/page-header";
import { getCategories } from "@/lib/data/categories";
import { getProfile } from "@/lib/data/profile";
import { getTaskList } from "@/lib/data/tasks";
import { todayInTz } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const [tasks, categories, profile] = await Promise.all([
    getTaskList(),
    getCategories(),
    getProfile(),
  ]);

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Every recurring bill, premium and renewal you track."
        actions={<AddTaskButton />}
      />
      <TasksView
        tasks={tasks}
        categories={categories}
        currency={profile?.currency ?? "USD"}
        today={todayInTz(profile?.timezone ?? "UTC")}
      />
    </>
  );
}
