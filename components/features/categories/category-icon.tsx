import {
  BookOpen,
  Briefcase,
  Car,
  CircleEllipsis,
  CreditCard,
  Dumbbell,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Landmark,
  type LucideIcon,
  PawPrint,
  Phone,
  PiggyBank,
  Plane,
  Receipt,
  Repeat,
  ShieldCheck,
  ShoppingCart,
  Tv,
  Wifi,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Curated lucide icons a category can use (stored by kebab-case name). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  house: House,
  zap: Zap,
  "shield-check": ShieldCheck,
  landmark: Landmark,
  repeat: Repeat,
  "hand-coins": HandCoins,
  "credit-card": CreditCard,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  "circle-ellipsis": CircleEllipsis,
  car: Car,
  wifi: Wifi,
  phone: Phone,
  tv: Tv,
  dumbbell: Dumbbell,
  plane: Plane,
  "paw-print": PawPrint,
  "piggy-bank": PiggyBank,
  "shopping-cart": ShoppingCart,
  receipt: Receipt,
  briefcase: Briefcase,
  "book-open": BookOpen,
};

/** Literal class strings so Tailwind can see them. Muted pastels only. */
export const CATEGORY_COLOR_CLASSES: Record<string, string> = {
  indigo: "bg-[var(--cat-indigo-bg)] text-[var(--cat-indigo-fg)]",
  sky: "bg-[var(--cat-sky-bg)] text-[var(--cat-sky-fg)]",
  teal: "bg-[var(--cat-teal-bg)] text-[var(--cat-teal-fg)]",
  emerald: "bg-[var(--cat-emerald-bg)] text-[var(--cat-emerald-fg)]",
  amber: "bg-[var(--cat-amber-bg)] text-[var(--cat-amber-fg)]",
  orange: "bg-[var(--cat-orange-bg)] text-[var(--cat-orange-fg)]",
  rose: "bg-[var(--cat-rose-bg)] text-[var(--cat-rose-fg)]",
  pink: "bg-[var(--cat-pink-bg)] text-[var(--cat-pink-fg)]",
  violet: "bg-[var(--cat-violet-bg)] text-[var(--cat-violet-fg)]",
  slate: "bg-[var(--cat-slate-bg)] text-[var(--cat-slate-fg)]",
};

/** Solid dot color for legends, calendar dots and charts. */
export const CATEGORY_DOT_COLOR: Record<string, string> = {
  indigo: "var(--cat-indigo-fg)",
  sky: "var(--cat-sky-fg)",
  teal: "var(--cat-teal-fg)",
  emerald: "var(--cat-emerald-fg)",
  amber: "var(--cat-amber-fg)",
  orange: "var(--cat-orange-fg)",
  rose: "var(--cat-rose-fg)",
  pink: "var(--cat-pink-fg)",
  violet: "var(--cat-violet-fg)",
  slate: "var(--cat-slate-fg)",
};

export function CategoryIcon({
  icon,
  color,
  label,
  size = "md",
  className,
}: {
  icon: string | null | undefined;
  color: string | null | undefined;
  /** Accessible name; omit when the category name is shown next to it. */
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || CircleEllipsis;
  const colors = (color && CATEGORY_COLOR_CLASSES[color]) || CATEGORY_COLOR_CLASSES.slate;
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        size === "md" ? "size-9 rounded-xl" : "size-6 rounded-lg",
        colors,
        className,
      )}
    >
      <Icon className={size === "md" ? "size-[18px]" : "size-3.5"} strokeWidth={1.9} />
    </span>
  );
}
