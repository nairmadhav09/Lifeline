import { NextResponse } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";

/** Quote a CSV field; neutralise spreadsheet formula injection (=, +, -, @). */
function csv(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** GET /api/export → every bill occurrence the user has, as CSV (RLS-scoped). */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_instance_details")
    .select(
      "period, due_date, title, payee, category_name, recurrence, amount_due, amount_paid, currency, status, paid_at, confirmation_number, autopay, payment_method, account_reference, task_is_archived",
    )
    .order("due_date");
  if (error) return NextResponse.json({ error: "Export failed" }, { status: 500 });

  const header = [
    "Month",
    "Due date",
    "Bill",
    "Payee",
    "Category",
    "Repeats",
    "Amount due",
    "Amount paid",
    "Currency",
    "Status",
    "Paid on",
    "Confirmation",
    "Autopay",
    "Paid with",
    "Account (last 4)",
    "Archived",
  ];
  const lines = data.map((r) =>
    [
      r.period?.slice(0, 7),
      r.due_date,
      r.title,
      r.payee,
      r.category_name ?? "Uncategorized",
      r.recurrence,
      r.amount_due,
      r.amount_paid,
      r.currency,
      r.status,
      r.paid_at?.slice(0, 10),
      r.confirmation_number,
      r.autopay ? "yes" : "no",
      r.payment_method,
      r.account_reference,
      r.task_is_archived ? "yes" : "no",
    ]
      .map(csv)
      .join(","),
  );

  const body = `﻿${[header.join(","), ...lines].join("\r\n")}\r\n`;
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lifeline-export-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
