import Link from "next/link";
import { Leaf, ReceiptText, Store, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  formatPalmStatusLabel,
  resolvePalmStatusBadgeVariant,
} from "@/modules/palm/status-utils";

type ActivityRecord = Record<string, unknown>;

function resolveActivityMeta(record: ActivityRecord) {
  if ("saleDate" in record) {
    return {
      href: `/palm/sales/${String(record.id ?? "")}`,
      label: "Sale ke Pabrik",
      tone: "bg-[#315d3f]/10 text-[#274b31]",
      icon: Leaf,
      value: Number(record.totalSales ?? 0),
      date: record.saleDate,
      status: String(record.paymentStatus ?? "-"),
      helper: "Penjualan TBS",
    };
  }

  if ("purchaseDate" in record) {
    return {
      href: `/palm/purchases/${String(record.id ?? "")}`,
      label: "Beli TBS",
      tone: "bg-[#d8f26a]/35 text-[#48652a]",
      icon: Truck,
      value: Number(record.totalPurchase ?? 0),
      date: record.purchaseDate,
      status: String(record.paymentStatus ?? "-"),
      helper: "Pembelian TBS",
    };
  }

  return {
    href: `/store/sales/${String(record.id ?? "")}`,
    label: "Sales Toko",
    tone: "bg-[#dde7ff] text-[#38528a]",
    icon: Store,
    value: Number(record.totalAmount ?? 0),
    date: record.transactionDate,
    status: String(record.paymentStatus ?? "-"),
    helper: "Transaksi toko",
  };
}

export function RecentActivityFeed({
  items,
}: {
  items: ActivityRecord[];
}) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const meta = resolveActivityMeta(item);
        const Icon = meta.icon;
        const code = String(item.code ?? "-");

        return (
          <Link
            key={`${code}-${index}`}
            href={meta.href}
            className="block rounded-[1.6rem] border border-border/70 bg-card/70 p-4 transition hover:border-border hover:bg-card/90"
          >
            <div className="flex items-start gap-4">
              <div className={`mt-0.5 rounded-2xl p-2.5 ${meta.tone}`}>
                <Icon className="size-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-border/70 bg-background/75 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        {meta.label}
                      </span>
                      <Badge variant={resolvePalmStatusBadgeVariant(meta.status)}>
                        {formatPalmStatusLabel(meta.status)}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
                      <ReceiptText className="size-4 text-muted-foreground" />
                      <span className="truncate">{code}</span>
                    </div>

                    <div className="mt-1 text-sm text-muted-foreground">
                      {meta.helper} • {formatDate(meta.date as Date | string | null)}
                    </div>
                  </div>

                  <div className="text-left md:text-right">
                    <div className="text-lg font-semibold tracking-tight text-foreground">
                      {formatCurrency(meta.value)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Buka detail transaksi
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
