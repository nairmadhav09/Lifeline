"use client";

import { Plus } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { TaskSheet, type TaskSheetMode } from "@/components/features/tasks/task-sheet";
import { Button } from "@/components/ui/button";
import type { CategoryRef } from "@/lib/instances/types";
import type { TaskFormValues } from "@/lib/tasks/schema";

type TaskSheetContextValue = {
  openCreate: (defaults?: Partial<TaskFormValues>) => void;
  openEdit: (taskId: string) => void;
};

const TaskSheetContext = createContext<TaskSheetContextValue | null>(null);

export function useTaskSheet(): TaskSheetContextValue {
  const ctx = useContext(TaskSheetContext);
  if (!ctx) throw new Error("useTaskSheet must be used inside <TaskSheetProvider>");
  return ctx;
}

/** One sheet for the whole app: any "Add task" / "Edit" trigger opens it. */
export function TaskSheetProvider({
  categories,
  currency,
  today,
  children,
}: {
  categories: CategoryRef[];
  currency: string;
  today: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<TaskSheetMode>({ kind: "create" });

  const openCreate = useCallback((defaults?: Partial<TaskFormValues>) => {
    setMode({ kind: "create", defaults });
    setOpen(true);
  }, []);
  const openEdit = useCallback((taskId: string) => {
    setMode({ kind: "edit", taskId });
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openCreate, openEdit }), [openCreate, openEdit]);

  return (
    <TaskSheetContext.Provider value={value}>
      {children}
      <TaskSheet
        open={open}
        onOpenChange={setOpen}
        mode={mode}
        categories={categories}
        currency={currency}
        today={today}
      />
    </TaskSheetContext.Provider>
  );
}

export function AddTaskButton({ label = "Add task" }: { label?: string }) {
  const { openCreate } = useTaskSheet();
  return (
    <Button onClick={() => openCreate()}>
      <Plus aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </Button>
  );
}
