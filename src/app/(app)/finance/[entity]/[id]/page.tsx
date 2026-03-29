import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Landmark, Wallet } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { SimpleTable } from "@/components/shared/simple-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canPerformAction } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { formatPalmStatusLabel, resolvePalmStatusBadgeVariant } from "@/modules/palm/status-utils";
import { getPayableDetail, getReceivableDetail } from "@/services/finance-service";

function getDueDateMeta(value?: Date | string | null) {
  if (!value) {
    return {
      dateLabel: "-",
      hint: "Belum ditetapkan",
      tone: "muted" as const,
    };
  }

  const dueDate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dueDate.getTime())) {
    return {
      dateLabel: "-",
      hint: "Belum ditetapkan",
      tone: "muted" as const,
    };
  }

  const dueMidnight = new Date(dueDate);
  dueMidnight.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((dueMidnight.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) {
    return {
      dateLabel: formatDate(dueDate),
      hint: `Lewat ${Math.abs(diffDays)} hari`,
      tone: "danger" as const,
    };
  }

  if (diffDays === 0) {
    return {
      dateLabel: formatDate(dueDate),
      hint: "Hari ini",
      tone: "warning" as const,
    };
  }

  return {
    dateLabel: formatDate(dueDate),
    hint: `${diffDays} hari lagi`,
    tone: diffDays <= 7 ? ("warning" as const) : ("default" as const),
  };
}

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

