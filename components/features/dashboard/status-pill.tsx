import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/instances/status";
import type { InstanceStatus } from "@/types/domain";

export function StatusPill({ status, className }: { status: InstanceStatus; className?: string }) {
  return (
    <Badge variant={status} className={className}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-80" />
      {STATUS_LABEL[status]}
    </Badge>
  );
}
