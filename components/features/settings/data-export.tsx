import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DataExport() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-body">
        A CSV of every bill and payment: due dates, amounts, status and confirmation numbers. Opens
        in Excel, Numbers or Google Sheets.
      </p>
      <Button variant="outline" asChild className="shrink-0">
        <a href="/api/export" download>
          <Download aria-hidden="true" />
          Export CSV
        </a>
      </Button>
    </div>
  );
}
