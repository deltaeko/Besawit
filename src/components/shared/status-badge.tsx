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

  if (["paid", "approved", "active"].includes(normalized)) {
    return <Badge variant="success">{normalized}</Badge>;
  }

  if (["partial", "submitted", "pending"].includes(normalized)) {
    return <Badge variant="warning">{normalized}</Badge>;
  }

  if (["overdue", "cancelled"].includes(normalized)) {
    return <Badge variant="destructive">{normalized}</Badge>;
  }

  return <Badge variant="neutral">{normalized}</Badge>;
}
