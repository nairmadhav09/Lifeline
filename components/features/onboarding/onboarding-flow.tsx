"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/features/categories/category-icon";
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
import { completeOnboarding } from "@/lib/actions/onboarding";
import { CURRENCIES } from "@/lib/constants/currencies";
import { PRESETS, type Preset } from "@/lib/onboarding/presets";
import { RECURRENCE_LABEL, ordinal } from "@/lib/tasks/schedule";
import { cn } from "@/lib/utils";
import { currencySymbol } from "@/lib/utils/format";

type Row = { amount: string; dueDay: number };

const STEPS = ["Preferences", "Your bills", "Amounts"] as const;

export function OnboardingFlow({
  initialName,
  initialCurrency,
}: {
  initialName: string;
  initialCurrency: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [currency, setCurrency] = useState(initialCurrency);
  const [timezone, setTimezone] = useState("UTC");
  const [zones, setZones] = useState<string[]>(["UTC"]);
  const [picked, setPicked] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [saving, startSaving] = useTransition();

  // The browser knows the user's timezone; the server doesn't.
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const all =
      typeof Intl.supportedValuesOf === "function"
        ? Intl.supportedValuesOf("timeZone")
        : [detected];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only values
    setTimezone(detected);
    setZones(all.includes("UTC") ? all : ["UTC", ...all]);
  }, []);

  const presets = picked
    .map((id) => PRESETS.find((p) => p.id === id))
    .filter((p): p is Preset => !!p);

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const finish = (withAmounts: boolean) => {
    startSaving(async () => {
      const res = await completeOnboarding({
        displayName: name,
        currency,
        timezone,
        items: presets.map((p) => {
          const row = rows[p.id];
          const amount = withAmounts ? Number((row?.amount ?? "").replace(/,/g, "")) : NaN;
          return {
            title: p.title,
            category: p.category,
            amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
            // No amount yet → treat as variable so it reads as an estimate.
            isVariable: p.variable ?? !(Number.isFinite(amount) && amount > 0),
            recurrence: p.recurrence,
            dueDay: row?.dueDay ?? p.dueDay,
            dueMonth: p.dueMonth ?? null,
          };
        }),
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success(
        presets.length ? `You're all set. ${presets.length} bills added.` : "You're all set.",
      );
      router.replace("/dashboard");
      router.refresh();
    });
  };

  return (
    <div className="w-full max-w-[560px]">
      {/* Progress */}
      <ol className="mb-6 flex items-center gap-2" aria-label="Setup progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors duration-150",
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "bg-brand-gradient text-white"
                    : "bg-muted text-meta",
              )}
            >
              {i < step ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
            </span>
            <span
              className={cn("text-xs font-medium", i === step ? "text-foreground" : "text-meta")}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      <div className="surface p-6 sm:p-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {step === 0 && (
              <section aria-labelledby="step-title">
                <h1 id="step-title" className="text-[22px] leading-7 font-semibold tracking-tight">
                  Welcome to Lifeline
                </h1>
                <p className="mt-1.5 text-sm">A few basics so amounts and due dates are right.</p>
                <div className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-[13px] font-medium text-foreground">
                      What should we call you?
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={80}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="currency" className="text-[13px] font-medium text-foreground">
                        Currency
                      </Label>
                      <Select value={currency} onValueChange={setCurrency}>
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
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="timezone" className="text-[13px] font-medium text-foreground">
                        Timezone
                      </Label>
                      <Select value={timezone} onValueChange={setTimezone}>
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
                    </div>
                  </div>
                  <p className="text-xs text-meta">
                    Your timezone decides when a bill becomes &ldquo;due today&rdquo; or overdue.
                  </p>
                </div>
              </section>
            )}

            {step === 1 && (
              <section aria-labelledby="step-title">
                <h1 id="step-title" className="text-[22px] leading-7 font-semibold tracking-tight">
                  What do you pay regularly?
                </h1>
                <p className="mt-1.5 text-sm">
                  Pick everything that applies. You can add more later.
                </p>
                <div
                  className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2"
                  role="group"
                  aria-label="Common bills"
                >
                  {PRESETS.map((p) => {
                    const on = picked.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(p.id)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors duration-150 ease-out",
                          "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none",
                          on
                            ? "border-primary/40 bg-accent text-accent-foreground"
                            : "border-input bg-card text-foreground hover:bg-muted/60",
                        )}
                      >
                        <CategoryIcon icon={p.icon} color={p.color} size="sm" />
                        <span className="flex-1 font-medium">{p.title}</span>
                        <span
                          aria-hidden="true"
                          className={cn(
                            "inline-flex size-[18px] items-center justify-center rounded-[6px] border transition-colors",
                            on
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input",
                          )}
                        >
                          {on && <Check className="size-3" strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {step === 2 && (
              <section aria-labelledby="step-title">
                <h1 id="step-title" className="text-[22px] leading-7 font-semibold tracking-tight">
                  Add amounts and due days
                </h1>
                <p className="mt-1.5 text-sm">
                  Rough numbers are fine. For bills that change, enter a typical amount.
                </p>
                <div className="mt-6 divide-y divide-border rounded-xl border">
                  {presets.map((p) => {
                    const row = rows[p.id] ?? { amount: "", dueDay: p.dueDay };
                    const set = (patch: Partial<Row>) =>
                      setRows((prev) => ({ ...prev, [p.id]: { ...row, ...patch } }));
                    return (
                      <div
                        key={p.id}
                        className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 p-3 sm:grid-cols-[auto_1fr_7.5rem_7rem]"
                      >
                        <CategoryIcon icon={p.icon} color={p.color} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                          <p className="text-xs text-meta">{RECURRENCE_LABEL[p.recurrence]}</p>
                        </div>
                        <div className="relative col-start-2 sm:col-start-auto">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-meta">
                            {currencySymbol(currency)}
                          </span>
                          <Input
                            aria-label={`${p.title} amount`}
                            inputMode="decimal"
                            placeholder="0.00"
                            value={row.amount}
                            onChange={(e) =>
                              set({ amount: e.target.value.replace(/[^\d.,]/g, "") })
                            }
                            className="h-9 pl-7 tabular-nums"
                          />
                        </div>
                        <Select
                          value={String(row.dueDay)}
                          onValueChange={(v) => set({ dueDay: Number(v) })}
                        >
                          <SelectTrigger
                            aria-label={`${p.title} due day`}
                            className="col-start-2 h-9 sm:col-start-auto"
                          >
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
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-8 flex items-center gap-2">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={saving}>
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {step === 1 && (
              <Button variant="ghost" onClick={() => finish(false)} disabled={saving}>
                Skip for now
              </Button>
            )}
            {step === 2 && (
              <Button variant="ghost" onClick={() => finish(false)} disabled={saving}>
                Skip amounts
              </Button>
            )}
            {step < 2 ? (
              <Button
                onClick={() =>
                  step === 1 && picked.length === 0 ? finish(false) : setStep(step + 1)
                }
                disabled={saving}
              >
                {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
                {step === 1 && picked.length === 0 ? "Finish" : "Continue"}
                {!saving && <ArrowRight aria-hidden="true" />}
              </Button>
            ) : (
              <Button onClick={() => finish(true)} disabled={saving}>
                {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
                Go to my dashboard
              </Button>
            )}
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-meta">
        {step === 1 && picked.length > 0 && `${picked.length} selected · `}
        Everything can be changed later in Settings.
      </p>
    </div>
  );
}
