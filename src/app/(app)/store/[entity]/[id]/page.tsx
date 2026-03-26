import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Receipt, Warehouse } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatPalmStatusLabel, resolvePalmStatusBadgeVariant } from "@/modules/palm/status-utils";
import { isStoreEntity } from "@/modules/store/helpers";
import { getStorePurchase, getStoreSale } from "@/services/store-service";

function MetricCard({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={
        emphasis
          ? "rounded-2xl border border-primary/20 bg-primary/10 p-4"
          : "rounded-2xl border border-border/80 bg-muted/20 p-4"
      }
    >
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className={emphasis ? "mt-2 text-2xl font-semibold tracking-tight" : "mt-2 text-base font-semibold"}>
        {value}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-3 last:border-b-0">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-right text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const { entity, id } = await params;
  if (!isStoreEntity(entity)) notFound();

  const data =
    entity === "purchases"
      ? await getStorePurchase(id).catch(() => null)
      : await getStoreSale(id).catch(() => null);

  if (!data) notFound();

  const isPurchase = entity === "purchases";
  const paymentStatus = String(data.paymentStatus ?? "unpaid");
  const transactionStatus = String(data.status ?? "active");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transaksi Toko"
        title={isPurchase ? "Detail Pembelian Barang" : "Detail Penjualan Toko"}
        description={
          isPurchase
            ? "Periksa informasi supplier, nilai transaksi, dan status pembayaran pembelian barang toko."
            : "Periksa pelanggan toko, jenis penjualan, nilai transaksi, dan status pembayaran atau piutang."
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/store/${entity}`}>
                <ArrowLeft className="size-4" />
                Kembali
              </Link>
            </Button>
            {!isPurchase ? (
              <Button asChild variant="outline">
                <Link href={`/store/sales/${id}/invoice`}>
                  <FileText className="size-4" />
                  Preview Nota
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="space-y-3">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Store</div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Kode Transaksi
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">{data.code}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={resolvePalmStatusBadgeVariant(transactionStatus)}>
                {formatPalmStatusLabel(transactionStatus)}
              </Badge>
              <Badge variant={resolvePalmStatusBadgeVariant(paymentStatus)}>
                {formatPalmStatusLabel(paymentStatus)}
              </Badge>
              {!isPurchase ? (
                <Badge variant={String((data as { saleType?: string }).saleType) === "credit" ? "warning" : "neutral"}>
                  {String((data as { saleType?: string }).saleType) === "credit" ? "Kredit" : "Tunai"}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Tanggal transaksi {formatDate(String(data.transactionDate))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <SectionCard title="Informasi Umum" description="Rincian pihak transaksi, gudang, dan referensi invoice.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="Tanggal" value={formatDate(String(data.transactionDate))} />
              <MetricCard
                label={isPurchase ? "Supplier" : "Pelanggan Toko"}
                value={String(
                  isPurchase
                    ? (data as Record<string, unknown>).supplierName ?? "-"
                    : (data as Record<string, unknown>).customerName ?? "-",
                )}
              />
              <MetricCard
                label="Gudang"
                value={String((data as Record<string, unknown>).warehouseName ?? "-")}
              />
            </div>
            <div className="mt-4 rounded-2xl border border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <Warehouse className="size-4 text-primary" />
                Nomor Referensi
              </div>
              {String(data.invoiceNumber ?? "-")}
            </div>
          </SectionCard>

          <SectionCard title="Ringkasan Nilai" description="Komponen nilai transaksi yang tersimpan pada dokumen toko.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Subtotal" value={formatCurrency(Number(data.subtotal))} />
              <MetricCard label="Diskon" value={formatCurrency(Number(data.discount))} />
              <MetricCard label="Pajak" value={formatCurrency(Number(data.tax))} />
              <MetricCard emphasis label="Total Transaksi" value={formatCurrency(Number(data.totalAmount))} />
            </div>
          </SectionCard>

          <SectionCard title="Catatan" description="Catatan tambahan transaksi untuk audit dan tindak lanjut operasional.">
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 text-sm leading-7 text-foreground">
              {String(data.notes ?? "").trim() || "Tidak ada catatan."}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Status Dokumen" description="Status transaksi dan pembayaran yang aktif saat ini.">
          <div className="space-y-1">
            <DetailRow label="Status Transaksi" value={formatPalmStatusLabel(transactionStatus)} />
            <DetailRow label="Status Pembayaran" value={formatPalmStatusLabel(paymentStatus)} />
            {!isPurchase ? (
              <DetailRow
                label="Jenis Penjualan"
                value={String((data as { saleType?: string }).saleType) === "credit" ? "Kredit" : "Tunai"}
              />
            ) : null}
            <DetailRow label="Kode" value={data.code} />
            <DetailRow label="Tanggal Dibuat" value={formatDate(String(data.createdAt))} />
          </div>
          <div className="mt-4 rounded-2xl border border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground">
            <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
              <Receipt className="size-4 text-primary" />
              Catatan operasional
            </div>
            {isPurchase
              ? "Pembelian toko memengaruhi stok masuk dan hutang supplier."
              : "Penjualan toko memengaruhi stok keluar dan piutang pelanggan toko bila transaksi kredit."}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
