import type { InstanceStatus, Recurrence } from "@/types/domain";

/** A task instance as the UI consumes it (non-null, camelCase). */
export type InstanceItem = {
  id: string;
  taskId: string;
  period: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number | null;
  status: InstanceStatus;
  paidAt: string | null;
  confirmationNumber: string | null;
  receiptPath: string | null;
  title: string;
  payee: string | null;
  currency: string;
  isVariable: boolean;
  recurrence: Recurrence;
  autopay: boolean;
  category: CategoryRef | null;
};

export type CategoryRef = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

/** Fields an optimistic update may change. */
export type InstancePatch = Partial<
  Pick<
    InstanceItem,
    "status" | "amountPaid" | "paidAt" | "confirmationNumber" | "receiptPath" | "category"
  >
>;
