"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MarkPaidInput } from "@/lib/actions/instances";
import type { InstanceItem } from "@/lib/instances/types";
import { createClient } from "@/lib/supabase/client";
import { formatShortDate } from "@/lib/utils/dates";

const RECEIPT_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/heic"];
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

const formSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Enter the amount you paid")
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v.replace(/,/g, "")), "Use a number like 142.50"),
  paidOn: z.iso.date("Pick a date"),
  confirmationNumber: z.string().trim().max(80, "Keep it under 80 characters"),
});

type FormValues = z.infer<typeof formSchema>;

/** documents/<uid>/receipts/<instance>/<timestamp>-<name>. The uid prefix is enforced by storage RLS. */
function receiptStoragePath(userId: string, instanceId: string, fileName: string): string {
  const safeName = fileName.replace(/[^\w.-]+/g, "_").slice(-80);
  return `${userId}/receipts/${instanceId}/${Date.now()}-${safeName}`;
}

type Props = {
  item: InstanceItem;
  userId: string;
  today: string;
  onSubmit: (details: Omit<MarkPaidInput, "instanceId">) => void;
  onCancel: () => void;
};

export function MarkPaidForm({ item, userId, today, onSubmit, onCancel }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: item.amountDue.toFixed(2),
      paidOn: today,
      confirmationNumber: "",
    },
  });
  const { errors } = form.formState;

  const pickFile = (f: File | undefined) => {
    setFileError(null);
    if (!f) return setFile(null);
    if (!RECEIPT_TYPES.includes(f.type))
      return setFileError("Use a PDF, PNG, JPG, WEBP or HEIC file.");
    if (f.size > MAX_RECEIPT_BYTES) return setFileError("Receipts must be 10 MB or smaller.");
    setFile(f);
  };

  const submit = form.handleSubmit(async (values) => {
    let receipt: MarkPaidInput["receipt"];
    if (file) {
      setUploading(true);
      const path = receiptStoragePath(userId, item.id, file.name);
      const { error } = await createClient()
        .storage.from("documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      setUploading(false);
      if (error) {
        setFileError("Couldn't upload the receipt. Try again, or save without it.");
        return;
      }
      receipt = {
        path,
        fileName: file.name.slice(0, 255),
        mimeType: file.type as NonNullable<MarkPaidInput["receipt"]>["mimeType"],
        size: file.size,
      };
    }
    onSubmit({
      amountPaid: Number(values.amount.replace(/,/g, "")),
      paidOn: values.paidOn,
      confirmationNumber: values.confirmationNumber || undefined,
      receipt,
    });
  });

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div>
        <p className="text-sm font-semibold text-foreground">Mark as paid</p>
        <p className="text-xs text-meta">
          {item.title} · due {formatShortDate(item.dueDate)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Amount paid" htmlFor={`amount-${item.id}`} error={errors.amount?.message}>
          <Input
            id={`amount-${item.id}`}
            inputMode="decimal"
            autoComplete="off"
            className="h-9 tabular-nums"
            aria-invalid={!!errors.amount}
            {...form.register("amount")}
          />
        </Field>
        <Field label="Paid on" htmlFor={`paidOn-${item.id}`} error={errors.paidOn?.message}>
          <Input
            id={`paidOn-${item.id}`}
            type="date"
            max={today}
            className="h-9 tabular-nums"
            aria-invalid={!!errors.paidOn}
            {...form.register("paidOn")}
          />
        </Field>
      </div>

      <Field
        label="Confirmation number"
        optional
        htmlFor={`conf-${item.id}`}
        error={errors.confirmationNumber?.message}
      >
        <Input
          id={`conf-${item.id}`}
          autoComplete="off"
          placeholder="e.g. 8F3K2Q"
          className="h-9"
          {...form.register("confirmationNumber")}
        />
      </Field>

      <div>
        <input
          ref={fileInput}
          type="file"
          accept={RECEIPT_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
        {file ? (
          <div className="flex items-center gap-2 rounded-xl border border-input bg-muted/40 px-3 py-2 text-xs">
            <Paperclip className="size-3.5 shrink-0 text-meta" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-foreground">{file.name}</span>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileInput.current) fileInput.current.value = "";
              }}
              className="rounded-md p-0.5 text-meta hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label="Remove receipt"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 text-meta"
            onClick={() => fileInput.current?.click()}
          >
            <Paperclip aria-hidden="true" />
            Attach receipt
          </Button>
        )}
        {fileError && (
          <p role="alert" className="mt-1 text-xs text-status-overdue">
            {fileError}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={uploading}>
          {uploading && <Loader2 className="animate-spin" aria-hidden="true" />}
          {uploading ? "Uploading…" : "Save payment"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  optional,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
        {label}
        {optional && <span className="font-normal text-meta"> (optional)</span>}
      </Label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-status-overdue">
          {error}
        </p>
      )}
    </div>
  );
}
