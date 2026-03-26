"use client";

import { useMemo, useState } from "react";

import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

type ProductPriceHistoryRow = {
  id: string;
  effectiveFrom: Date | string;
  purchasePrice: string | number;
  sellingPrice: string | number;
  notes?: string | null;
  createdByName?: string | null;
};

export function ProductPriceHistoryPanel({
  histories,
}: {
  histories: ProductPriceHistoryRow[];
}) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "active" | "history">("all");

  const filtered = useMemo(() => {
    return histories
      .map((item, index) => ({
        ...item,
        index,
        previous: histories[index + 1] ?? null,
      }))
      .filter((item) => {
      const matchesScope =
        scope === "all"
          ? true
          : scope === "active"
            ? item.index === 0
            : item.index > 0;

      if (!matchesScope) return false;

      const haystack = [
        formatDateTime(item.effectiveFrom),
        item.notes ?? "",
        item.createdByName ?? "",
        String(item.purchasePrice),
        String(item.sellingPrice),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query.trim().toLowerCase());
      });
  }, [histories, query, scope]);

  const latest = histories[0];
  const latestPrevious = histories[1] ?? null;
  const latestPurchaseDelta = latest
    ? Number(latest.purchasePrice) - Number(latestPrevious?.purchasePrice ?? latest.purchasePrice)
    : 0;
  const latestSellingDelta = latest
    ? Number(latest.sellingPrice) - Number(latestPrevious?.sellingPrice ?? latest.sellingPrice)
    : 0;

  return (
    <SectionCard
      title="Histori Harga"
      description="Semua perubahan harga produk tersimpan di sini. Baris paling atas adalah harga aktif saat ini."
    >
      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Harga Aktif</div>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Beli</div>
              <div className="text-base font-semibold">{formatCurrency(Number(latest?.purchasePrice ?? 0))}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Jual</div>
              <div className="text-lg font-semibold">{formatCurrency(Number(latest?.sellingPrice ?? 0))}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Perubahan Terakhir</div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Harga beli</span>
              <span className="font-semibold">{formatCurrency(latestPurchaseDelta)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Harga jual</span>
              <span className="font-semibold">{formatCurrency(latestSellingDelta)}</span>
            </div>
            <div className="pt-1 text-xs text-muted-foreground">
              {latest ? `Berlaku sejak ${formatDate(latest.effectiveFrom)}` : "Belum ada histori harga."}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ringkasan Histori</div>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <div className="text-2xl font-semibold">{histories.length}</div>
              <div className="text-xs text-muted-foreground">Total perubahan harga</div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {histories.length > 1 ? `${histories.length - 1} histori lama tersimpan` : "Baru ada 1 harga aktif"}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <Input
          placeholder="Cari catatan, tanggal, atau nama pengubah..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select value={scope} onChange={(event) => setScope(event.target.value as "all" | "active" | "history")}>
          <option value="all">Semua Histori</option>
          <option value="active">Harga Aktif</option>
          <option value="history">Histori Lama</option>
        </Select>
      </div>

      <div className="space-y-3 lg:hidden">
        {filtered.length ? (
          filtered.map((item) => {
            const isActive = item.index === 0;
            const purchaseDelta = Number(item.purchasePrice) - Number(item.previous?.purchasePrice ?? item.purchasePrice);
            const sellingDelta = Number(item.sellingPrice) - Number(item.previous?.sellingPrice ?? item.sellingPrice);

            return (
              <div
                className={`rounded-2xl border p-4 ${isActive ? "border-primary/30 bg-primary/5" : "border-border/80 bg-background/80"}`}
                key={item.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{formatDateTime(item.effectiveFrom)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.createdByName ?? "Sistem"}</div>
                  </div>
                  {isActive ? <Badge variant="success">Harga Aktif</Badge> : <Badge variant="neutral">Riwayat</Badge>}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Harga Beli</div>
                    <div className="mt-2 text-base font-semibold">{formatCurrency(item.purchasePrice)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Perubahan {formatCurrency(purchaseDelta)}</div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Harga Jual</div>
                    <div className="mt-2 text-base font-semibold">{formatCurrency(item.sellingPrice)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Perubahan {formatCurrency(sellingDelta)}</div>
                  </div>
                </div>

                <div className="mt-3 text-sm text-muted-foreground">{item.notes?.trim() || "Tidak ada catatan perubahan."}</div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
            Tidak ada histori yang cocok dengan filter.
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-border/80 lg:block">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-muted/30">
            <tr>
              {["Status", "Tanggal Berlaku", "Harga Beli", "Harga Jual", "Catatan", "Diubah Oleh"].map((column) => (
                <th className="border-b border-border/80 px-4 py-3 text-left font-semibold" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((item) => {
                const isActive = item.index === 0;
                const purchaseDelta = Number(item.purchasePrice) - Number(item.previous?.purchasePrice ?? item.purchasePrice);
                const sellingDelta = Number(item.sellingPrice) - Number(item.previous?.sellingPrice ?? item.sellingPrice);

                return (
                  <tr className={isActive ? "bg-primary/5" : "border-t border-border/70"} key={item.id}>
                    <td className="px-4 py-3 align-top">
                      {isActive ? <Badge variant="success">Harga Aktif</Badge> : <Badge variant="neutral">Riwayat</Badge>}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold">{formatDateTime(item.effectiveFrom)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDate(item.effectiveFrom)}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold">{formatCurrency(item.purchasePrice)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Perubahan {formatCurrency(purchaseDelta)}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold">{formatCurrency(item.sellingPrice)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Perubahan {formatCurrency(sellingDelta)}</div>
                    </td>
                    <td className="max-w-[320px] px-4 py-3 align-top text-muted-foreground">
                      {item.notes?.trim() || "Tidak ada catatan perubahan."}
                    </td>
                    <td className="px-4 py-3 align-top">{item.createdByName ?? "Sistem"}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={6}>
                  Tidak ada histori yang cocok dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
