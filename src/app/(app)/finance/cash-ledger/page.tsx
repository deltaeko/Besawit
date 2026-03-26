import { ArrowDownLeft, ArrowUpRight, Landmark, ReceiptText } from "lucide-react";

import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleTable } from "@/components/shared/simple-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { MasterPagination } from "@/modules/master/master-pagination";
import { getCashLedgerPage } from "@/services/finance-service";

export default async function CashLedgerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q : "";
  const type = typeof query.type === "string" ? query.type : "";
  const category = typeof query.category === "string" ? query.category : "";
  const page = typeof query.page === "string" ? Number(query.page) : 1;
  const pageSize = typeof query.pageSize === "string" ? Number(query.pageSize) : 20;

  const result = await getCashLedgerPage(page, pageSize, {
    q: q || undefined,
    type: (type || undefined) as "debit" | "credit" | undefined,
    category: category || undefined,
  }).catch(() => ({
    items: [],
    meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  }));

  const rows = result.items.map((item) => ({
    id: String(item.id),
    code: String(item.code),
    transactionDate: formatDateTime(item.transactionDate),
    type: String(item.type),
    category: String(item.category ?? "-"),
    amount: Number(item.amount ?? 0),
    description: String(item.description ?? "-"),
    createdByName: String(item.createdByName ?? "Sistem"),
    referenceType: String(item.referenceType ?? "-"),
    referenceId: String(item.referenceId ?? "-"),
  }));

  const debitTotal = rows
    .filter((item) => item.type === "debit")
    .reduce((sum, item) => sum + item.amount, 0);
  const creditTotal = rows
    .filter((item) => item.type === "credit")
    .reduce((sum, item) => sum + item.amount, 0);

  const paginationQuery = new URLSearchParams();
  paginationQuery.set("q", q);
  paginationQuery.set("type", type);
  paginationQuery.set("category", category);
  paginationQuery.set("pageSize", String(result.meta.pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Cash Ledger"
        description="Arus kas operasional yang dihasilkan dari payment posting dan transaksi kas harian."
      />

      <FilterBar
        left={
          <form className="flex flex-1 flex-col gap-3 xl:flex-row xl:items-end">
            <div className="min-w-[240px] space-y-2">
              <label className="text-sm font-medium">Cari Kode / Deskripsi</label>
              <Input defaultValue={q} name="q" placeholder="Kode kas, kategori, deskripsi" />
            </div>
            <div className="min-w-[180px] space-y-2">
              <label className="text-sm font-medium">Tipe Arus</label>
              <Select defaultValue={type} name="type" placeholder="Semua tipe">
                <option value="debit">Kas Masuk</option>
                <option value="credit">Kas Keluar</option>
              </Select>
            </div>
            <div className="min-w-[220px] space-y-2">
              <label className="text-sm font-medium">Kategori</label>
              <Input defaultValue={category} name="category" placeholder="Kas Masuk, Bank Keluar, dll" />
            </div>
            <input name="pageSize" type="hidden" value={result.meta.pageSize} />
            <div className="flex items-end gap-2">
              <Button type="submit">Terapkan</Button>
            </div>
          </form>
        }
        right={
          <>
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              <ReceiptText className="size-4" />
              {result.meta.total} transaksi kas
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              <ArrowDownLeft className="size-4" />
              Masuk {formatCurrency(debitTotal)}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              <ArrowUpRight className="size-4" />
              Keluar {formatCurrency(creditTotal)}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              <Landmark className="size-4" />
              Selisih {formatCurrency(debitTotal - creditTotal)}
            </div>
          </>
        }
      />

      <SimpleTable
        cellRenderers={{
          type: (value) => (
            <Badge variant={String(value) === "debit" ? "success" : "neutral"}>
              {String(value) === "debit" ? "Kas Masuk" : "Kas Keluar"}
            </Badge>
          ),
          amount: (value) => formatCurrency(Number(value ?? 0)),
        }}
        columnLabels={{
          code: "Kode Kas",
          transactionDate: "Tanggal",
          type: "Tipe",
          category: "Kategori",
          amount: "Nominal",
          description: "Deskripsi",
          createdByName: "Dicatat Oleh",
        }}
        columns={["code", "transactionDate", "type", "category", "amount", "description", "createdByName"]}
        getHref={(row) =>
          row.referenceType === "payment" && row.referenceId !== "-" ? `/print/payments/${String(row.referenceId)}/receipt` : null
        }
        linkColumn="code"
        numericColumns={["amount"]}
        rows={rows}
      />

      <MasterPagination
        basePath="/finance/cash-ledger"
        page={result.meta.page}
        query={paginationQuery}
        totalPages={result.meta.totalPages}
      />
    </div>
  );
}
