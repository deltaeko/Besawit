"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator, PackagePlus, Truck, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { SectionCard } from "@/components/shared/section-card";
import { SummaryPanel } from "@/components/shared/summary-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { storePurchaseSchema } from "@/lib/validation/store";
import {
  StoreFieldError,
  StoreFieldHint,
  StoreFieldLabel,
  StoreMetricCard,
} from "@/modules/store/store-form-primitives";

type PurchaseFormInput = z.input<typeof storePurchaseSchema>;
type PurchaseValues = z.output<typeof storePurchaseSchema>;

function getErrorMessage(
  errors: Partial<Record<keyof PurchaseValues, { message?: string }>>,
  name: keyof PurchaseValues,
) {
  return errors[name]?.message ?? "";
}

export function StorePurchaseForm({
  suppliers,
  warehouses,
  products,
}: {
  suppliers: Array<{ id: string; name: string }>;
  warehouses: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string; purchasePrice: number }>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<PurchaseFormInput, unknown, PurchaseValues>({
    resolver: zodResolver(storePurchaseSchema),
    defaultValues: {
      transactionDate: new Date().toISOString().slice(0, 10),
      supplierId: "",
      warehouseId: "",
      invoiceNumber: "",
      discount: 0,
      tax: 0,
      items: [{ productId: "", quantity: 1, unitPrice: 0 }],
      notes: "",
    },
  });
  const items = useFieldArray({ control: form.control, name: "items" });
  const watched = useWatch({ control: form.control });
  const totals = useMemo(() => {
    const subtotal = (watched.items ?? []).reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
      0,
    );
    const discount = Number(watched.discount || 0);
    const tax = Number(watched.tax || 0);
    const total = subtotal - discount + tax;

    return { subtotal, discount, tax, total };
  }, [watched]);

  async function onSubmit(payload: PurchaseValues) {
    setSubmitting(true);
    const response = await fetch("/api/store/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { id?: string; error?: string };

    if (!response.ok) {
      toast.error(result.error ?? "Gagal menyimpan pembelian toko.");
      setSubmitting(false);
      return;
    }

    toast.success("Pembelian toko tersimpan.");
    router.push(`/store/purchases/${result.id}`);
  }

  const errors = form.formState.errors as Partial<Record<keyof PurchaseValues, { message?: string }>>;

  return (
    <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-6">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="space-y-3">
              <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Store</div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Form Pembelian Barang</h2>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Catat pembelian barang dari supplier untuk stok masuk, hutang supplier, dan nilai persediaan.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Kode transaksi dibuat otomatis saat pembelian disimpan.
            </div>
          </div>
        </div>

        <SectionCard
          title="Informasi Umum"
          description="Tetapkan tanggal transaksi, supplier, gudang, dan nomor referensi invoice."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <StoreFieldLabel htmlFor="transactionDate" required>
                Tanggal
              </StoreFieldLabel>
              <Input id="transactionDate" type="date" {...form.register("transactionDate")} />
              <StoreFieldError message={getErrorMessage(errors, "transactionDate")} />
            </div>
            <div className="space-y-2">
              <StoreFieldLabel htmlFor="supplierId" required>
                Supplier
              </StoreFieldLabel>
              <Select id="supplierId" placeholder="Pilih supplier" {...form.register("supplierId")}>
                {suppliers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
              <StoreFieldError message={getErrorMessage(errors, "supplierId")} />
            </div>
            <div className="space-y-2">
              <StoreFieldLabel htmlFor="warehouseId" required>
                Gudang
              </StoreFieldLabel>
              <Select id="warehouseId" placeholder="Pilih gudang" {...form.register("warehouseId")}>
                {warehouses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
              <StoreFieldError message={getErrorMessage(errors, "warehouseId")} />
            </div>
            <div className="space-y-2">
              <StoreFieldLabel htmlFor="invoiceNumber">Nomor Invoice</StoreFieldLabel>
              <Input id="invoiceNumber" placeholder="Opsional" {...form.register("invoiceNumber")} />
              <StoreFieldHint>Gunakan nomor invoice supplier jika tersedia.</StoreFieldHint>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Item Pembelian"
          description="Masukkan produk, qty, dan harga beli untuk setiap item pembelian."
        >
          <div className="space-y-4">
            {items.fields.map((field, index) => {
              const rowSubtotal =
                Number(watched.items?.[index]?.quantity || 0) *
                Number(watched.items?.[index]?.unitPrice || 0);

              return (
                <div
                  key={field.id}
                  className="space-y-4 rounded-2xl border border-border/80 bg-muted/15 p-4"
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_120px_180px_auto]">
                    <div className="space-y-2">
                      <StoreFieldLabel required>Produk</StoreFieldLabel>
                      <Select
                        {...form.register(`items.${index}.productId`, {
                          onChange: (event) => {
                            const nextProductId = event.target.value;
                            const selectedProduct = products.find((item) => item.id === nextProductId);

                            if (selectedProduct) {
                              form.setValue(`items.${index}.unitPrice`, selectedProduct.purchasePrice, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            }
                          },
                        })}
                        placeholder="Pilih produk"
                      >
                        {products.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <StoreFieldLabel required>Qty</StoreFieldLabel>
                      <Input
                        min="0"
                        step="0.01"
                        type="number"
                        {...form.register(`items.${index}.quantity`)}
                      />
                    </div>
                    <div className="space-y-2">
                      <StoreFieldLabel required>Harga Beli</StoreFieldLabel>
                      <Input
                        min="0"
                        step="0.01"
                        type="number"
                        {...form.register(`items.${index}.unitPrice`)}
                      />
                      <StoreFieldHint>
                        Harga default mengikuti harga beli aktif pada master produk.
                      </StoreFieldHint>
                    </div>
                    <div className="flex items-end xl:justify-end">
                      <Button type="button" variant="outline" onClick={() => items.remove(index)}>
                        Hapus
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_220px]">
                    <div className="rounded-xl border border-border/70 bg-card/70 px-4 py-3 text-sm text-muted-foreground">
                      Perhitungan item: Qty x Harga Beli
                    </div>
                    <StoreMetricCard
                      label="Subtotal"
                      value={formatCurrency(rowSubtotal)}
                      helper="Dibentuk otomatis dari item saat ini"
                    />
                  </div>
                </div>
              );
            })}
            <Button
              type="button"
              variant="secondary"
              onClick={() => items.append({ productId: "", quantity: 1, unitPrice: 0 })}
            >
              <PackagePlus className="size-4" />
              Tambah Item
            </Button>
          </div>
        </SectionCard>

        <SectionCard
          title="Penyesuaian & Catatan"
          description="Masukkan diskon, pajak, dan catatan tambahan pembelian jika diperlukan."
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <StoreFieldLabel htmlFor="discount">Diskon</StoreFieldLabel>
                <Input id="discount" step="0.01" type="number" {...form.register("discount")} />
                <StoreFieldError message={getErrorMessage(errors, "discount")} />
              </div>
              <div className="space-y-2">
                <StoreFieldLabel htmlFor="tax">Pajak</StoreFieldLabel>
                <Input id="tax" step="0.01" type="number" {...form.register("tax")} />
                <StoreFieldError message={getErrorMessage(errors, "tax")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <StoreFieldLabel htmlFor="notes">Catatan</StoreFieldLabel>
                <Textarea
                  id="notes"
                  placeholder="Tambahkan catatan seperti kondisi barang, tempo supplier, atau info invoice."
                  {...form.register("notes")}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <Truck className="mt-0.5 size-4 text-primary" />
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Dampak transaksi</div>
                  <p className="leading-6">
                    Saat pembelian disimpan, sistem akan membentuk stok masuk dan hutang supplier otomatis.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SummaryPanel
        title="Ringkasan Pembelian"
        items={[
          { label: "Subtotal Item", value: formatCurrency(totals.subtotal) },
          { label: "Diskon", value: formatCurrency(totals.discount) },
          { label: "Pajak", value: formatCurrency(totals.tax) },
          { label: "Total Transaksi", value: formatCurrency(totals.total) },
        ]}
        footer={
          <div className="space-y-3">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <Calculator className="size-4 text-primary" />
                Alur pencatatan
              </div>
              Pembelian toko akan mencatat stok masuk dan hutang supplier secara otomatis setelah disimpan.
            </div>
            <Button className="w-full" disabled={submitting} type="submit">
              <Wallet className="size-4" />
              {submitting ? "Menyimpan..." : "Simpan Pembelian"}
            </Button>
          </div>
        }
      />
    </form>
  );
}
