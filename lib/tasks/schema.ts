import { z } from "zod";
import { Constants, type TablesInsert } from "@/types/database";
import type { Task } from "@/types/domain";

/** Reminder choices offered in the form (days before the due date). */
export const REMINDER_OPTIONS = [0, 1, 3, 7, 14] as const;

const AMOUNT_RE = /^\d{1,10}(\.\d{1,2})?$/;

/**
 * Shared by the task sheet (client) and the create/update server actions,
 * so the browser and the server enforce identical rules.
 */
export const taskFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Give this bill a name")
      .max(120, "Keep it under 120 characters"),
    categoryId: z.uuid().nullable(),
    payee: z.string().trim().max(120, "Keep it under 120 characters"),
    amount: z
      .string()
      .trim()
      .min(1, "Enter an amount")
      .refine((v) => AMOUNT_RE.test(v.replace(/,/g, "")), "Use a number like 142.50"),
    isVariableAmount: z.boolean(),
    recurrence: z.enum(Constants.public.Enums.recurrence_type),
    dueDay: z.number().int().min(1).max(31),
    dueMonth: z.number().int().min(1).max(12).nullable(),
    startDate: z.iso.date("Pick a date"),
    endDate: z.union([z.iso.date(), z.literal("")]),
    paymentMethod: z.string().trim().max(60, "Keep it under 60 characters"),
    accountReference: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{4}$/.test(v), "Enter only the last 4 digits"),
    autopay: z.boolean(),
    reminderDaysBefore: z.array(z.number().int().min(0).max(60)).max(5),
    notes: z.string().trim().max(2000, "Keep notes under 2,000 characters"),
  })
  .superRefine((v, ctx) => {
    if (v.endDate && v.endDate < v.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be after the start date",
      });
    }
    if (
      (v.recurrence === "quarterly" ||
        v.recurrence === "half_yearly" ||
        v.recurrence === "yearly") &&
      !v.dueMonth
    ) {
      ctx.addIssue({ code: "custom", path: ["dueMonth"], message: "Pick a month" });
    }
  });

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export function defaultTaskValues(
  today: string,
  overrides?: Partial<TaskFormValues>,
): TaskFormValues {
  return {
    title: "",
    categoryId: null,
    payee: "",
    amount: "",
    isVariableAmount: false,
    recurrence: "monthly",
    dueDay: Number(today.slice(8, 10)),
    dueMonth: Number(today.slice(5, 7)),
    startDate: today,
    endDate: "",
    paymentMethod: "",
    accountReference: "",
    autopay: false,
    reminderDaysBefore: [3, 1],
    notes: "",
    ...overrides,
  };
}

export function taskToFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    categoryId: task.category_id,
    payee: task.payee ?? "",
    amount: Number(task.amount).toFixed(2),
    isVariableAmount: task.is_variable_amount,
    recurrence: task.recurrence,
    dueDay: task.due_day,
    dueMonth: task.due_month ?? Number(task.start_date.slice(5, 7)),
    startDate: task.start_date,
    endDate: task.end_date ?? "",
    paymentMethod: task.payment_method ?? "",
    accountReference: task.account_reference ?? "",
    autopay: task.autopay,
    reminderDaysBefore: task.reminder_days_before,
    notes: task.notes ?? "",
  };
}

/** Form values → DB columns (everything except user_id / currency). */
export function formValuesToRow(
  v: TaskFormValues,
): Omit<TablesInsert<"tasks">, "user_id" | "currency"> {
  const isOneTime = v.recurrence === "one_time";
  return {
    title: v.title,
    category_id: v.categoryId,
    payee: v.payee || null,
    amount: Number(v.amount.replace(/,/g, "")),
    is_variable_amount: v.isVariableAmount,
    recurrence: v.recurrence,
    // A one-time bill is due on its start date.
    due_day: isOneTime ? Number(v.startDate.slice(8, 10)) : v.dueDay,
    due_month: v.recurrence === "monthly" || isOneTime ? null : v.dueMonth,
    start_date: v.startDate,
    end_date: isOneTime ? null : v.endDate || null,
    payment_method: v.paymentMethod || null,
    account_reference: v.accountReference || null,
    autopay: v.autopay,
    reminder_days_before: [...new Set(v.reminderDaysBefore)].sort((a, b) => b - a),
    notes: v.notes || null,
  };
}