function PaymentHistoryTable({
  rows,
}: {
  rows: Array<{
    id: string;
    code: string;
    paymentDate: Date | string;
    method: string;
    amount: string | number;
    ledgerCategory?: string | null;
    notes?: string | null;
    createdByName?: string | null;
  }>;
}) {
  return (
    <SimpleTable
      cellRenderers={{
        amount: (value) => formatCurrency(Number(value ?? 0)),
      }}
      columnLabels={{
        code: "Kode Payment",
        paymentDate: "Tanggal",
        method: "Metode",
        amount: "Nominal",
        ledgerCategory: "Kas/Bank",
        notes: "Catatan",
        createdByName: "Dicatat Oleh",
      }}
      columns={
        rows[0]
          ? Object.keys(rows[0]).filter((key) => key !== "id")
          : ["code", "paymentDate", "method", "amount", "ledgerCategory", "notes", "createdByName"]
      }
      getHref={(row) => `/print/payments/${row.id}/receipt`}
      linkColumn="code"
      numericColumns={["amount"]}
      rows={rows.map((item) => ({
        id: item.id,
        code: item.code,
        paymentDate: formatDateTime(item.paymentDate),
        method:
          item.method === "cash"
            ? "Tunai"
            : item.method === "bank_transfer"
              ? "Transfer Bank"
              : item.method === "giro"
                ? "Giro"
                : "Lainnya",
        amount: Number(item.amount),
        ledgerCategory: item.ledgerCategory ?? "-",
        notes: item.notes?.trim() || "-",
        createdByName: item.createdByName ?? "Sistem",
      }))}
    />
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

function SummaryList({
  rows,
}: {
  rows: Array<{
    label: string;
    value: string;
    emphasis?: boolean;
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-muted/10">
      {rows.map((row, index) => (
        <div
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 border-b border-border/70 px-5 py-4 last:border-b-0"
          key={`${row.label}-${index}`}
        >
          <div className="text-sm text-muted-foreground">{row.label}</div>
          <div
            className={
              row.emphasis
                ? "text-right text-xl font-semibold tracking-tight text-foreground"
                : "text-right text-base font-semibold text-foreground"
            }
          >
            {row.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function FinanceActionButton({
  href,
  label,
  disabled,
  disabledLabel,
  disabledReason,
}: {
  href: string;
  label: string;
  disabled: boolean;
  disabledLabel: string;
  disabledReason?: string;
}) {
  if (disabled) {
    return (
      <Button disabled title={disabledReason ?? "Dokumen ini tidak bisa diproses lagi."}>
        <Wallet className="size-4" />
        {disabledLabel}
      </Button>
    );
  }

  return (
    <Button asChild>
      <Link href={href}>
        <Wallet className="size-4" />
        {label}
      </Link>
    </Button>
  );
}

export default async function FinanceDetailPage({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const { entity, id } = await params;
  if (!["payables", "receivables"].includes(entity)) notFound();
  const session = await getSession();
  const canManagePayments = Boolean(
    session && canPerformAction(session.role, session.permissions, "finance.payments.manage"),
  );

  if (entity === "payables") {
    const data = await getPayableDetail(id).catch(() => null);
    if (!data) notFound();

    const { payable, paymentHistory, farmerStatement, purchaseStoreOffset } = data;
    const partyName = payable.farmerName ?? payable.supplierName ?? "Tanpa pihak";
    const partyLabel =
      payable.partyType === "farmer"
        ? "Petani"
        : payable.partyType === "supplier"
          ? "Supplier"
          : "Pihak";
    const canPostPayment =
      (payable.status === "unpaid" || payable.status === "partial" || payable.status === "overdue") &&
      Number(payable.outstandingAmount ?? 0) > 0;
    const paymentDisabledReason = !canManagePayments
      ? "Anda tidak memiliki hak akses untuk mencatat pembayaran."
      : payable.status === "cancelled"
        ? "Dokumen ini sudah ditutup."
        : "Dokumen ini sudah lunas.";

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Finance"
          title="Detail Hutang"
          description="Pantau saldo hutang, histori pembayaran, dan posisi outstanding per transaksi."
          action={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/finance/payables">
                  <ArrowLeft className="size-4" />
                  Kembali
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/reports/store-debt-offsets">
                  <FileText className="size-4" />
                  Laporan Potong Hasil
                </Link>
              </Button>
              {payable.farmerId ? (
                <Button asChild variant="outline">
                  <Link href={`/master/farmers/${payable.farmerId}/statement`}>
                    <FileText className="size-4" />
                    Preview Statement
                  </Link>
                </Button>
              ) : null}
              <FinanceActionButton
                disabled={!canPostPayment || !canManagePayments}
                disabledLabel={payable.status === "cancelled" ? "Ditutup" : "Lunas"}
                disabledReason={paymentDisabledReason}
                href={`/finance/payments?payableId=${payable.id}`}
                label="Catat Pembayaran"
              />
            </div>
          }
        />

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="space-y-3">
              <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Finance</div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Kode Hutang
                </div>
                <div className="mt-1 text-2xl font-semibold tracking-tight">{payable.code}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={resolvePalmStatusBadgeVariant(payable.status)}>
                  {formatPalmStatusLabel(payable.status)}
                </Badge>
                <Badge variant="neutral">{partyLabel}</Badge>
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Referensi {payable.sourceCode ?? "-"}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <SectionCard title="Ringkasan Hutang" description="Nilai hutang, pembayaran, dan informasi pihak terkait.">
              <SummaryList
                rows={[
                  { label: partyLabel, value: partyName },
                  { label: "Tanggal Referensi", value: formatDate(payable.sourceDate) },
                  { label: "Total Hutang", value: formatCurrency(payable.amount) },
                  { label: "Sisa Hutang", value: formatCurrency(payable.outstandingAmount), emphasis: true },
                  { label: "Sudah Dibayar", value: formatCurrency(payable.paidAmount) },
                  { label: "Jatuh Tempo", value: formatDate(payable.dueDate) },
                ]}
              />
            </SectionCard>

            <SectionCard
              title="Histori Pembayaran"
              description="Semua pembayaran parsial maupun pelunasan untuk transaksi hutang ini."
            >
              <PaymentHistoryTable rows={paymentHistory} />
            </SectionCard>

            {purchaseStoreOffset?.offset ? (
              <SectionCard
                title="Potong Hutang Toko"
                description="Bagian ini menunjukkan potongan hasil panen yang dipakai untuk menutup piutang toko petani terkait transaksi ini."
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <MetricCard
                    label="Mode Potongan"
                    value={
                      purchaseStoreOffset.offset.inputMode === "percentage"
                        ? "Persen"
                        : "Nominal"
                    }
                  />
                  <MetricCard
                    label="Nilai Diminta"
                    value={
                      purchaseStoreOffset.offset.inputMode === "percentage"
                        ? `${formatNumber(purchaseStoreOffset.offset.inputPercentage ?? 0)}%`
                        : formatCurrency(purchaseStoreOffset.offset.inputAmount)
                    }
                  />
                  <MetricCard
                    label="Nilai Diterapkan"
                    value={formatCurrency(purchaseStoreOffset.offset.appliedAmount)}
                  />
                  <MetricCard
                    emphasis
                    label="Jumlah Piutang Toko"
                    value={formatNumber(purchaseStoreOffset.items.length, 0)}
                  />
                </div>

                <div className="mt-5">
                  <SimpleTable
                    columnLabels={{
                      receivableCode: "Kode Piutang",
                      customerName: "Pelanggan Toko",
                      sourceCode: "Referensi Toko",
                      appliedAmount: "Nilai Potong",
                    }}
                    columns={["receivableCode", "customerName", "sourceCode", "appliedAmount"]}
                    numericColumns={["appliedAmount"]}
                    rows={purchaseStoreOffset.items.map((item) => ({
                      id: item.id,
                      receivableCode: item.receivableCode ?? "-",
                      customerName: item.customerName ?? "-",
                      sourceCode: item.sourceCode ?? "-",
                      appliedAmount: Number(item.appliedAmount ?? 0),
                    }))}
                  />
                </div>
              </SectionCard>
            ) : null}

            {farmerStatement ? (
              <SectionCard
                title="Ringkasan Hutang Petani"
                description="Dataset yang sama dipakai untuk statement sisa hutang petani."
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Total Transaksi"
                    value={formatNumber(farmerStatement.summary.transactionCount, 0)}
                  />
                  <MetricCard label="Total Hutang" value={formatCurrency(farmerStatement.summary.totalAmount)} />
                  <MetricCard label="Total Dibayar" value={formatCurrency(farmerStatement.summary.totalPaid)} />
                  <MetricCard label="Potong Hutang Toko" value={formatCurrency(farmerStatement.summary.totalStoreOffset)} />
                  <MetricCard emphasis label="Total Outstanding" value={formatCurrency(farmerStatement.summary.totalOutstanding)} />
                </div>
              </SectionCard>
            ) : null}
          </div>

          <SectionCard title="Metadata Dokumen" description="Ringkasan administratif dokumen hutang.">
            {(() => {
              const dueDateMeta = getDueDateMeta(payable.dueDate);
              return (
                <div
                  className={
                    dueDateMeta.tone === "danger"
                      ? "mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
                      : dueDateMeta.tone === "warning"
                        ? "mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
                        : "mb-4 rounded-2xl border border-border/80 bg-muted/20 px-4 py-3"
                  }
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Jatuh Tempo
                  </div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{dueDateMeta.dateLabel}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{dueDateMeta.hint}</div>
                </div>
              );
            })()}
            <div className="space-y-1">
              <DetailRow label="Kode Hutang" value={payable.code} />
              <DetailRow label="Pihak" value={partyName} />
              <DetailRow label="Referensi" value={payable.sourceCode ?? "-"} />
              <DetailRow label="Status" value={formatPalmStatusLabel(payable.status)} />
              <DetailRow label="Tanggal Dibuat" value={formatDate(payable.createdAt)} />
              <DetailRow label="Catatan" value={payable.notes?.trim() || "Tidak ada catatan"} />
            </div>
            <div className="mt-4 rounded-2xl border border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <Landmark className="size-4 text-primary" />
                Tindak lanjut
              </div>
              Pembayaran dicatat terpisah agar histori hutang dan bukti pembayaran tetap rapi untuk audit.
            </div>
          </SectionCard>
        </div>
      </div>
    );
  }

  const data = await getReceivableDetail(id).catch(() => null);
  if (!data) notFound();

  const { receivable, paymentHistory } = data;
  const partyName = receivable.factoryName ?? receivable.customerName ?? "Tanpa pihak";
  const farmerLabel = receivable.farmerName
    ? receivable.farmerCode
      ? `${receivable.farmerName} (${receivable.farmerCode})`
      : receivable.farmerName
    : null;
  const canPostReceipt =
    (receivable.status === "unpaid" ||
      receivable.status === "partial" ||
      receivable.status === "overdue") &&
    Number(receivable.outstandingAmount ?? 0) > 0;
  const receiptDisabledReason = !canManagePayments
    ? "Anda tidak memiliki hak akses untuk mencatat penerimaan."
    : receivable.status === "cancelled"
      ? "Dokumen ini sudah ditutup."
      : "Dokumen ini sudah lunas.";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Detail Piutang"
        description="Pantau saldo piutang dan histori penerimaan untuk transaksi ini."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/finance/receivables">
                <ArrowLeft className="size-4" />
                Kembali
              </Link>
            </Button>
            {receivable.factoryId ? (
              <Button asChild variant="outline">
                <Link href={`/master/factories/${receivable.factoryId}/statement`}>
                  <FileText className="size-4" />
                  Preview Statement
                </Link>
              </Button>
            ) : null}
          <FinanceActionButton
            disabled={!canPostReceipt || !canManagePayments}
            disabledLabel={receivable.status === "cancelled" ? "Ditutup" : "Lunas"}
            disabledReason={receiptDisabledReason}
            href={`/finance/payments?receivableId=${receivable.id}`}
            label="Catat Penerimaan"
          />
          </div>
        }
      />

      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="space-y-3">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Finance</div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Kode Piutang
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">{receivable.code}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={resolvePalmStatusBadgeVariant(receivable.status)}>
                {formatPalmStatusLabel(receivable.status)}
              </Badge>
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Referensi {receivable.sourceCode ?? "-"}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <SectionCard title="Ringkasan Piutang" description="Nilai piutang, penerimaan, dan informasi pihak terkait.">
            <SummaryList
              rows={[
                { label: "Pihak", value: partyName },
                ...(farmerLabel ? [{ label: "Petani Terkait", value: farmerLabel }] : []),
                { label: "Tanggal Referensi", value: formatDate(receivable.sourceDate) },
                { label: "Total Piutang", value: formatCurrency(receivable.amount) },
                { label: "Sisa Piutang", value: formatCurrency(receivable.outstandingAmount), emphasis: true },
                { label: "Sudah Diterima", value: formatCurrency(receivable.paidAmount) },
                { label: "Jatuh Tempo", value: formatDate(receivable.dueDate) },
              ]}
            />
          </SectionCard>

          <SectionCard title="Histori Penerimaan" description="Semua pembayaran yang sudah diterima untuk piutang ini.">
            <PaymentHistoryTable rows={paymentHistory} />
          </SectionCard>
        </div>

        <SectionCard title="Metadata Dokumen" description="Ringkasan administratif dokumen piutang.">
          {(() => {
            const dueDateMeta = getDueDateMeta(receivable.dueDate);
            return (
              <div
                className={
                  dueDateMeta.tone === "danger"
                    ? "mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
                    : dueDateMeta.tone === "warning"
                      ? "mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
                      : "mb-4 rounded-2xl border border-border/80 bg-muted/20 px-4 py-3"
                }
              >
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Jatuh Tempo
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">{dueDateMeta.dateLabel}</div>
                <div className="mt-1 text-sm text-muted-foreground">{dueDateMeta.hint}</div>
              </div>
            );
          })()}
          <div className="space-y-1">
            <DetailRow label="Kode Piutang" value={receivable.code} />
            <DetailRow label="Pihak" value={partyName} />
            {farmerLabel ? <DetailRow label="Petani Terkait" value={farmerLabel} /> : null}
            <DetailRow label="Referensi" value={receivable.sourceCode ?? "-"} />
            <DetailRow label="Status" value={formatPalmStatusLabel(receivable.status)} />
            <DetailRow label="Tanggal Dibuat" value={formatDate(receivable.createdAt)} />
            <DetailRow label="Catatan" value={receivable.notes?.trim() || "Tidak ada catatan"} />
          </div>
          <div className="mt-4 rounded-2xl border border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground">
            <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
              <Landmark className="size-4 text-primary" />
              Tindak lanjut
            </div>
            Penerimaan dicatat terpisah agar histori piutang dan bukti pembayaran tetap rapi untuk audit.
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
