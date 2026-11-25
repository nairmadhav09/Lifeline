"use client";

import { format, parseISO } from "date-fns";
import { ExternalLink, FileImage, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
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
import { deleteDocument, getDocumentUrl, registerDocument } from "@/lib/actions/documents";
import type { DocumentItem } from "@/lib/data/documents";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/heic"] as const;
type AllowedType = (typeof TYPES)[number];
const MAX = 10 * 1024 * 1024;

function storagePath(userId: string, name: string): string {
  const safe = name.replace(/[^\w.-]+/g, "_").slice(-80);
  return `${userId}/uploads/${Date.now()}-${safe}`;
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsView({
  documents,
  userId,
}: {
  documents: DocumentItem[];
  userId: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [deleting, setDeleting] = useState<DocumentItem | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files);
    const bad = list.find((f) => !TYPES.includes(f.type as AllowedType) || f.size > MAX);
    if (bad) {
      toast.error(`${bad.name}: use a PDF, PNG, JPG, WEBP or HEIC file up to 10 MB.`);
      return;
    }
    setUploading(true);
    const supabase = createClient();
    let done = 0;
    for (const f of list) {
      const path = storagePath(userId, f.name);
      const { error } = await supabase.storage
        .from("documents")
        .upload(path, f, { contentType: f.type, upsert: false });
      if (error) {
        toast.error(`Couldn't upload ${f.name}.`);
        continue;
      }
      const res = await registerDocument({
        path,
        fileName: f.name,
        mimeType: f.type as AllowedType,
        size: f.size,
      });
      if (!res.ok) toast.error(res.error);
      else done++;
    }
    setUploading(false);
    if (input.current) input.current.value = "";
    if (done) {
      toast.success(done === 1 ? "File uploaded" : `${done} files uploaded`);
      router.refresh();
    }
  };

  const open = async (d: DocumentItem) => {
    setOpening(d.id);
    const res = await getDocumentUrl(d.id);
    setOpening(null);
    if (!res.ok) return void toast.error(res.error);
    window.open(res.data.url, "_blank", "noopener,noreferrer");
  };

  const remove = (d: DocumentItem) =>
    startTransition(async () => {
      const res = await deleteDocument(d.id);
      setDeleting(null);
      if (!res.ok) return void toast.error(res.error);
      toast.success(`${d.fileName} deleted`);
    });

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors duration-150",
          dragging ? "border-primary bg-accent/60" : "border-input bg-card/60",
        )}
      >
        <input
          ref={input}
          type="file"
          multiple
          accept={TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => e.target.files && void upload(e.target.files)}
        />
        <Upload className="mb-2 size-5 text-meta" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">Drop bills or receipts here</p>
        <p className="mt-0.5 text-xs text-meta">PDF, PNG, JPG, WEBP or HEIC, up to 10 MB each</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => input.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Upload aria-hidden="true" />
          )}
          {uploading ? "Uploading…" : "Choose files"}
        </Button>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Receipts you attach when marking a bill paid, and files you upload here, are kept together in this list."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden surface">
          {documents.map((d) => {
            const isImage = d.mimeType.startsWith("image/");
            const Icon = isImage ? FileImage : FileText;
            return (
              <li key={d.id} className="group flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <span
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-meta"
                  aria-hidden="true"
                >
                  <Icon className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{d.fileName}</p>
                  <p className="truncate text-xs text-meta tabular-nums">
                    {d.bill
                      ? `Receipt for ${d.bill.title} · due ${format(parseISO(d.bill.dueDate), "MMM d")}`
                      : "Uploaded file"}
                    {" · "}
                    {format(parseISO(d.createdAt), "MMM d, yyyy")}
                    {d.size !== null && ` · ${formatSize(d.size)}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => open(d)}
                  disabled={opening === d.id}
                  aria-label={`Open ${d.fileName}`}
                >
                  {opening === d.id ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <ExternalLink aria-hidden="true" />
                  )}
                  <span className="hidden sm:inline">Open</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-meta hover:bg-status-overdue-bg hover:text-status-overdue"
                  onClick={() => setDeleting(d)}
                  aria-label={`Delete ${d.fileName}`}
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.fileName}?</AlertDialogTitle>
            <AlertDialogDescription>
              The file is removed permanently.
              {deleting?.bill &&
                " The bill stays marked as paid; it just won't have a receipt attached."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive bg-none text-destructive-foreground hover:bg-destructive/90"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                if (deleting) remove(deleting);
              }}
            >
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Delete file
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
