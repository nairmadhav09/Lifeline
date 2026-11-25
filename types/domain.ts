import type { Enums, Tables, Views } from "@/types/database";

export type Profile = Tables<"profiles">;
export type Category = Tables<"categories">;
export type Task = Tables<"tasks">;
export type TaskInstance = Tables<"task_instances">;
export type DocumentRow = Tables<"documents">;
export type AiInsight = Tables<"ai_insights">;

export type Recurrence = Enums<"recurrence_type">;
export type InstanceStatus = Enums<"instance_status">;
export type InsightType = Enums<"insight_type">;

/** Instances as read through task_instance_details (status is derived, never stale). */
export type InstanceDetails = Views<"task_instance_details">;

export const CATEGORY_COLORS = [
  "indigo",
  "sky",
  "teal",
  "emerald",
  "amber",
  "orange",
  "rose",
  "pink",
  "violet",
  "slate",
] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

/** Typed result for every Server Action. */
export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
