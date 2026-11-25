import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-base text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:text-sm",
        "transition-[border-color,box-shadow] duration-150 ease-out outline-none placeholder:text-faint",
        "focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive/60",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
