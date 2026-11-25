import { cn } from "@/lib/utils";

export function SettingsSection({
  title,
  description,
  tone = "default",
  children,
}: {
  title: string;
  description: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  const id = `settings-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "grid gap-6 surface p-5 sm:p-6 lg:grid-cols-[16rem_minmax(0,1fr)]",
        tone === "danger" && "border-rose-200/70 dark:border-rose-500/25",
      )}
    >
      <div>
        <h2 id={id} className={cn("text-section", tone === "danger" && "text-status-overdue")}>
          {title}
        </h2>
        <p className="mt-1 text-sm text-body">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
