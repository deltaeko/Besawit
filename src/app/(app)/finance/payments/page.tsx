import { ArrowDownLeft, ArrowUpRight, Landmark, ReceiptText } from "lucide-react";

import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleTable } from "@/components/shared/simple-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";
import { MasterPagination } from "@/modules/master/master-pagination";
import { PaymentForm } from "@/modules/finance/payment-form";
import {
  getFinancePaymentOptions,
  getPayableDetail,
  getPayableByReference,
  getPaymentPage,
  getReceivableDetail,
  getReceivableByReference,
} from "@/services/finance-service";

function getDirectionLabel(value: string) {
  return value === "in" ? "Penerimaan" : "Pembayaran";
}

function getMethodLabel(value: string) {
  const labels: Record<string, string> = {
    cash: "Tunai",
    bank_transfer: "Transfer Bank",
    giro: "Giro",
    other: "Lainnya",
  };

  return labels[value] ?? value;
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const sourceType = typeof query.sourceType === "string" ? query.sourceType : "";
  const sourceId = typeof query.sourceId === "string" ? query.sourceId : "";
  const returnTo = typeof query.returnTo === "string" ? query.returnTo : "";
  const q = typeof query.q === "string" ? query.q : "";
  const direction = typeof query.direction === "string" ? query.direction : "";
  const method = typeof query.method === "string" ? query.method : "";
  const page = typeof query.page === "string" ? Number(query.page) : 1;
  const pageSize = typeof query.pageSize === "string" ? Number(query.pageSize) : 20;
  const payableId = typeof query.payableId === "string" ? query.payableId : "";
  const receivableId = typeof query.receivableId === "string" ? query.receivableId : "";

  const [referencedPayable, referencedReceivable, selectedPayableDetail, selectedReceivableDetail, options, paymentsResult] =
    await Promise.all([
    sourceType === "tbs_purchase" || sourceType === "store_purchase"
      ? getPayableByReference(sourceType, sourceId).catch(() => null)
      : Promise.resolve(null),
    sourceType === "tbs_sale" || sourceType === "store_sale"
      ? getReceivableByReference(sourceType, sourceId).catch(() => null)
      : Promise.resolve(null),
    payableId ? getPayableDetail(payableId).catch(() => null) : Promise.resolve(null),
    receivableId ? getReceivableDetail(receivableId).catch(() => null) : Promise.resolve(null),
    getFinancePaymentOptions().catch(() => ({
      payables: [],
      receivables: [],
    })),
    getPaymentPage(page, pageSize, {
      q: q || undefined,
      direction: (direction || undefined) as "in" | "out" | undefined,
      method: (method || undefined) as "cash" | "bank_transfer" | "giro" | "other" | undefined,
    }).catch(() => ({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    })),
  ]);

  const paymentContext = referencedReceivable || receivableId ? "receivable" : "payable";

  const resolvedReturnHref =
    returnTo ||
    (() => {
      const payableSource =
        referencedPayable && sourceId
          ? { sourceType, sourceId }
          : selectedPayableDetail?.payable?.sourceType && selectedPayableDetail.payable.sourceId
            ? {
                sourceType: selectedPayableDetail.payable.sourceType,
                sourceId: selectedPayableDetail.payable.sourceId,
              }
            : null;

      if (payableSource?.sourceType === "tbs_purchase") {
        return `/palm/purchases/${payableSource.sourceId}`;
      }
      if (payableSource?.sourceType === "store_purchase") {
        return `/store/purchases/${payableSource.sourceId}`;
      }

      const receivableSource =
        referencedReceivable && sourceId
          ? { sourceType, sourceId }
          : selectedReceivableDetail?.receivable?.sourceType &&
              selectedReceivableDetail.receivable.sourceId
            ? {
                sourceType: selectedReceivableDetail.receivable.sourceType,
                sourceId: selectedReceivableDetail.receivable.sourceId,
              }
            : null;

      if (receivableSource?.sourceType === "tbs_sale") {
        return `/palm/sales/${receivableSource.sourceId}`;
      }
      if (receivableSource?.sourceType === "store_sale") {
        return `/store/sales/${receivableSource.sourceId}`;
      }

      return "";
    })();

  const pageTitle =
    paymentContext === "receivable" ? "Catat Penerimaan Piutang" : "Catat Pembayaran Hutang";

  const pageDescription =
    paymentContext === "receivable"
      ? "Catat penerimaan dari pabrik atau customer atas piutang yang masih outstanding."
      : "Catat pembayaran ke petani atau supplier atas hutang yang masih outstanding.";

  const rows = paymentsResult.items.map((item) => ({
    id: String(item.id),
    code: String(item.code ?? "-"),
    paymentDate: formatDateTime(item.paymentDate),
    direction: String(item.direction),
    party: String(
      item.farmerName ??
        item.supplierName ??
        item.factoryName ??
        item.customerName ??
        "-",
    ),
    reference: String(item.payableCode ?? item.receivableCode ?? "-"),
    method: String(item.method ?? "-"),
    amount: Number(item.amount ?? 0),
    ledgerCategory: String(item.ledgerCategory ?? "-"),
    createdByName: String(item.createdByName ?? "Sistem"),
  }));

  const pageTotal = rows.reduce((sum, item) => sum + item.amount, 0);
  const inCount = rows.filter((item) => item.direction === "in").length;
  const outCount = rows.filter((item) => item.direction === "out").length;

  const paginationQuery = new URLSearchParams();
  paginationQuery.set("q", q);
  paginationQuery.set("direction", direction);
  paginationQuery.set("method", method);
  paginationQuery.set("pageSize", String(paymentsResult.meta.pageSize));

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Finance" title={pageTitle} description={pageDescription} />

      <FilterBar
        left={
          <div className="text-sm leading-6 text-muted-foreground">
            Gunakan halaman ini untuk mencatat pembayaran hutang atau penerimaan piutang tanpa mengubah transaksi sumber.
          </div>
        }
        right={
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-1.5">
              Hutang aktif: {options.payables.length}
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-1.5">
              Piutang aktif: {options.receivables.length}
            </div>
          </div>
        }
      />

      <PaymentForm
        initialValues={{
          payableId: payableId || referencedPayable?.id || "",
          receivableId: receivableId || referencedReceivable?.id || "",
        }}
        payables={options.payables.map((item) => ({
          id: item.id,
          code: item.code,
          amount: Number(item.amount),
          outstandingAmount: Number(item.outstandingAmount),
          status: item.status,
          partyName: item.farmerName ?? item.supplierName ?? "Tanpa pihak",
          sourceCode: item.sourceCode ?? "",
          dueDate: item.dueDate?.toISOString?.() ?? null,
          partyType: item.partyType,
        }))}
        receivables={options.receivables.map((item) => ({
          id: item.id,
          code: item.code,
          amount: Number(item.amount),
          outstandingAmount: Number(item.outstandingAmount),
          status: item.status,
          partyName: item.factoryName ?? item.customerName ?? "Tanpa pihak",
          sourceCode: item.sourceCode ?? "",
          dueDate: item.dueDate?.toISOString?.() ?? null,
          partyType: item.partyType,
        }))}
        returnHref={resolvedReturnHref || null}
      />

      <FilterBar
        left={
          <form className="flex flex-1 flex-col gap-3 xl:flex-row xl:items-end">
            <div className="min-w-[240px] space-y-2">
              <label className="text-sm font-medium">Cari Payment / Pihak</label>
              <Input defaultValue={q} name="q" placeholder="Kode payment, referensi, pihak" />
            </div>
            <div className="min-w-[180px] space-y-2">
              <label className="text-sm font-medium">Arah</label>
              <Select defaultValue={direction} name="direction" placeholder="Semua arah">
                <option value="out">Pembayaran</option>
                <option value="in">Penerimaan</option>
              </Select>
            </div>
            <div className="min-w-[180px] space-y-2">
              <label className="text-sm font-medium">Metode</label>
              <Select defaultValue={method} name="method" placeholder="Semua metode">
                <option value="cash">Tunai</option>
                <option value="bank_transfer">Transfer Bank</option>
                <option value="giro">Giro</option>
                <option value="other">Lainnya</option>
              </Select>
            </div>
            <input name="pageSize" type="hidden" value={paymentsResult.meta.pageSize} />
            <div className="flex items-end gap-2">
              <Button type="submit">Terapkan</Button>
            </div>
          </form>
        }
        right={
          <>
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-1.5 text-sm text-muted-foreground">
              <ReceiptText className="size-4" />
              {paymentsResult.meta.total} payment
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-1.5 text-sm text-muted-foreground">
              <ArrowDownLeft className="size-4" />
              Terima {inCount}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-1.5 text-sm text-muted-foreground">
              <ArrowUpRight className="size-4" />
              Bayar {outCount}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-1.5 text-sm text-muted-foreground">
              <Landmark className="size-4" />
              Nilai halaman {formatCurrency(pageTotal)}
            </div>
          </>
        }
      />

      <SimpleTable
        cellRenderers={{
          direction: (value) => (
            <Badge variant={String(value) === "in" ? "success" : "neutral"}>
              {getDirectionLabel(String(value ?? "out"))}
            </Badge>
          ),
          method: (value) => <Badge variant="neutral">{getMethodLabel(String(value ?? "-"))}</Badge>,
          amount: (value) => formatCurrency(Number(value ?? 0)),
        }}
        columnLabels={{
          code: "Kode Payment",
          paymentDate: "Tanggal",
          direction: "Arah",
          party: "Pihak",
          reference: "Referensi",
          method: "Metode",
          amount: "Nominal",
          ledgerCategory: "Kas/Bank",
          createdByName: "Dicatat Oleh",
        }}
        columns={["code", "paymentDate", "direction", "party", "reference", "method", "amount", "ledgerCategory", "createdByName"]}
        getHref={(row) => `/print/payments/${String(row.id)}/receipt`}
        linkColumn="code"
        numericColumns={["amount"]}
        rows={rows}
      />

      <MasterPagination
        basePath="/finance/payments"
        page={paymentsResult.meta.page}
        query={paginationQuery}
        totalPages={paymentsResult.meta.totalPages}
      />
    </div>
  );
}
