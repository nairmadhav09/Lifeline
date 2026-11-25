"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
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
import { deleteAccount } from "@/lib/actions/settings";

export function DangerZone({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      // On success the action redirects to /login and never returns.
      const res = await deleteAccount(confirm);
      if (res && !res.ok) toast.error(res.error);
    });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-body">
        Permanently delete your account, every bill, payment and uploaded file. This can&apos;t be
        undone, so export your data first if you might want it.
      </p>
      <Button
        variant="outline"
        className="shrink-0 border-rose-200 text-status-overdue hover:bg-status-overdue-bg dark:border-rose-500/30"
        onClick={() => setOpen(true)}
      >
        <Trash2 aria-hidden="true" />
        Delete account
      </Button>

      <AlertDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setConfirm("");
        }}
      >
        <AlertDialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="grid gap-4"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes{" "}
                <span className="font-medium text-foreground">{email}</span> and everything in it.
                There is no undo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-delete" className="text-[13px] font-medium text-foreground">
                Type <span className="font-mono">DELETE</span> to confirm
              </Label>
              <Input
                id="confirm-delete"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <Button
                type="submit"
                variant="destructive"
                disabled={confirm.trim() !== "DELETE" || pending}
              >
                {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
                Delete forever
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
