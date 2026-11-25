import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-input bg-card px-3.5 text-base text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:text-sm",
        "transition-[border-color,box-shadow] duration-150 ease-out outline-none",
        "selection:bg-primary selection:text-primary-foreground placeholder:text-faint",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-ring/40",
        "aria-invalid:border-destructive/60 aria-invalid:ring-destructive/15",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
