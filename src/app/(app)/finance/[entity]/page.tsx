import { notFound } from "next/navigation";
import { CircleDollarSign, FileClock, ReceiptText, Wallet } from "lucide-react";

import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleTable } from "@/components/shared/simple-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { MasterPagination } from "@/modules/master/master-pagination";
import { formatPalmStatusLabel, resolvePalmStatusBadgeVariant } from "@/modules/palm/status-utils";
import {
  getPayableAging,
  getPayablePage,
  getReceivableAging,
  getReceivablePage,
} from "@/services/finance-service";

type FinanceRow = {
  id: string;
  code: string;
  party: string;
  sourceCode: string;
  amount: number;
  outstandingAmount: number;
  dueDate: string;
  status: string;
  farmerName?: string;
};

export default async function FinanceEntityPage({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { entity } = await params;
  if (!["payables", "receivables"].includes(entity)) notFound();

  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q : "";
  const status = typeof query.status === "string" ? query.status : "";
  const partyType = typeof query.partyType === "string" ? query.partyType : "";
  const page = typeof query.page === "string" ? Number(query.page) : 1;
  const pageSize = typeof query.pageSize === "string" ? Number(query.pageSize) : 20;

  const isPayable = entity === "payables";
  const [result, aging] = await (isPayable
    ? Promise.all([
        getPayablePage(page, pageSize, {
          q: q || undefined,
          status: (status || undefined) as "unpaid" | "partial" | "paid" | "overdue" | "cancelled" | undefined,
          partyType: (partyType || undefined) as "farmer" | "supplier" | "other" | undefined,
        }).catch(() => ({
          items: [],
          meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
        })),
        getPayableAging({
          q: q || undefined,
          status: (status || undefined) as "unpaid" | "partial" | "paid" | "overdue" | "cancelled" | undefined,
          partyType: (partyType || undefined) as "farmer" | "supplier" | "other" | undefined,
        }).catch(() => ({
          current: 0,
          due1to7: 0,
          due8to14: 0,
          due15to30: 0,
          dueOver30: 0,
        })),
      ])
    : Promise.all([
        getReceivablePage(page, pageSize, {
          q: q || undefined,
          status: (status || undefined) as "unpaid" | "partial" | "paid" | "overdue" | "cancelled" | undefined,
          partyType: (partyType || undefined) as "factory" | "customer" | "other" | undefined,
        }).catch(() => ({
          items: [],
          meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
        })),
        getReceivableAging({
          q: q || undefined,
          status: (status || undefined) as "unpaid" | "partial" | "paid" | "overdue" | "cancelled" | undefined,
          partyType: (partyType || undefined) as "factory" | "customer" | "other" | undefined,
        }).catch(() => ({
          current: 0,
          due1to7: 0,
          due8to14: 0,
          due15to30: 0,
          dueOver30: 0,
        })),
      ]));

  const rows: FinanceRow[] = isPayable
    ? (result.items as Array<Record<string, unknown>>).map((item) => ({
        id: String(item.id),
        code: String(item.code ?? "-"),
        party: String(item.farmerName ?? item.supplierName ?? "-"),
        sourceCode: String(item.sourceCode ?? "-"),
        amount: Number(item.amount ?? 0),
        outstandingAmount: Number(item.outstandingAmount ?? 0),
        dueDate: formatDate(String(item.dueDate ?? "")),
        status: String(item.status ?? "unpaid"),
      }))
    : (result.items as Array<Record<string, unknown>>).map((item) => ({
        id: String(item.id),
        code: String(item.code ?? "-"),
        party: String(item.factoryName ?? item.customerName ?? "-"),
        farmerName: String(item.farmerName ?? "-"),
        sourceCode: String(item.sourceCode ?? "-"),
        amount: Number(item.amount ?? 0),
        outstandingAmount: Number(item.outstandingAmount ?? 0),
        dueDate: formatDate(String(item.dueDate ?? "")),
        status: String(item.status ?? "unpaid"),
      }));

  const totals = rows.reduce(
    (summary, row) => {
      summary.amount += row.amount;
      summary.outstanding += row.outstandingAmount;
      if (row.status === "paid") summary.paid += 1;
      if (row.status === "partial") summary.partial += 1;
      if (row.status === "unpaid" || row.status === "overdue") summary.open += 1;
      return summary;
    },
    { amount: 0, outstanding: 0, paid: 0, partial: 0, open: 0 },
  );

  const paginationQuery = new URLSearchParams();
  paginationQuery.set("q", q);
  paginationQuery.set("status", status);
  paginationQuery.set("partyType", partyType);
  paginationQuery.set("pageSize", String(result.meta.pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title={isPayable ? "Hutang" : "Piutang"}
        description={
          isPayable
            ? "Pantau hutang petani dan supplier, sisa outstanding, referensi transaksi, dan bucket jatuh tempo."
            : "Pantau piutang pabrik dan pelanggan, status penerimaan, referensi transaksi, dan bucket jatuh tempo."
        }
      />

      <FilterBar
        left={
          <form className="flex flex-1 flex-col gap-3 xl:flex-row xl:items-end">
            <div className="min-w-[240px] space-y-2">
              <label className="text-sm font-medium">Cari Dokumen / Pihak</label>
              <Input
                defaultValue={q}
                name="q"
                placeholder={isPayable ? "Kode hutang, petani, supplier" : "Kode piutang, pabrik, pelanggan"}
              />
            </div>
            <div className="min-w-[180px] space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select defaultValue={status} name="status" placeholder="Semua status">
                <option value="unpaid">Belum Bayar</option>
                <option value="partial">Parsial</option>
                <option value="paid">Lunas</option>
                <option value="overdue">Jatuh Tempo</option>
                <option value="cancelled">Dibatalkan</option>
              </Select>
            </div>
            <div className="min-w-[180px] space-y-2">
              <label className="text-sm font-medium">Jenis Pihak</label>
              <Select defaultValue={partyType} name="partyType" placeholder="Semua pihak">
                {isPayable ? (
                  <>
                    <option value="farmer">Petani</option>
                    <option value="supplier">Supplier</option>
                    <option value="other">Lainnya</option>
                  </>
                ) : (
                  <>
                    <option value="factory">Pabrik</option>
                    <option value="customer">Pelanggan</option>
                    <option value="other">Lainnya</option>
                  </>
                )}
              </Select>
            </div>
            <input name="pageSize" type="hidden" value={result.meta.pageSize} />
            <div className="flex items-end gap-2">
              <Button type="submit">Terapkan</Button>
            </div>
          </form>
        }
        right={
          <>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              <div className="rounded-lg border border-border/70 bg-card p-2 text-muted-foreground">
                <ReceiptText className="size-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Dokumen</div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {formatNumber(result.meta.total, 0)} dokumen
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              <div className="rounded-lg border border-border/70 bg-card p-2 text-muted-foreground">
                <Wallet className="size-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Outstanding</div>
                <div className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(totals.outstanding)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              <CircleDollarSign className="size-4" />
              Total nilai {formatCurrency(totals.amount)}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              <FileClock className="size-4" />
              Open {totals.open} • Partial {totals.partial} • Lunas {totals.paid}
            </div>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-border/80 bg-card/95 px-4 py-4 shadow-sm">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Belum Jatuh Tempo</div>
          <div className="mt-2 text-xl font-semibold tracking-tight">{formatCurrency(aging.current)}</div>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card/95 px-4 py-4 shadow-sm">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Terlambat 1-7 Hari</div>
          <div className="mt-2 text-xl font-semibold tracking-tight">{formatCurrency(aging.due1to7)}</div>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card/95 px-4 py-4 shadow-sm">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Terlambat 8-14 Hari</div>
          <div className="mt-2 text-xl font-semibold tracking-tight">{formatCurrency(aging.due8to14)}</div>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card/95 px-4 py-4 shadow-sm">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Terlambat 15-30 Hari</div>
          <div className="mt-2 text-xl font-semibold tracking-tight">{formatCurrency(aging.due15to30)}</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4 shadow-sm">
          <div className="text-[11px] uppercase tracking-[0.22em] text-amber-700">Terlambat &gt; 30 Hari</div>
          <div className="mt-2 text-xl font-semibold tracking-tight text-amber-900">
            {formatCurrency(aging.dueOver30)}
          </div>
        </div>
      </div>

      <SimpleTable
        cellRenderers={{
          amount: (value) => formatCurrency(Number(value ?? 0)),
          outstandingAmount: (value) => formatCurrency(Number(value ?? 0)),
          status: (value) => (
            <Badge variant={resolvePalmStatusBadgeVariant(String(value ?? "unpaid"))}>
              {formatPalmStatusLabel(String(value ?? "unpaid"))}
            </Badge>
          ),
        }}
        columnLabels={{
          code: isPayable ? "Kode Hutang" : "Kode Piutang",
          party: "Pihak",
          farmerName: "Petani Terkait",
          sourceCode: "Referensi",
          amount: "Total",
          outstandingAmount: "Sisa",
          dueDate: "Jatuh Tempo",
          status: "Status",
        }}
        columns={
          isPayable
            ? ["code", "party", "sourceCode", "amount", "outstandingAmount", "dueDate", "status"]
            : ["code", "party", "farmerName", "sourceCode", "amount", "outstandingAmount", "dueDate", "status"]
        }
        getHref={(row) => `/finance/${entity}/${row.id}`}
        linkColumn="code"
        numericColumns={["amount", "outstandingAmount"]}
        rows={rows}
      />

      <MasterPagination
        basePath={`/finance/${entity}`}
        page={result.meta.page}
        query={paginationQuery}
        totalPages={result.meta.totalPages}
      />
    </div>
  );
}
