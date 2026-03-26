"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { SectionCard } from "@/components/shared/section-card";
import { SummaryPanel } from "@/components/shared/summary-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { productPriceChangeSchema } from "@/lib/validation/master";

type ProductPriceChangeInput = z.input<typeof productPriceChangeSchema>;
type ProductPriceChangeValues = z.output<typeof productPriceChangeSchema>;

export function ProductPriceChangeForm({
  productId,
  backHref,
  currentPurchasePrice,
  currentSellingPrice,
}: {
  productId: string;
  backHref: string;
  currentPurchasePrice: number;
  currentSellingPrice: number;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [marginPercent, setMarginPercent] = useState("12");
  const form = useForm<ProductPriceChangeInput, unknown, ProductPriceChangeValues>({
    resolver: zodResolver(productPriceChangeSchema),
    defaultValues: {
      effectiveFrom: new Date().toISOString().slice(0, 10),
      purchasePrice: currentPurchasePrice,
      sellingPrice: currentSellingPrice,
      note: "",
    },
  });

  const watched = useWatch({ control: form.control });
  const purchaseDelta = useMemo(
    () => Number(watched.purchasePrice ?? 0) - currentPurchasePrice,
    [watched.purchasePrice, currentPurchasePrice],
  );
  const sellingDelta = useMemo(
    () => Number(watched.sellingPrice ?? 0) - currentSellingPrice,
    [watched.sellingPrice, currentSellingPrice],
  );
  const newMarginValue = useMemo(
    () => Number(watched.sellingPrice ?? 0) - Number(watched.purchasePrice ?? 0),
    [watched.purchasePrice, watched.sellingPrice],
  );
  const newMarginPercent = useMemo(() => {
    const purchase = Number(watched.purchasePrice ?? 0);
    if (purchase <= 0) return 0;
    return (newMarginValue / purchase) * 100;
  }, [watched.purchasePrice, newMarginValue]);

  function applyMarginPreset() {
    const purchase = Number(form.getValues("purchasePrice") ?? 0);
    const margin = Number(marginPercent || 0);

    if (!Number.isFinite(purchase) || purchase < 0 || !Number.isFinite(margin)) {
      return;
    }

    const nextSellingPrice = Math.round(purchase * (1 + margin / 100));
    form.setValue("sellingPrice", nextSellingPrice, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function resetToCurrentPrice() {
    form.setValue("purchasePrice", currentPurchasePrice, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("sellingPrice", currentSellingPrice, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function onSubmit(payload: ProductPriceChangeValues) {
    setSubmitting(true);

    const response = await fetch(`/api/products/${productId}/prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(result.error ?? "Gagal memperbarui harga produk.");
      setSubmitting(false);
      return;
    }

    toast.success("Harga produk berhasil diperbarui.");
    router.push(backHref);
    router.refresh();
  }

  return (
    <form className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_360px]" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-5">
        <SectionCard
          title="Harga Baru"
          description="Perubahan harga akan langsung menjadi harga aktif produk dan tetap disimpan sebagai histori."
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Harga Beli Saat Ini</div>
                <div className="mt-2 text-base font-semibold">{formatCurrency(currentPurchasePrice)}</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Harga Jual Saat Ini</div>
                <div className="mt-2 text-base font-semibold">{formatCurrency(currentSellingPrice)}</div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="effectiveFrom">Tanggal Berlaku</Label>
              <Input id="effectiveFrom" type="date" {...form.register("effectiveFrom")} />
              {form.formState.errors.effectiveFrom ? (
                <p className="text-xs text-destructive">{form.formState.errors.effectiveFrom.message}</p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground">
              Tanggal berlaku disimpan sebagai metadata histori harga. Setelah disimpan, harga aktif produk langsung diperbarui.
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 md:col-span-2">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-semibold">Aksi Cepat Harga</div>
                  <div className="text-sm text-muted-foreground">
                    Gunakan harga aktif sebagai titik awal atau hitung harga jual dari margin.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={resetToCurrentPrice} type="button" variant="outline">
                    Salin Harga Aktif
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[180px_auto]">
                <div className="space-y-2">
                  <Label htmlFor="marginPercent">Margin %</Label>
                  <Input
                    id="marginPercent"
                    inputMode="decimal"
                    value={marginPercent}
                    onChange={(event) => setMarginPercent(event.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={applyMarginPreset} type="button" variant="secondary">
                    Terapkan ke Harga Jual
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Harga Beli Baru</Label>
              <Input id="purchasePrice" min="0" step="0.01" type="number" {...form.register("purchasePrice")} />
              {form.formState.errors.purchasePrice ? (
                <p className="text-xs text-destructive">{form.formState.errors.purchasePrice.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Harga Jual Baru</Label>
              <Input id="sellingPrice" min="0" step="0.01" type="number" {...form.register("sellingPrice")} />
              {form.formState.errors.sellingPrice ? (
                <p className="text-xs text-destructive">{form.formState.errors.sellingPrice.message}</p>
              ) : null}
            </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Catatan Perubahan"
          description="Catatan ini akan ikut tersimpan di histori harga untuk kebutuhan audit."
        >
          <div className="space-y-2">
            <Label htmlFor="note">Catatan</Label>
            <Textarea
              id="note"
              placeholder="Contoh: Penyesuaian harga supplier per 21 Maret 2026."
              {...form.register("note")}
            />
          </div>
        </SectionCard>

        <div className="flex flex-wrap justify-end gap-3">
          <Button asChild type="button" variant="outline">
            <Link href={backHref}>Batal</Link>
          </Button>
          <Button disabled={submitting} type="submit">
            {submitting ? "Menyimpan..." : "Simpan Harga Baru"}
          </Button>
        </div>
      </div>

      <SummaryPanel
        title="Simulasi Harga Baru"
        items={[
          { label: "Harga Beli Saat Ini", value: formatCurrency(currentPurchasePrice) },
          { label: "Harga Beli Baru", value: formatCurrency(Number(watched.purchasePrice ?? 0)) },
          { label: "Selisih Harga Beli", value: formatCurrency(purchaseDelta) },
          { label: "Harga Jual Saat Ini", value: formatCurrency(currentSellingPrice) },
          { label: "Harga Jual Baru", value: formatCurrency(Number(watched.sellingPrice ?? 0)) },
          { label: "Selisih Harga Jual", value: formatCurrency(sellingDelta) },
          { label: "Margin Baru", value: formatCurrency(newMarginValue) },
          { label: "Margin %", value: `${newMarginPercent.toFixed(2)}%` },
        ]}
        footer={
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            {newMarginValue >= 0
              ? "Harga jual baru masih berada di atas harga beli dan siap dipakai sebagai acuan transaksi."
              : "Perhatian: harga jual baru lebih rendah dari harga beli. Periksa kembali margin sebelum menyimpan."}
          </div>
        }
      />
    </form>
  );
}
