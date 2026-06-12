import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { SimpleTable } from "@/components/shared/simple-table";
import { AuditLogPanel } from "@/components/shared/audit-log-panel";
import { canPerformAction } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { isPalmEntity } from "@/modules/palm/helpers";
import { PalmTransactionDetailActions } from "@/modules/palm/transaction-detail-actions";
import { hasActiveTbsSalesInWarehouseSince } from "@/repositories/palm-repository";
import {
  PalmTransactionDetailView,
  type PalmTransactionDetailViewModel,
} from "@/modules/palm/transaction-detail-view";
import {
  getPayableByReference,
  getPayableDetail,
  getReceivableByReference,
} from "@/services/finance-service";
import {
  getReferenceStockReversalStatus,
  hasReferenceStockMovement,
} from "@/services/inventory-service";
import { getPalmPurchase, getPalmSale } from "@/services/palm-service";
import { getAuditLogsByEntity } from "@/services/audit-service";

function formatStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Aktif",
    cancelled: "Dibatalkan",
    void: "Void",
    unpaid: "Belum Dibayar",
    partial: "Sebagian",
    paid: "Lunas",
    overdue: "Jatuh Tempo",
  };

  return labels[status] ?? status;
}

export default async function PalmDetailPage({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const { entity, id } = await params;
  if (!isPalmEntity(entity)) notFound();
  const session = await getSession();
  const canManagePayments = Boolean(
    session && canPerformAction(session.role, session.permissions, "finance.payments.manage"),
  );
  const canVoidPalmPurchase = Boolean(
    session && canPerformAction(session.role, session.permissions, "palm.purchases.void"),
  );
  const canVoidPalmSale = Boolean(
    session && canPerformAction(session.role, session.permissions, "palm.sales.void"),
  );

  if (entity === "purchases") {
    const [purchase, payable, hasStockMovement, hasActiveLinkedSale, reversalStatus] = await Promise.all([
      getPalmPurchase(id).catch(() => null),
      getPayableByReference("tbs_purchase", id).catch(() => null),
      hasReferenceStockMovement("tbs_purchase", id).catch(() => false),
      getPalmPurchase(id)
        .then((item) =>
          item && item.warehouseId
            ? hasActiveTbsSalesInWarehouseSince(item.warehouseId, item.createdAt)
            : false,
        )
        .catch(() => false),
      getReferenceStockReversalStatus("tbs_purchase", id).catch(() => ({
        canReverse: true,
        blockers: [],
        movementCount: 0,
      })),
    ]);
    const auditLogs = await getAuditLogsByEntity("tbs_purchases", id, 20).catch(() => []);

    if (!purchase) notFound();

    const payableAmount = Number(payable?.amount ?? purchase.totalPurchase);
    const paidAmount = Number(payable?.paidAmount ?? 0);
    const outstandingAmount = Number(payable?.outstandingAmount ?? payableAmount);
    const deductionAmount = Math.max(Number(purchase.totalPurchase) - payableAmount, 0);
    const storeDebtOffset = purchase.storeDebtOffset;

    const view: PalmTransactionDetailViewModel = {
      code: purchase.code,
      transactionStatus: purchase.status,
      paymentStatus: purchase.paymentStatus,
      stockNotice: hasStockMovement
        ? {
            title: "Transaksi ini sudah membentuk stok TBS",
            description:
              "Gudang, hasil timbang, dan harga beli tidak lagi diubah langsung dari transaksi. Gunakan adjustment stok bila perlu koreksi operasional.",
            tone: "success",
          }
        : undefined,
      summaryMetrics: [
        {
          label: "Total Akhir",
          value: formatCurrency(payableAmount),
          tone: "primary",
        },
        {
          label: "Sudah Dibayar",
          value: formatCurrency(paidAmount),
        },
        {
          label: "Sisa Hutang",
          value: formatCurrency(outstandingAmount),
          tone: outstandingAmount > 0 ? "warning" : "default",
          emphasis: outstandingAmount > 0,
        },
      ],
      sections: [
        {
          title: "Informasi Umum",
          fields: [
            { label: "Tanggal", value: formatDate(String(purchase.purchaseDate)) },
            {
              label: "Petani",
              value: String((purchase as Record<string, unknown>).farmerName ?? "-"),
            },
            {
              label: "Sopir",
              value: String((purchase as Record<string, unknown>).driverName ?? "-"),
            },
            {
              label: "Kendaraan",
              value:
                [
                  (purchase as Record<string, unknown>).vehiclePlateNumber,
                  (purchase as Record<string, unknown>).vehicleType,
                ]
                  .filter(Boolean)
                  .join(" / ") || "-",
            },
            {
              label: "Gudang",
              value: String((purchase as Record<string, unknown>).warehouseName ?? "-"),
            },
          ],
        },
        {
          title: "Data Timbangan",
          fields: [
            {
              label: "Berat Kotor",
              value: `${formatNumber(String(purchase.grossWeight))} kg`,
            },
            {
              label: "Berat Tara",
              value: `${formatNumber(String(purchase.tareWeight))} kg`,
            },
            {
              label: "Berat Bersih",
              value: `${formatNumber(String(purchase.netWeight))} kg`,
              emphasis: true,
            },
          ],
          columns: "grid gap-4 md:grid-cols-3",
        },
        {
          title: "Nilai Transaksi",
          fields: [
            {
              label: "Harga Beli / Kg",
              value: formatCurrency(Number(purchase.buyingPricePerKg)),
            },
            {
              label: "Total Pembelian",
              value: formatCurrency(Number(purchase.totalPurchase)),
            },
            {
              label: "Biaya Operasional",
              value: formatCurrency(Number(purchase.totalOperationalCost)),
            },
            {
              label: "Potongan",
              value: formatCurrency(deductionAmount),
            },
            {
              label: "Potong Hutang Toko",
              value: formatCurrency(Number(storeDebtOffset?.offset?.appliedAmount ?? 0)),
            },
            {
              label: "Total Akhir",
              value: formatCurrency(payableAmount),
              emphasis: true,
            },
            {
              label: "Sudah Dibayar",
              value: formatCurrency(paidAmount),
            },
            {
              label: "Sisa Hutang",
              value: formatCurrency(outstandingAmount),
              emphasis: true,
            },
          ],
        },
        {
          title: "Status & Catatan",
          fields: [
            { label: "Status Transaksi", value: formatStatusLabel(String(purchase.status)) },
            {
              label: "Status Pembayaran",
              value: formatStatusLabel(String(purchase.paymentStatus)),
            },
          ],
          columns: "grid gap-4 md:grid-cols-2",
        },
      ],
      notes: purchase.notes?.trim() ? purchase.notes : "Tidak ada catatan",
      auditFields: [
        {
          label: "Dibuat Oleh",
          value: String((purchase as Record<string, unknown>).createdByName ?? "Sistem"),
        },
        {
          label: "Dibuat Pada",
          value: formatDate(String(purchase.createdAt)),
        },
        {
          label: "Diperbarui Oleh",
          value: "Belum tersedia di transaksi",
        },
        {
          label: "Diperbarui Pada",
          value: formatDate(String(purchase.updatedAt)),
        },
        {
          label: "Kode Hutang",
          value: String(payable?.code ?? "-"),
        },
        {
          label: "Mode Potongan",
          value:
            storeDebtOffset?.offset?.inputMode === "percentage"
              ? "Persen"
              : storeDebtOffset?.offset?.inputMode === "value"
                ? "Nominal"
                : "-",
        },
        {
          label: "Jumlah Piutang Toko",
          value: String(storeDebtOffset?.items?.length ?? 0),
        },
        {
          label: "Nomor Timbang",
          value: "-",
        },
        {
          label: "Referensi Dokumen",
          value: "-",
        },
      ],
    };

    const purchaseReturnTo = encodeURIComponent(`/palm/purchases/${id}`);
    const purchaseEditDisabledReason =
      purchase.status !== "active"
        ? "Transaksi yang sudah dibatalkan tidak bisa diubah."
        : hasStockMovement
          ? "Pembelian TBS ini sudah membentuk stok. Koreksi gudang, timbangan, atau harga harus lewat adjustment stok."
          : null;
    const purchaseVoidDisabledReason =
      purchase.status !== "active"
        ? "Transaksi ini sudah tidak aktif."
        : Number(payable?.paidAmount ?? 0) > 0
          ? "Transaksi yang sudah memiliki pembayaran tidak bisa dibatalkan otomatis."
          : hasActiveLinkedSale
            ? "Gudang transaksi ini sudah memiliki penjualan TBS aktif sesudah pembelian, sehingga void diblok untuk melindungi pooled stock."
            : !reversalStatus.canReverse
              ? `Saldo stok ${reversalStatus.blockers[0]?.productName ?? "produk"} di ${reversalStatus.blockers[0]?.warehouseName ?? "gudang"} tidak cukup untuk reversal.`
            : !canVoidPalmPurchase
              ? "Anda tidak memiliki hak akses untuk void pembelian TBS."
            : null;

    return (
      <div className="space-y-6">
        <PageHeader
          stackAction
          action={
          <PalmTransactionDetailActions
            backHref="/palm/purchases"
            documentHref={`/palm/purchases/${id}/weigh-slip`}
            documentLabel="Preview Slip Timbang"
            editDisabledReason={purchaseEditDisabledReason}
            editHref={purchaseEditDisabledReason ? undefined : `/palm/purchases/${id}/edit`}
            paymentDisabledReason={
              canManagePayments ? null : "Anda tidak memiliki hak akses untuk mencatat pembayaran."
            }
            paymentLabel="Catat Pembayaran"
            paymentStatus={purchase.paymentStatus}
            transactionStatus={purchase.status}
            paymentHref={
              payable
                ? `/finance/payments?payableId=${payable.id}&returnTo=${purchaseReturnTo}`
                : `/finance/payments?returnTo=${purchaseReturnTo}`
            }
            voidAction={{
              apiPath: `/api/palm/purchases/${id}/void`,
              disabledReason: purchaseVoidDisabledReason,
              label: "Void Pembelian",
            }}
          />
        }
          eyebrow="Agen Sawit"
          title="Detail Transaksi Pembelian"
        />
        <PalmTransactionDetailView view={view} />
        <AuditLogPanel items={auditLogs} />
        {storeDebtOffset?.offset ? (
          <SectionCard
            title="Breakdown Potong Hutang Toko"
            description="Potongan hasil panen dialokasikan ke piutang toko tertua yang masih outstanding agar posisi hutang toko dan hutang pembelian tetap sinkron."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.35rem] border border-border/80 bg-card/88 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Basis Potongan
                </div>
                <div className="mt-2 text-sm font-semibold">
                  {formatCurrency(Number(storeDebtOffset.offset.baseAmount))}
                </div>
              </div>
              <div className="rounded-[1.35rem] border border-border/80 bg-card/88 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Nilai Diminta
                </div>
                <div className="mt-2 text-sm font-semibold">
                  {storeDebtOffset.offset.inputMode === "percentage"
                    ? `${formatNumber(String(storeDebtOffset.offset.inputPercentage ?? 0))}%`
                    : formatCurrency(Number(storeDebtOffset.offset.inputAmount))}
                </div>
              </div>
              <div className="rounded-[1.35rem] border border-primary/20 bg-[linear-gradient(180deg,rgba(72,115,74,0.12),rgba(72,115,74,0.06))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Potongan Diterapkan
                </div>
                <div className="mt-2 text-base font-semibold">
                  {formatCurrency(Number(storeDebtOffset.offset.appliedAmount))}
                </div>
              </div>
              <div className="rounded-[1.35rem] border border-border/80 bg-card/88 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Catatan Potongan
                </div>
                <div className="mt-2 text-sm font-semibold">
                  {storeDebtOffset.offset.notes?.trim() || "Tidak ada catatan"}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <SimpleTable
                columns={["receivableCode", "customerName", "sourceCode", "appliedAmount"]}
                columnLabels={{
                  receivableCode: "Kode Piutang",
                  customerName: "Pelanggan Toko",
                  sourceCode: "Referensi Toko",
                  appliedAmount: "Nilai Dipotong",
                }}
                numericColumns={["appliedAmount"]}
                density="compact"
                cellRenderers={{
                  appliedAmount: (value) => (
                    <span className="font-semibold">{formatCurrency(Number(value ?? 0))}</span>
                  ),
                }}
                rows={storeDebtOffset.items.map((item) => ({
                  ...item,
                  receivableCode: item.receivableCode ?? "-",
                  customerName: item.customerName ?? "-",
                  sourceCode: item.sourceCode ?? "-",
                  appliedAmount: Number(item.appliedAmount),
                }))}
              />
            </div>
          </SectionCard>
        ) : null}
        {payable ? (
          <PurchasePaymentHistory payableId={payable.id} />
        ) : null}
      </div>
    );
  }

  const [sale, receivable] = await Promise.all([
    getPalmSale(id).catch(() => null),
    getReceivableByReference("tbs_sale", id).catch(() => null),
  ]);
  const auditLogs = await getAuditLogsByEntity("tbs_sales", id, 20).catch(() => []);

  if (!sale) notFound();

  const receivableAmount = Number(receivable?.amount ?? sale.totalSales);
  const paidAmount = Number(receivable?.paidAmount ?? 0);
  const outstandingAmount = Number(receivable?.outstandingAmount ?? receivableAmount);
  const grossSalesAmount = Number((sale as Record<string, unknown>).grossSalesAmount ?? sale.totalSales);
  const totalDeductionAmount = Number(
    (sale as Record<string, unknown>).totalDeductionAmount ?? 0,
  );

  const view: PalmTransactionDetailViewModel = {
    code: sale.code,
    transactionStatus: sale.status,
    paymentStatus: sale.paymentStatus,
    stockNotice: {
      title: "Penjualan ini mengurangi stok TBS pool",
      description:
        "Sistem mengeluarkan stok fisik sawit campuran dari gudang asal berdasarkan berat bersih final penjualan ke pabrik.",
      tone: "success",
    },
    summaryMetrics: [
      {
        label: "Total Akhir",
        value: formatCurrency(receivableAmount),
        tone: "primary",
      },
      {
        label: "Sudah Dibayar",
        value: formatCurrency(paidAmount),
      },
      {
        label: "Sisa Piutang",
        value: formatCurrency(outstandingAmount),
        tone: outstandingAmount > 0 ? "warning" : "default",
        emphasis: outstandingAmount > 0,
      },
    ],
    sections: [
      {
        title: "Informasi Umum",
        fields: [
          { label: "Tanggal", value: formatDate(String(sale.saleDate)) },
          {
            label: "Gudang Asal",
            value: String((sale as Record<string, unknown>).warehouseName ?? "-"),
          },
          {
            label: "Pabrik",
            value: String((sale as Record<string, unknown>).factoryName ?? "-"),
          },
          {
            label: "Sumber Stok",
            value: "Pool stok TBS gudang",
          },
        ],
      },
      {
        title: "Data Timbangan",
        fields: [
          {
            label: "Berat Kotor",
            value: `${formatNumber(String(sale.grossWeight))} kg`,
          },
          {
            label: "Berat Tara",
            value: `${formatNumber(String(sale.tareWeight))} kg`,
          },
          {
            label: "Berat Bersih Awal",
            value: `${formatNumber(String(sale.netWeightInitial))} kg`,
          },
          {
            label: "Potongan Total",
            value: `${formatNumber(String(sale.totalDeduction))} kg`,
          },
          {
            label: "Return",
            value: `${formatNumber(String(sale.returnWeight))} kg`,
          },
          {
            label: "Berat Bersih Final",
            value: `${formatNumber(String(sale.netWeightFinal))} kg`,
            emphasis: true,
          },
        ],
        columns: "grid gap-4 md:grid-cols-2 xl:grid-cols-3",
      },
      {
        title: "Nilai Transaksi",
        fields: [
          {
            label: "Harga Jual / Kg",
            value: formatCurrency(Number(sale.sellingPricePerKg)),
          },
          {
            label: "Nilai Bruto Penjualan",
            value: formatCurrency(grossSalesAmount),
          },
          {
            label: "Potongan Nominal",
            value: formatCurrency(totalDeductionAmount),
          },
          {
            label: "Total Penjualan",
            value: formatCurrency(Number(sale.totalSales)),
          },
          {
            label: "Margin",
            value: formatCurrency(Number(sale.margin)),
          },
          {
            label: "Total Akhir",
            value: formatCurrency(receivableAmount),
            emphasis: true,
          },
          {
            label: "Sudah Dibayar",
            value: formatCurrency(paidAmount),
          },
          {
            label: "Sisa Piutang",
            value: formatCurrency(outstandingAmount),
            emphasis: true,
          },
        ],
      },
      {
        title: "Status & Catatan",
        fields: [
          { label: "Status Transaksi", value: formatStatusLabel(String(sale.status)) },
          {
            label: "Status Pembayaran",
            value: formatStatusLabel(String(sale.paymentStatus)),
          },
        ],
        columns: "grid gap-4 md:grid-cols-2",
      },
    ],
    notes: sale.notes?.trim() ? sale.notes : "Tidak ada catatan",
      auditFields: [
        {
          label: "Dibuat Oleh",
          value: String((sale as Record<string, unknown>).createdByName ?? "Sistem"),
      },
      {
        label: "Dibuat Pada",
        value: formatDate(String(sale.createdAt)),
      },
        {
          label: "Diperbarui Oleh",
          value: "Belum tersedia di transaksi",
        },
        {
          label: "Diperbarui Pada",
          value: formatDate(String(sale.updatedAt)),
        },
        {
          label: "Kode Piutang",
          value: String(receivable?.code ?? "-"),
        },
        {
          label: "Nomor Timbang",
          value: "-",
        },
        {
          label: "Referensi Dokumen",
          value: "-",
        },
      ],
  };

  const saleReturnTo = encodeURIComponent(`/palm/sales/${id}`);
  const saleVoidDisabledReason =
    sale.status !== "active"
      ? "Transaksi ini sudah tidak aktif."
      : Number(receivable?.paidAmount ?? 0) > 0
        ? "Penjualan yang sudah memiliki penerimaan tidak bisa dibatalkan otomatis."
        : !canVoidPalmSale
          ? "Anda tidak memiliki hak akses untuk void penjualan TBS."
        : null;

  return (
    <div className="space-y-6">
      <PageHeader
        stackAction
        action={
          <PalmTransactionDetailActions
            backHref="/palm/sales"
            documentHref={`/palm/sales/${id}/document`}
            documentLabel="Preview Dokumen Penjualan"
            paymentDisabledReason={
              canManagePayments ? null : "Anda tidak memiliki hak akses untuk mencatat penerimaan."
            }
            paymentLabel="Catat Penerimaan"
            paymentStatus={sale.paymentStatus}
            transactionStatus={sale.status}
            paymentHref={
              receivable
                ? `/finance/payments?receivableId=${receivable.id}&returnTo=${saleReturnTo}`
                : `/finance/payments?returnTo=${saleReturnTo}`
            }
            voidAction={{
              apiPath: `/api/palm/sales/${id}/void`,
              disabledReason: saleVoidDisabledReason,
              label: "Void Penjualan",
            }}
          />
        }
        eyebrow="Agen Sawit"
        title="Detail Penjualan TBS ke Pabrik"
      />
      <PalmTransactionDetailView view={view} />
      <AuditLogPanel items={auditLogs} />
      <SectionCard
        title="Breakdown Potongan & Grading"
        description="Snapshot potongan yang dipakai saat transaksi ini dibuat, termasuk mode input dan dampaknya ke perhitungan."
      >
        {(sale as Record<string, unknown>).deductions &&
        Array.isArray((sale as Record<string, unknown>).deductions) &&
        ((sale as Record<string, unknown>).deductions as Array<Record<string, unknown>>).length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {((sale as Record<string, unknown>).deductions as Array<Record<string, unknown>>).map(
              (item, index) => (
                <div
                  className="rounded-[1.35rem] border border-border/80 bg-card/88 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                  key={`${item.id ?? index}`}
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    {String(item.label ?? item.configName ?? item.type ?? "Potongan")}
                  </div>
                  <div className="mt-2 text-sm font-semibold">
                    Mode{" "}
                    {String(item.inputMode) === "percentage"
                      ? "Persen"
                      : String(item.inputMode) === "nominal"
                        ? "Nominal"
                        : "Kg"}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Input</div>
                      <div className="mt-1 font-medium">
                        {String(item.inputMode) === "percentage"
                          ? `${formatNumber(String(item.inputValue))}%`
                          : String(item.inputMode) === "nominal"
                            ? formatCurrency(Number(item.inputValue ?? 0))
                            : `${formatNumber(String(item.inputValue))} kg`}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Dampak Berat</div>
                      <div className="mt-1 font-medium">
                        {formatNumber(String(item.weight ?? 0))} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Dampak Nominal</div>
                      <div className="mt-1 font-medium">
                        {formatCurrency(Number(item.deductionAmount ?? 0))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Catatan</div>
                      <div className="mt-1 font-medium">
                        {String(item.notes ?? "").trim() || "Tidak ada catatan"}
                      </div>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
            Tidak ada potongan tersimpan pada transaksi ini.
          </div>
        )}
      </SectionCard>
    </div>
  );
}

async function PurchasePaymentHistory({ payableId }: { payableId: string }) {
  const detail = await getPayableDetail(payableId).catch(() => null);
  if (!detail) return null;

  return (
    <SectionCard
      title="Histori Pembayaran Petani"
      description="Riwayat pembayaran parsial maupun pelunasan untuk transaksi pembelian ini."
    >
      <SimpleTable
        columnLabels={{
          code: "Kode Payment",
          paymentDate: "Tanggal",
          method: "Metode",
          amount: "Nominal",
          ledgerCategory: "Kas/Bank",
          notes: "Catatan",
        }}
        columns={["code", "paymentDate", "method", "amount", "ledgerCategory", "notes"]}
        getHref={(row) => `/print/payments/${row.id}/receipt`}
        linkColumn="code"
        density="compact"
        cellRenderers={{
          amount: (value) => (
            <span className="font-semibold">{formatCurrency(Number(value ?? 0))}</span>
          ),
        }}
        rows={detail.paymentHistory.map((item) => ({
          id: item.id,
          code: item.code,
          paymentDate: formatDate(String(item.paymentDate)),
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
        }))}
      />
    </SectionCard>
  );
}
