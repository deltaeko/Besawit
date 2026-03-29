import { ClipboardList } from "lucide-react";

import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

const actionLabels: Record<string, string> = {
  create: "Buat",
  update: "Ubah",
  status_change: "Ubah Status",
  activate: "Aktifkan",
  deactivate: "Nonaktifkan",
  price_update: "Ubah Harga",
  submit: "Submit",
  approve: "Approve",
  apply: "Terapkan",
  reverse: "Batalkan",
  post_payable_payment: "Pembayaran Hutang",
  post_receivable_payment: "Pembayaran Piutang",
  post_payment: "Pembayaran",
};

type AuditLogItem = {
  id: string;
  action: string;
  createdAt: Date;
  actorName?: string | null;
  actorEmail?: string | null;
};

export function AuditLogPanel({ items }: { items: AuditLogItem[] }) {
  return (
    <SectionCard
      title="Audit Log"
      description="Jejak perubahan data: siapa yang melakukan perubahan dan kapan."
    >
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/10 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-border/70 bg-card p-1.5 text-muted-foreground">
                  <ClipboardList className="size-3.5" />
                </div>
                <div>
                  <div className="font-medium text-foreground">
                    {actionLabels[item.action] ?? item.action}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {item.actorName ?? "Sistem"}
                    {item.actorEmail ? ` - ${item.actorEmail}` : ""}
                  </div>
                </div>
              </div>
              <Badge className="text-[11px]" variant="neutral">
                {formatDateTime(item.createdAt)}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Belum ada jejak audit untuk data ini.
        </div>
      )}
    </SectionCard>
  );
}
