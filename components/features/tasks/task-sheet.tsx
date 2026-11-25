"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { Archive, CalendarClock, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/features/categories/category-icon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { archiveTasks, createTask, getTask, restoreTasks, updateTask } from "@/lib/actions/tasks";
import type { CategoryRef } from "@/lib/instances/types";
import {
  RECURRENCE_LABEL,
  describeSchedule,
  ordinal,
  upcomingDueDates,
} from "@/lib/tasks/schedule";
import {
  REMINDER_OPTIONS,
  defaultTaskValues,
  taskFormSchema,
  taskToFormValues,
  type TaskFormValues,
} from "@/lib/tasks/schema";
import { cn } from "@/lib/utils";
import { currencySymbol } from "@/lib/utils/format";
import type { Recurrence } from "@/types/domain";

export type TaskSheetMode =
  { kind: "create"; defaults?: Partial<TaskFormValues> } | { kind: "edit"; taskId: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: TaskSheetMode;
  categories: CategoryRef[];
  currency: string;
  today: string;
};

const RECURRENCES: { value: Recurrence; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "6 months" },
  { value: "yearly", label: "Yearly" },
  { value: "one_time", label: "Once" },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: format(new Date(2000, i, 1), "MMMM"),
}));

export function TaskSheet({ open, onOpenChange, mode, categories, currency, today }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-[500px]"
        onOpenAutoFocus={(e) => {
          // Focus the first field ourselves (after edit data loads).
          e.preventDefault();
        }}
      >
        {open && (
          <TaskSheetBody
            key={mode.kind === "edit" ? mode.taskId : "create"}
            mode={mode}
            categories={categories}
            currency={currency}
            today={today}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function TaskSheetBody({
  mode,
  categories,
  currency,
  today,
  onDone,
}: Omit<Props, "open" | "onOpenChange"> & { onDone: () => void }) {
  const isEdit = mode.kind === "edit";
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [confirmArchive, setConfirmArchive] = useState(false);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: defaultTaskValues(today, mode.kind === "create" ? mode.defaults : undefined),
    mode: "onTouched",
  });
  const { errors } = form.formState;
  const isVariableAmount = useWatch({ control: form.control, name: "isVariableAmount" });

  // Edit mode: fetch the task, then populate the form.
  useEffect(() => {
    if (mode.kind !== "edit") {
      form.setFocus("title");
      return;
    }
    let cancelled = false;
    getTask(mode.taskId).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        form.reset(taskToFormValues(res.data));
        setLoading(false);
        requestAnimationFrame(() => form.setFocus("title"));
      } else {
        setLoadError(res.error);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mode, form]);

  const onSubmit = form.handleSubmit((values) => {
    startSaving(async () => {
      const res = isEdit ? await updateTask(mode.taskId, values) : await createTask(values);
      if (!res.ok) {
        for (const [field, messages] of Object.entries(res.fieldErrors ?? {})) {
          form.setError(field as keyof TaskFormValues, { message: messages[0] });
        }
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? "Changes saved" : `${values.title} added`);
      onDone();
    });
  });

  const archive = () => {
    if (mode.kind !== "edit") return;
    const title = form.getValues("title");
    startSaving(async () => {
      const res = await archiveTasks([mode.taskId]);
      if (!res.ok) return void toast.error(res.error);
      onDone();
      toast.success(`${title} archived`, {
        description: "Payment history is kept.",
        action: {
          label: "Undo",
          onClick: async () => {
            const undo = await restoreTasks([mode.taskId]);
            if (!undo.ok) toast.error(undo.error);
          },
        },
      });
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex h-full min-h-0 flex-col" noValidate>
      <SheetHeader className="border-b px-6 py-5">
        <SheetTitle className="text-lg font-semibold text-foreground">
          {isEdit ? "Edit bill" : "New bill"}
        </SheetTitle>
        <SheetDescription className="text-sm text-body">
          {isEdit
            ? "Changes apply to this month's unpaid bill and every one after it."
            : "Add anything you pay on a schedule. Lifeline tracks every due date."}
        </SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <FormSkeleton />
        ) : loadError ? (
          <p
            role="alert"
            className="rounded-xl bg-status-overdue-bg px-4 py-3 text-sm text-status-overdue"
          >
            {loadError}
          </p>
        ) : (
          <div className="space-y-7">
            {/* Basics */}
            <Section title="Basics">
              <Field label="Name" htmlFor="title" error={errors.title?.message}>
                <Input
                  id="title"
                  placeholder="e.g. Car insurance"
                  autoComplete="off"
                  aria-invalid={!!errors.title}
                  {...form.register("title")}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category" htmlFor="category">
                  <Controller
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? "none"}
                        onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                      >
                        <SelectTrigger id="category" onBlur={field.onBlur}>
                          <SelectValue placeholder="Choose a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <CategoryIcon icon="circle-ellipsis" color="slate" size="sm" />
                            Uncategorized
                          </SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field label="Payee" htmlFor="payee" optional error={errors.payee?.message}>
                  <Input
                    id="payee"
                    placeholder="e.g. GEICO"
                    autoComplete="off"
                    {...form.register("payee")}
                  />
                </Field>
              </div>
            </Section>

            {/* Amount */}
            <Section title="Amount">
              <Field
                label={isVariableAmount ? "Typical amount" : "Amount"}
                htmlFor="amount"
                error={errors.amount?.message}
              >
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-meta">
                    {currencySymbol(currency)}
                  </span>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    className="pl-8 tabular-nums"
                    style={{
                      paddingLeft: `${Math.max(2, currencySymbol(currency).length + 1.6)}ch`,
                    }}
                    aria-invalid={!!errors.amount}
                    {...form.register("amount")}
                  />
                </div>
              </Field>
              <ToggleRow
                control={form.control}
                name="isVariableAmount"
                label="Amount changes each month"
                hint="Like utilities or credit cards. We'll use this as the estimate."
              />
            </Section>

            {/* Schedule */}
            <Section title="Schedule">
              <ScheduleFields control={form.control} errors={errors} register={form.register} />
              <SchedulePreview control={form.control} today={today} />
            </Section>

            {/* Payment */}
            <Section title="Payment">
              <ToggleRow
                control={form.control}
                name="autopay"
                label="Autopay is on"
                hint="We'll still remind you, but you won't need to act."
              />
              <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                <Field
                  label="Paid with"
                  htmlFor="paymentMethod"
                  optional
                  error={errors.paymentMethod?.message}
                >
                  <Input
                    id="paymentMethod"
                    placeholder="e.g. Chase checking"
                    autoComplete="off"
                    {...form.register("paymentMethod")}
                  />
                </Field>
                <Field
                  label="Last 4 digits"
                  htmlFor="accountReference"
                  optional
                  error={errors.accountReference?.message}
                >
                  <Input
                    id="accountReference"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="1234"
                    autoComplete="off"
                    className="tabular-nums"
                    aria-invalid={!!errors.accountReference}
                    {...form.register("accountReference", {
                      // Never keep more than the last 4 digits, even if a full number is pasted.
                      setValueAs: (v: string) => v.replace(/\D/g, "").slice(-4),
                    })}
                  />
                </Field>
              </div>
            </Section>

            {/* Reminders */}
            <Section title="Remind me" description="Before each due date">
              <ReminderChips control={form.control} />
            </Section>

            <Section title="Notes">
              <Textarea
                id="notes"
                aria-label="Notes"
                placeholder="Policy number, login hints, anything useful…"
                rows={3}
                {...form.register("notes")}
              />
              {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
            </Section>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t bg-card px-6 py-4">
        {isEdit && !loading && !loadError && (
          <Button
            type="button"
            variant="ghost"
            className="text-meta hover:bg-status-overdue-bg hover:text-status-overdue"
            onClick={() => setConfirmArchive(true)}
            disabled={saving}
          >
            <Archive aria-hidden="true" />
            Archive
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || loading || !!loadError}>
            {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
            {isEdit ? "Save changes" : "Add bill"}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {form.getValues("title") || "this bill"}?</AlertDialogTitle>
            <AlertDialogDescription>
              It stops appearing on your dashboard and its unpaid bills are removed. Your payment
              history is kept, and you can restore it anytime from Tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={archive}>Archive bill</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

// ---------- Schedule ----------------------------------------------------

function ScheduleFields({
  control,
  errors,
  register,
}: {
  control: Control<TaskFormValues>;
  errors: ReturnType<typeof useForm<TaskFormValues>>["formState"]["errors"];
  register: ReturnType<typeof useForm<TaskFormValues>>["register"];
}) {
  const recurrence = useWatch({ control, name: "recurrence" });
  const needsMonth =
    recurrence === "quarterly" || recurrence === "half_yearly" || recurrence === "yearly";

  return (
    <>
      <Controller
        control={control}
        name="recurrence"
        render={({ field }) => (
          <div
            role="radiogroup"
            aria-label="Repeats"
            className="grid grid-cols-5 gap-1 rounded-xl bg-muted p-1"
          >
            {RECURRENCES.map((r) => {
              const selected = field.value === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  title={RECURRENCE_LABEL[r.value]}
                  onClick={() => field.onChange(r.value)}
                  className={cn(
                    "h-8 rounded-lg px-1 text-xs font-medium transition-[background-color,color,box-shadow] duration-150 ease-out",
                    "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none",
                    selected
                      ? "bg-card text-foreground shadow-card"
                      : "text-meta hover:text-foreground",
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        )}
      />

      {recurrence === "one_time" ? (
        <Field label="Due date" htmlFor="startDate" error={errors.startDate?.message}>
          <Input id="startDate" type="date" className="tabular-nums" {...register("startDate")} />
        </Field>
      ) : (
        <>
          <div className={cn("grid gap-4", needsMonth && "grid-cols-2")}>
            {needsMonth && (
              <Field
                label={recurrence === "yearly" ? "Month" : "First month"}
                htmlFor="dueMonth"
                error={errors.dueMonth?.message}
              >
                <Controller
                  control={control}
                  name="dueMonth"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger id="dueMonth" aria-invalid={!!errors.dueMonth}>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            )}
            <Field
              label="Due on"
              htmlFor="dueDay"
              hint={
                recurrence === "monthly"
                  ? "Day 31 moves to the last day of shorter months."
                  : undefined
              }
            >
              <Controller
                control={control}
                name="dueDay"
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger id="dueDay">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          The {ordinal(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Starts" htmlFor="startDate" error={errors.startDate?.message}>
              <Input
                id="startDate"
                type="date"
                className="tabular-nums"
                {...register("startDate")}
              />
            </Field>
            <Field label="Ends" htmlFor="endDate" optional error={errors.endDate?.message}>
              <Input
                id="endDate"
                type="date"
                className="tabular-nums"
                aria-invalid={!!errors.endDate}
                {...register("endDate")}
              />
            </Field>
          </div>
        </>
      )}
    </>
  );
}

function SchedulePreview({ control, today }: { control: Control<TaskFormValues>; today: string }) {
  const [recurrence, dueDay, dueMonth, startDate, endDate] = useWatch({
    control,
    name: ["recurrence", "dueDay", "dueMonth", "startDate", "endDate"],
  });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate ?? "")) return null;

  const schedule = {
    recurrence,
    dueDay: recurrence === "one_time" ? Number(startDate.slice(8, 10)) : dueDay,
    dueMonth: recurrence === "monthly" ? null : dueMonth,
    startDate,
    endDate: endDate || null,
  };
  const dates = upcomingDueDates(schedule, today, 3);
  const fmt = (d: string) =>
    format(parseISO(d), d.slice(0, 4) === today.slice(0, 4) ? "MMM d" : "MMM d, yyyy");

  return (
    <div
      className="flex items-start gap-2.5 rounded-xl bg-accent/60 px-3.5 py-3 text-[13px]"
      aria-live="polite"
    >
      <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <div>
        <p className="font-medium text-foreground">{describeSchedule(schedule)}</p>
        <p className="text-body tabular-nums">
          {dates.length === 0
            ? "No upcoming due dates."
            : `Next due ${fmt(dates[0]!)}${dates.length > 1 ? ` · then ${dates.slice(1).map(fmt).join(", ")}` : ""}`}
        </p>
      </div>
    </div>
  );
}

// ---------- Small pieces -------------------------------------------------

function ReminderChips({ control }: { control: Control<TaskFormValues> }) {
  const label = (d: number) => (d === 0 ? "On the day" : d === 1 ? "1 day" : `${d} days`);
  return (
    <Controller
      control={control}
      name="reminderDaysBefore"
      render={({ field }) => (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Reminder days before due date"
        >
          {REMINDER_OPTIONS.map((d) => {
            const on = field.value.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  field.onChange(on ? field.value.filter((x) => x !== d) : [...field.value, d])
                }
                className={cn(
                  "h-8 rounded-full border px-3 text-xs font-medium transition-colors duration-150 ease-out",
                  "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none",
                  on
                    ? "border-primary/30 bg-accent text-accent-foreground"
                    : "border-input bg-card text-meta hover:text-foreground",
                )}
              >
                {label(d)}
              </button>
            );
          })}
        </div>
      )}
    />
  );
}

function ToggleRow({
  control,
  name,
  label,
  hint,
}: {
  control: Control<TaskFormValues>;
  name: "isVariableAmount" | "autopay";
  label: string;
  hint: string;
}) {
  const id = `toggle-${name}`;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor={id} className="text-sm font-medium text-foreground">
              {label}
            </Label>
            <p className="text-xs text-meta">{hint}</p>
          </div>
          <Switch id={id} checked={field.value} onCheckedChange={field.onChange} />
        </div>
      )}
    />
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 flex items-baseline gap-2 text-xs font-semibold tracking-wide text-meta uppercase">
        {title}
        {description && (
          <span className="font-normal tracking-normal normal-case">{description}</span>
        )}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  htmlFor,
  optional,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-[13px] font-medium text-foreground">
        {label}
        {optional && <span className="font-normal text-meta"> (optional)</span>}
      </Label>
      {children}
      {error ? (
        <FieldError>{error}</FieldError>
      ) : hint ? (
        <p className="text-xs text-meta">{hint}</p>
      ) : null}
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-xs text-status-overdue">
      {children}
    </p>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading bill">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-2/3 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
