"use client";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CATEGORY_COLOR_CLASSES,
  CATEGORY_ICONS,
  CategoryIcon,
} from "@/components/features/categories/category-icon";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  createCategory,
  deleteCategory,
  updateCategory,
  type CategoryInput,
} from "@/lib/actions/settings";
import type { CategoryRef } from "@/lib/instances/types";
import { cn } from "@/lib/utils";
import { pluralize } from "@/lib/utils/format";
import { CATEGORY_COLORS, type CategoryColor } from "@/types/domain";

export function CategoriesManager({
  categories,
  counts,
}: {
  categories: CategoryRef[];
  counts: Record<string, number>;
}) {
  const [deleting, setDeleting] = useState<CategoryRef | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = (c: CategoryRef) =>
    startTransition(async () => {
      const res = await deleteCategory(c.id);
      setDeleting(null);
      if (!res.ok) return void toast.error(res.error);
      toast.success(`${c.name} deleted`);
    });

  return (
    <div>
      <ul className="divide-y divide-border rounded-xl border">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
            <CategoryIcon icon={c.icon} color={c.color} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
              <p className="text-xs text-meta tabular-nums">
                {pluralize(counts[c.id] ?? 0, "bill")}
              </p>
            </div>
            <CategoryEditor
              initial={c}
              trigger={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-meta"
                  aria-label={`Edit ${c.name}`}
                >
                  <Pencil />
                </Button>
              }
              onSave={(v) => updateCategory(c.id, v)}
              savedMessage="Category updated"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-meta hover:bg-status-overdue-bg hover:text-status-overdue"
              aria-label={`Delete ${c.name}`}
              onClick={() => setDeleting(c)}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>

      <CategoryEditor
        initial={{ name: "", icon: "receipt", color: "indigo" }}
        trigger={
          <Button variant="outline" size="sm" className="mt-3">
            <Plus aria-hidden="true" />
            Add category
          </Button>
        }
        onSave={(v) => createCategory(v)}
        savedMessage="Category added"
        resetOnSave
      />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (counts[deleting.id] ?? 0) > 0
                ? `${pluralize(counts[deleting.id] ?? 0, "bill")} in this category will become Uncategorized. The bills themselves are kept.`
                : "No bills use this category."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive bg-none text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (deleting) remove(deleting);
              }}
              disabled={pending}
            >
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Delete category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CategoryEditor({
  initial,
  trigger,
  onSave,
  savedMessage,
  resetOnSave,
}: {
  initial: { name: string; icon: string; color: string };
  trigger: React.ReactNode;
  onSave: (v: CategoryInput) => Promise<{ ok: boolean; error?: string }>;
  savedMessage: string;
  resetOnSave?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial.name);
  const [icon, setIcon] = useState(initial.icon);
  const [color, setColor] = useState<CategoryColor>(
    (CATEGORY_COLORS as readonly string[]).includes(initial.color)
      ? (initial.color as CategoryColor)
      : "slate",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const save = () =>
    startSaving(async () => {
      const res = await onSave({ name, icon, color });
      if (!res.ok) return setError(res.error ?? "Couldn't save");
      toast.success(savedMessage);
      setOpen(false);
      if (resetOnSave) {
        setName("");
        setError(null);
      }
    });

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setError(null);
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 rounded-2xl p-4 shadow-pop">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <CategoryIcon icon={icon} color={color} />
            <div className="flex-1 space-y-1">
              <Label htmlFor="cat-name" className="sr-only">
                Category name
              </Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name"
                maxLength={40}
                autoFocus
                className="h-9"
                aria-invalid={!!error}
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="-mt-2 text-xs text-status-overdue">
              {error}
            </p>
          )}

          <fieldset>
            <legend className="mb-2 text-xs font-medium text-meta">Color</legend>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  aria-pressed={color === c}
                  className={cn(
                    "size-7 rounded-lg transition-[box-shadow] duration-150 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none",
                    CATEGORY_COLOR_CLASSES[c],
                    color === c && "ring-2 ring-primary ring-offset-2 ring-offset-popover",
                  )}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs font-medium text-meta">Icon</legend>
            <div className="grid grid-cols-8 gap-1">
              {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  aria-label={key.replace(/-/g, " ")}
                  aria-pressed={icon === key}
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-lg text-meta transition-colors duration-150 hover:bg-muted hover:text-foreground",
                    "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none",
                    icon === key && "bg-accent text-accent-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving || name.trim() === ""}>
              {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
              Save
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
