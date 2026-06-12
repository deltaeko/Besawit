import { Badge } from "@/components/ui/badge";

type Status =
  | "paid"
  | "unpaid"
  | "partial"
  | "overdue"
  | "approved"
  | "pending"
  | "submitted"
  | "active"
  | "cancelled";

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const normalized = (status ?? "pending") as Status;
  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  if (["paid", "approved", "active"].includes(normalized)) {
    return <Badge variant="success">{label}</Badge>;
  }

  if (["partial", "submitted", "pending"].includes(normalized)) {
    return <Badge variant="warning">{label}</Badge>;
  }

  if (["overdue", "cancelled"].includes(normalized)) {
    return <Badge variant="destructive">{label}</Badge>;
  }

  return <Badge variant="neutral">{label}</Badge>;
}
