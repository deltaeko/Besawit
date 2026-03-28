"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightLeft, PackageSearch, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { SectionCard } from "@/components/shared/section-card";
import { SummaryPanel } from "@/components/shared/summary-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { storePurchaseReturnSchema } from "@/lib/validation/store";
import {
  StoreFieldError,
  StoreFieldHint,
  StoreFieldLabel,
} from "@/modules/store/store-form-primitives";

type StorePurchaseReturnFormInput = z.input<typeof storePurchaseReturnSchema>;
type StorePurchaseReturnValues = z.output<typeof storePurchaseReturnSchema>;

export function StorePurchaseReturnForm({
  purchaseId,
  purchaseCode,
  supplierName,
  warehouseName,
  transactionDate,
  payableAmount,
  totalReturnedAmount,
  items,
}: {
  purchaseId: string;
  purchaseCode: string;
  supplierName: string;
  warehouseName: string;
  transactionDate: string | Date;
  payableAmount: number;
  totalReturnedAmount: number;
  items: Array<{
    purchaseItemId: string;
    productName: string;
    productUnit: string;
    purchasedQty: number;
    returnedQty: number;
    availableQty: number;
    unitCost: number;
  }>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<StorePurchaseReturnFormInput, unknown, StorePurchaseReturnValues>({
    resolver: zodResolver(storePurchaseReturnSchema),
    defaultValues: {
      returnDate: new Date().toISOString().slice(0, 10),
      notes: "",
      items: items.map((item) => ({
        purchaseItemId: item.purchaseItemId,
        quantity: 0,
      })),
    },
  });

  const watchedItems = useWatch({ control: form.control, name: "items" });
  const returnSummary = useMemo(() => {
    const selectedTotal = items.reduce((total, item, index) => {
      const qty = Number(watchedItems?.[index]?.quantity ?? 0);
      return total + qty * item.unitCost;
    }, 0);

    return {
      selectedTotal,
      nextOutstanding: Math.max(payableAmount - selectedTotal, 0),
    };
  }, [items, payableAmount, watchedItems]);

  async function onSubmit(payload: StorePurchaseReturnValues) {
    setSubmitting(true);
    const response = await fetch(`/api/store/purchases/${purchaseId}/returns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(result.error ?? "Gagal menyimpan retur pembelian.");
      setSubmitting(false);
      return;
    }

    toast.success("Retur pembelian barang tersimpan.");
    router.push(`/store/purchases/${purchaseId}`);
    router.refresh();
  }

  const errors = form.formState.errors;

  return (
    <form
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <div className="space-y-3">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Store</div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Form Retur Pembelian Barang</h2>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Catat item pembelian supplier yang dikembalikan. Retur akan mengurangi stok dan mengurangi nilai hutang supplier yang belum dibayar.
              </p>
            </div>
          </div>
        </div>

        <SectionCard
          title="Referensi Pembelian"
          description="Retur ini terhubung ke dokumen pembelian barang yang sudah tersimpan."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Kode Pembelian</div>
              <div className="mt-2 text-lg font-semibold">{purchaseCode}</div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Supplier</div>
              <div className="mt-2 text-lg font-semibold">{supplierName}</div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Gudang</div>
              <div className="mt-2 text-lg font-semibold">{warehouseName}</div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Tanggal Pembelian</div>
              <div className="mt-2 text-lg font-semibold">{formatDate(transactionDate)}</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Informasi Retur"
          description="Tentukan tanggal retur dan item yang dikembalikan ke supplier."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <StoreFieldLabel htmlFor="returnDate" required>
                Tanggal Retur
              </StoreFieldLabel>
              <Input id="returnDate" type="date" {...form.register("returnDate")} />
              <StoreFieldError message={errors.returnDate?.message} />
            </div>
            <div className="space-y-2">
              <StoreFieldLabel htmlFor="notes">Catatan</StoreFieldLabel>
              <Textarea
                id="notes"
                placeholder="Alasan retur, kondisi barang, atau kesepakatan supplier."
                {...form.register("notes")}
              />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {items.map((item, index) => (
              <div key={item.purchaseItemId} className="rounded-2xl border border-border/80 bg-muted/15 p-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_120px_140px_140px_180px] xl:items-end">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground">{item.productName}</div>
                    <StoreFieldHint>
                      {`Dibeli ${formatNumber(item.purchasedQty)} ${item.productUnit} · Sudah diretur ${formatNumber(item.returnedQty)} ${item.productUnit}`}
                    </StoreFieldHint>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-sm">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Sisa Qty</div>
                    <div className="mt-1 font-semibold">
                      {formatNumber(item.availableQty)} {item.productUnit}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-sm">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Harga Beli</div>
                    <div className="mt-1 font-semibold">{formatCurrency(item.unitCost)}</div>
                  </div>
                  <div className="space-y-2">
                    <StoreFieldLabel required>Qty Retur</StoreFieldLabel>
                    <Input
                      max={item.availableQty}
                      min="0"
                      step="0.01"
                      type="number"
                      {...form.register(`items.${index}.quantity`)}
                    />
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-sm">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Nilai Retur</div>
                    <div className="mt-1 font-semibold">
                      {formatCurrency(
                        Number(watchedItems?.[index]?.quantity ?? 0) * item.unitCost,
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <StoreFieldError message={errors.items?.message as string | undefined} />
          </div>
        </SectionCard>
      </div>

      <SummaryPanel
        title="Ringkasan Retur"
        items={[
          { label: "Hutang Saat Ini", value: formatCurrency(payableAmount) },
          { label: "Total Retur Sebelumnya", value: formatCurrency(totalReturnedAmount) },
          { label: "Nilai Retur Dokumen Ini", value: formatCurrency(returnSummary.selectedTotal) },
          { label: "Sisa Hutang Setelah Retur", value: formatCurrency(returnSummary.nextOutstanding) },
        ]}
        footer={
          <div className="space-y-3">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <ArrowRightLeft className="size-4 text-primary" />
                Dampak retur
              </div>
              Stok akan berkurang dari gudang pembelian dan nilai hutang supplier akan disesuaikan otomatis.
            </div>
            <Button className="w-full" disabled={submitting} type="submit">
              <Wallet className="size-4" />
              {submitting ? "Menyimpan..." : "Simpan Retur Pembelian"}
            </Button>
            <Button asChild className="w-full" type="button" variant="outline">
              <a href={`/store/purchases/${purchaseId}`}>
                <PackageSearch className="size-4" />
                Kembali ke Detail Pembelian
              </a>
            </Button>
          </div>
        }
      />
    </form>
  );
}
