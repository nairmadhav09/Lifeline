"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { updateProfile, type ProfileInput } from "@/lib/actions/settings";
import { CURRENCIES } from "@/lib/constants/currencies";
import { currencySymbol } from "@/lib/utils/format";

const schema = z.object({
  displayName: z.string().trim().max(80, "Keep it under 80 characters"),
  currency: z.string(),
  timezone: z.string().min(1),
  monthlyBudget: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^\d{1,10}(\.\d{1,2})?$/.test(v.replace(/,/g, "")),
      "Use a number like 4500",
    ),
});

export function ProfileForm({ email, initial }: { email: string; initial: ProfileInput }) {
  const [saving, startSaving] = useTransition();
  const [zones, setZones] = useState<string[]>([initial.timezone]);
  const form = useForm<ProfileInput>({ resolver: zodResolver(schema), defaultValues: initial });
  const { errors, isDirty } = form.formState;

  useEffect(() => {
    const all =
      typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    const list = ["UTC", ...all.filter((z) => z !== "UTC")];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only list
    setZones(list.includes(initial.timezone) ? list : [initial.timezone, ...list]);
  }, [initial.timezone]);

  const onSubmit = form.handleSubmit((values) =>
    startSaving(async () => {
      const res = await updateProfile(values);
      if (!res.ok) return void toast.error(res.error);
      form.reset(values);
      toast.success("Settings saved");
    }),
  );

  const currency = useWatch({ control: form.control, name: "currency" });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name" htmlFor="displayName" error={errors.displayName?.message}>
          <Input id="displayName" autoComplete="name" {...form.register("displayName")} />
        </Field>
        <Field label="Email" htmlFor="email" hint="Used to sign in. Can't be changed here.">
          <Input id="email" value={email} readOnly disabled />
        </Field>
        <Field label="Currency" htmlFor="currency" hint="Amounts aren't converted, only relabeled.">
          <Controller
            control={form.control}
            name="currency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="w-10 font-medium tabular-nums">{c.code}</span>
                      <span className="text-meta">{c.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field
          label="Timezone"
          htmlFor="timezone"
          hint="Decides when a bill counts as due or overdue."
        >
          <Controller
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field
          label="Monthly budget"
          htmlFor="monthlyBudget"
          optional
          hint="Shown on your dashboard next to what's due."
          error={errors.monthlyBudget?.message}
        >
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-meta">
              {currencySymbol(currency)}
            </span>
            <Input
              id="monthlyBudget"
              inputMode="decimal"
              placeholder="e.g. 6000"
              className="pl-8 tabular-nums"
              aria-invalid={!!errors.monthlyBudget}
              {...form.register("monthlyBudget")}
            />
          </div>
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving || !isDirty}>
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          Save changes
        </Button>
      </div>
    </form>
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
        <p role="alert" className="text-xs text-status-overdue">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-meta">{hint}</p>
      ) : null}
    </div>
  );
}
