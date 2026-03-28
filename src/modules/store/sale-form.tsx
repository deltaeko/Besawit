"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator, CreditCard, PackagePlus, Receipt, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { SectionCard } from "@/components/shared/section-card";
import { SummaryPanel } from "@/components/shared/summary-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { storeSaleSchema } from "@/lib/validation/store";
import {
  StoreFieldError,
  StoreFieldHint,
  StoreFieldLabel,
  StoreMetricCard,
} from "@/modules/store/store-form-primitives";

type SaleFormInput = z.input<typeof storeSaleSchema>;
type SaleValues = z.output<typeof storeSaleSchema>;

function getErrorMessage(
  errors: Partial<Record<keyof SaleValues, { message?: string }>>,
  name: keyof SaleValues,
) {
  return errors[name]?.message ?? "";
}

export function StoreSaleForm({
  customers,
  warehouses,
  products,
}: {
  customers: Array<{
    id: string;
    name: string;
    farmerId?: string | null;
    farmerName?: string | null;
    farmerCode?: string | null;
  }>;
  warehouses: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string; sellingPrice: number }>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const defaultDueDate = useMemo(() => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().slice(0, 10);
  }, []);
  const form = useForm<SaleFormInput, unknown, SaleValues>({
    resolver: zodResolver(storeSaleSchema),
    defaultValues: {
      transactionDate: new Date().toISOString().slice(0, 10),
      customerId: "",
      warehouseId: "",
      invoiceNumber: "",
      saleType: "cash",
      dueDate: defaultDueDate,
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

  async function onSubmit(payload: SaleValues) {
    setSubmitting(true);
    const response = await fetch("/api/store/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { id?: string; error?: string };

    if (!response.ok) {
      toast.error(result.error ?? "Gagal menyimpan penjualan toko.");
      setSubmitting(false);
      return;
    }

    toast.success("Penjualan toko tersimpan.");
    router.push(`/store/sales/${result.id}`);
  }

  const errors = form.formState.errors as Partial<Record<keyof SaleValues, { message?: string }>>;
  const saleType = watched.saleType === "credit" ? "credit" : "cash";
  const selectedCustomer = customers.find((item) => item.id === watched.customerId);

  return (
    <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-6">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="space-y-3">
              <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Store</div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Form Penjualan Toko</h2>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Catat penjualan barang ke pelanggan toko. Bila pelanggan toko terhubung ke petani, piutang kredit dapat dipotong dari hasil pembelian TBS.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={saleType === "credit" ? "warning" : "neutral"}>
                {saleType === "credit" ? "Kredit" : "Tunai"}
              </Badge>
            </div>
          </div>
        </div>

        <SectionCard
          title="Informasi Umum"
          description="Tetapkan tanggal transaksi, gudang, jenis penjualan, dan pihak pelanggan."
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
              <StoreFieldLabel htmlFor="saleType" required>
                Jenis Penjualan
              </StoreFieldLabel>
              <Select id="saleType" {...form.register("saleType")}>
                <option value="cash">Tunai</option>
                <option value="credit">Kredit</option>
              </Select>
            </div>
            <div className="space-y-2">
              <StoreFieldLabel htmlFor="customerId" required={saleType === "credit"}>
                Pelanggan Toko
              </StoreFieldLabel>
              <Select id="customerId" placeholder="Pilih pelanggan toko" {...form.register("customerId")}>
                {customers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.farmerName ? `${item.name} - Petani: ${item.farmerName}` : item.name}
                  </option>
                ))}
              </Select>
              <StoreFieldError message={getErrorMessage(errors, "customerId")} />
              <StoreFieldHint>
                Wajib diisi jika transaksi menggunakan penjualan kredit.
              </StoreFieldHint>
              {selectedCustomer?.farmerName ? (
                <StoreFieldHint>
                  {`Pelanggan ini terhubung ke petani ${selectedCustomer.farmerName}${
                    selectedCustomer.farmerCode ? ` (${selectedCustomer.farmerCode})` : ""
                  }. Piutang kreditnya bisa dipotong dari hasil TBS.`}
                </StoreFieldHint>
              ) : (
                <StoreFieldHint>
                  Jika pelanggan ini adalah petani, tautkan dulu di master Pelanggan Toko agar piutang bisa dipotong dari hasil TBS.
                </StoreFieldHint>
              )}
            </div>
            <div className="space-y-2 xl:col-span-2">
              <StoreFieldLabel htmlFor="invoiceNumber">Nomor Invoice</StoreFieldLabel>
              <Input id="invoiceNumber" placeholder="Opsional" {...form.register("invoiceNumber")} />
            </div>
            <div className="space-y-2 xl:col-span-2">
              <StoreFieldLabel htmlFor="dueDate" required={saleType === "credit"}>
                Jatuh Tempo Piutang
              </StoreFieldLabel>
              <Input id="dueDate" type="date" {...form.register("dueDate")} />
              <StoreFieldError message={getErrorMessage(errors, "dueDate")} />
              <StoreFieldHint>
                {saleType === "credit"
                  ? "Tanggal jatuh tempo akan disimpan pada piutang pelanggan toko."
                  : "Isi bila ingin menyiapkan tanggal jatuh tempo saat penjualan diubah ke kredit."}
              </StoreFieldHint>
            </div>
            <div className="xl:col-span-2 rounded-2xl border border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <Receipt className="size-4 text-primary" />
                Alur keuangan
              </div>
              Penjualan tunai selesai saat transaksi disimpan. Penjualan kredit akan membentuk piutang pelanggan toko secara otomatis.
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Item Penjualan"
          description="Masukkan produk, qty, dan harga jual untuk setiap item penjualan."
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
                              form.setValue(`items.${index}.unitPrice`, selectedProduct.sellingPrice, {
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
                      <StoreFieldLabel required>Harga Jual</StoreFieldLabel>
                      <Input
                        min="0"
                        step="0.01"
                        type="number"
                        {...form.register(`items.${index}.unitPrice`)}
                      />
                      <StoreFieldHint>
                        Harga default mengikuti harga jual aktif pada master produk.
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
                      Perhitungan item: Qty x Harga Jual
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
          description="Masukkan diskon, pajak, dan catatan tambahan penjualan."
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
                  placeholder="Tambahkan catatan transaksi, penagihan, atau informasi pelanggan."
                  {...form.register("notes")}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 size-4 text-primary" />
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Dampak transaksi</div>
                  <p className="leading-6">
                    Penjualan akan mencatat stok keluar. Untuk kredit, piutang pelanggan toko dibentuk otomatis sesuai total transaksi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SummaryPanel
        title="Ringkasan Penjualan"
        items={[
          { label: "Jenis Penjualan", value: saleType === "credit" ? "Kredit" : "Tunai" },
          { label: "Jatuh Tempo", value: watched.dueDate || "-" },
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
                Ringkasan kas atau piutang
              </div>
              {saleType === "credit"
                ? "Penjualan kredit akan masuk ke piutang pelanggan toko."
                : "Penjualan tunai akan selesai tanpa pembentukan piutang."}
            </div>
            <Button className="w-full" disabled={submitting} type="submit">
              <Wallet className="size-4" />
              {submitting ? "Menyimpan..." : "Simpan Penjualan"}
            </Button>
          </div>
        }
      />
    </form>
  );
}
