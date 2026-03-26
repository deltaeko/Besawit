export function resolvePalmStatusBadgeVariant(
  status: string,
): "success" | "warning" | "destructive" | "neutral" {
  if (["paid", "approved", "active"].includes(status)) return "success";
  if (["partial", "submitted", "pending", "draft"].includes(status)) {
    return "warning";
  }
  if (["overdue", "cancelled", "void", "rejected"].includes(status)) {
    return "destructive";
  }
  return "neutral";
}

export function formatPalmStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Aktif",
    cancelled: "Dibatalkan",
    void: "Void",
    unpaid: "Belum Dibayar",
    partial: "Sebagian",
    paid: "Lunas",
    overdue: "Jatuh Tempo",
    submitted: "Diajukan",
    approved: "Disetujui",
    pending: "Menunggu",
    draft: "Draft",
  };

  return labels[status] ?? status;
}
