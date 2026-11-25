"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Loader2, Mail, MailCheck } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendMagicLink, signInWithGoogle, type MagicLinkState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  next?: string;
  errorMessage?: string;
  configured: boolean;
};

const initialState: MagicLinkState = { status: "idle" };

export function LoginCard(props: Props) {
  // Remounting the flow resets useActionState back to "idle".
  const [resetKey, setResetKey] = useState(0);
  return (
    <div className="w-full max-w-[400px] surface p-6 sm:p-8">
      <LoginFlow key={resetKey} {...props} onReset={() => setResetKey((k) => k + 1)} />
    </div>
  );
}

function LoginFlow({ next, errorMessage, configured, onReset }: Props & { onReset: () => void }) {
  const [state, formAction] = useActionState(sendMagicLink, initialState);
  const sent = state.status === "sent";

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex flex-col items-center text-center"
            role="status"
            aria-live="polite"
          >
            <span className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-status-paid-bg text-status-paid">
              <MailCheck className="size-6" aria-hidden="true" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight">Check your inbox</h1>
            <p className="mt-2 text-sm">
              We sent a sign-in link to{" "}
              <span className="font-medium text-foreground">{state.email}</span>. It expires in 1
              hour.
            </p>
            <Button variant="ghost" size="sm" className="mt-6" type="button" onClick={onReset}>
              <ArrowLeft aria-hidden="true" />
              Use a different email
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <h1 className="text-[22px] leading-7 font-semibold tracking-tight">
              Sign in to Lifeline
            </h1>
            <p className="mt-1.5 text-sm">Every bill, renewal and due date in one calm place.</p>

            {!configured && <SetupNotice />}

            {(errorMessage || state.status === "error") && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2 rounded-xl bg-status-overdue-bg px-3 py-2.5 text-[13px] text-status-overdue"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{state.status === "error" ? state.message : errorMessage}</span>
              </div>
            )}

            <form action={signInWithGoogle} className="mt-6">
              {next && <input type="hidden" name="next" value={next} />}
              <GoogleButton disabled={!configured} />
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-meta" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <form action={formAction} className="space-y-3" noValidate>
              {next && <input type="hidden" name="next" value={next} />}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[13px] font-medium text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  required
                  autoFocus
                  defaultValue={state.status === "error" ? state.email : undefined}
                  aria-invalid={state.status === "error" || undefined}
                  disabled={!configured}
                />
              </div>
              <MagicLinkButton disabled={!configured} />
            </form>

            <p className="mt-5 text-center text-xs text-meta">
              New here? The same link creates your account.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MagicLinkButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={disabled || pending}>
      {pending ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <Mail aria-hidden="true" />
      )}
      {pending ? "Sending link…" : "Email me a sign-in link"}
    </Button>
  );
}

function GoogleButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      size="lg"
      className="w-full"
      disabled={disabled || pending}
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <GoogleIcon />}
      Continue with Google
    </Button>
  );
}

function SetupNotice() {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-input bg-muted/50 px-3.5 py-3 text-[13px]">
      <p className="font-medium text-foreground">Finish setup to sign in</p>
      <p className="mt-1">
        Copy <code className="rounded bg-card px-1 font-mono text-xs">.env.example</code> to{" "}
        <code className="rounded bg-card px-1 font-mono text-xs">.env.local</code>, add your
        Supabase URL and anon key, then restart the dev server.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
