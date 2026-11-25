import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-brand-gradient shadow-[0_2px_6px_-1px_rgba(79,70,229,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[62%]" fill="none">
        <path
          d="M2.5 12.5h4l2-5 3.5 9.5 2-4.5h7.5"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Logo({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!collapsed && (
        <span className="text-[17px] font-semibold tracking-tight text-foreground">Lifeline</span>
      )}
    </span>
  );
}
