import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** A single call to action. */
  action?: React.ReactNode;
  className?: string;
};

/** Designed empty state: soft icon illustration, one sentence, one CTA. */
export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center surface px-6 py-14 text-center sm:py-16",
        className,
      )}
    >
      <div className="relative mb-5" aria-hidden="true">
        <span className="absolute inset-0 rounded-2xl bg-brand-gradient opacity-20 blur-xl" />
        <span className="relative inline-flex size-14 items-center justify-center rounded-2xl border border-white/60 bg-gradient-to-b from-indigo-50 to-violet-50 text-primary shadow-card dark:border-white/5 dark:from-indigo-500/15 dark:to-violet-500/10">
          <Icon className="size-6" strokeWidth={1.75} />
        </span>
      </div>
      <h2 className="text-section">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-body">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
