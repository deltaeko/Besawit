"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardCheck, PackagePlus, Scale } from "lucide-react";
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
import { formatCurrency, formatNumber } from "@/lib/utils";
import { stockTakeSchema } from "@/lib/validation/inventory";
import {
  InventoryFieldError,
  InventoryFieldHint,
  InventoryFieldLabel,
  InventoryMetricCard,
} from "@/modules/inventory/inventory-form-primitives";

type StockTakeFormInput = z.input<typeof stockTakeSchema>;
type StockTakeValues = z.output<typeof stockTakeSchema>;

function getErrorMessage(
  errors: Partial<Record<keyof StockTakeValues, { message?: string }>>,
  name: keyof StockTakeValues,
) {
  return errors[name]?.message ?? "";
}

export function StockTakeForm({
  warehouses,
  products,
  balances,
}: {
  warehouses: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string }>;
  balances: Array<{
    warehouseId: string;
    productId: string;
    quantity: string;
    averageCost: string;
    productName?: string | null;
  }>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<StockTakeFormInput, unknown, StockTakeValues>({
    resolver: zodResolver(stockTakeSchema),
    defaultValues: {
      stockDate: new Date().toISOString().slice(0, 10),
      warehouseId: "",
      notes: "",
      items: [],
    },
  });
  const items = useFieldArray({ control: form.control, name: "items" });
  const watched = useWatch({ control: form.control });
  const selectedWarehouseId = watched.warehouseId ?? "";
  const variance = useMemo(
    () =>
      (watched.items ?? []).reduce(
        (total, item) =>
          total + (Number(item.physicalQty || 0) - Number(item.systemQty || 0)) * Number(item.unitCost || 0),
        0,
      ),
    [watched],
  );

  const availableWarehouseBalances = useMemo(
    () =>
      balances.filter((item) =>
        selectedWarehouseId ? item.warehouseId === selectedWarehouseId : false,
      ),
    [balances, selectedWarehouseId],
  );

  function buildWarehouseItems(warehouseId: string) {
    return balances
      .filter((item) => item.warehouseId === warehouseId)
      .sort((left, right) => {
        const leftName =
          left.productName ?? products.find((product) => product.id === left.productId)?.name ?? "";
        const rightName =
          right.productName ?? products.find((product) => product.id === right.productId)?.name ?? "";
        return leftName.localeCompare(rightName);
      })
      .map((item) => ({
        productId: item.productId,
        systemQty: Number(item.quantity),
        physicalQty: Number(item.quantity),
        unitCost: Number(item.averageCost),
        notes: "",
      }));
  }

  function loadWarehouseStock(warehouseId: string) {
    if (!warehouseId) {
      toast.error("Pilih gudang terlebih dulu.");
      return;
    }

    if (items.fields.length > 0 && form.formState.isDirty) {
      const confirmed = window.confirm(
        "Memuat ulang stok sistem akan mengganti daftar item opname yang sedang Anda isi. Lanjutkan?",
      );
      if (!confirmed) return;
    }

    const nextItems = buildWarehouseItems(warehouseId);
    form.setValue("items", nextItems, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (!nextItems.length) {
      toast.message("Belum ada saldo stok pada gudang ini.");
      return;
    }

    toast.success(`${nextItems.length} item stok sistem berhasil dimuat.`);
  }

  async function onSubmit(payload: StockTakeValues) {
    setSubmitting(true);
    const response = await fetch("/api/inventory/stock-takes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { id?: string; error?: string };

    if (!response.ok) {
      toast.error(result.error ?? "Gagal submit stock take.");
      setSubmitting(false);
      return;
    }

    toast.success("Stock take berhasil disubmit.");
    router.push(`/inventory/stock-takes/${result.id}`);
  }

  const errors = form.formState.errors as Partial<Record<keyof StockTakeValues, { message?: string }>>;

  return (
    <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-6">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="space-y-3">
              <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Inventory</div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Form Stock Take</h2>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Muat stok sistem, input stok fisik, lalu submit untuk approval dan pembentukan adjustment otomatis.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Dokumen stock take akan menghasilkan adjustment hanya setelah approval.
            </div>
          </div>
        </div>

        <SectionCard title="Informasi Umum" description="Tetapkan tanggal opname dan gudang yang akan diperiksa.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <InventoryFieldLabel htmlFor="stockDate" required>
                Tanggal Opname
              </InventoryFieldLabel>
              <Input id="stockDate" type="date" {...form.register("stockDate")} />
              <InventoryFieldError message={getErrorMessage(errors, "stockDate")} />
            </div>
            <div className="space-y-2">
              <InventoryFieldLabel htmlFor="warehouseId" required>
                Gudang
              </InventoryFieldLabel>
              <Select id="warehouseId" placeholder="Pilih gudang" {...form.register("warehouseId")}>
                {warehouses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
              <InventoryFieldError message={getErrorMessage(errors, "warehouseId")} />
            </div>
            <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/20 p-4">
              <div className="text-sm text-muted-foreground">
                Stock take disubmit dulu, lalu menunggu approval sebelum mengubah stok.
              </div>
              <Button
                className="w-full"
                onClick={() => loadWarehouseStock(selectedWarehouseId)}
                type="button"
                variant="outline"
              >
                Muat Stok Sistem
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Item Stock Take"
          description="Bandingkan stok sistem dengan stok fisik untuk setiap produk yang diopname."
        >
          <div className="space-y-4">
            {!items.fields.length ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
                Pilih gudang lalu klik <span className="font-medium text-foreground">Muat Stok Sistem</span> untuk menarik saldo sistem ke dokumen opname.
              </div>
            ) : null}
            {items.fields.map((field, index) => {
              const systemQty = Number(watched.items?.[index]?.systemQty || 0);
              const physicalQty = Number(watched.items?.[index]?.physicalQty || 0);
              const unitCost = Number(watched.items?.[index]?.unitCost || 0);
              const varianceQty = physicalQty - systemQty;
              const varianceValue = varianceQty * unitCost;

              return (
                <div key={field.id} className="space-y-4 rounded-2xl border border-border/80 bg-muted/15 p-4">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_140px_140px_140px_auto]">
                    <div className="space-y-2">
                      <InventoryFieldLabel required>Produk</InventoryFieldLabel>
                      <Select {...form.register(`items.${index}.productId`)} placeholder="Pilih produk">
                        {products.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <InventoryFieldLabel required>Stok Sistem</InventoryFieldLabel>
                      <Input
                        className="bg-muted/40 text-muted-foreground"
                        readOnly
                        step="0.01"
                        type="number"
                        {...form.register(`items.${index}.systemQty`)}
                      />
                      <InventoryFieldHint>Diambil dari saldo sistem dan tidak bisa diubah manual.</InventoryFieldHint>
                    </div>
                    <div className="space-y-2">
                      <InventoryFieldLabel required>Stok Fisik</InventoryFieldLabel>
                      <Input step="0.01" type="number" {...form.register(`items.${index}.physicalQty`)} />
                    </div>
                    <div className="space-y-2">
                      <InventoryFieldLabel required>Nilai Unit</InventoryFieldLabel>
                      <Input step="0.01" type="number" {...form.register(`items.${index}.unitCost`)} />
                    </div>
                    <div className="flex items-end xl:justify-end">
                      <Button type="button" variant="outline" onClick={() => items.remove(index)}>
                        Hapus
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <InventoryMetricCard
                      label="Selisih Qty"
                      value={formatNumber(varianceQty)}
                      helper="Stok Fisik - Stok Sistem"
                    />
                    <InventoryMetricCard
                      label="Nilai Variance"
                      value={formatCurrency(varianceValue)}
                      helper="Selisih Qty x Nilai Unit"
                    />
                    <div className="rounded-2xl border border-border/80 bg-card/80 p-4">
                      <InventoryFieldLabel>Catatan Item</InventoryFieldLabel>
                      <Textarea
                        className="mt-2 min-h-24"
                        placeholder="Catatan item opname jika diperlukan"
                        {...form.register(`items.${index}.notes`)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                items.append({
                  productId: "",
                  systemQty: 0,
                  physicalQty: 0,
                  unitCost: 0,
                  notes: "",
                })
              }
            >
              <PackagePlus className="size-4" />
              Tambah Item
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            <InventoryFieldLabel htmlFor="notes">Catatan Dokumen</InventoryFieldLabel>
            <Textarea
              id="notes"
              placeholder="Tambahkan catatan umum stock take atau hasil pemeriksaan lapangan."
              {...form.register("notes")}
            />
            <InventoryFieldHint>
              Catatan ini akan ikut tampil pada dokumen stock take untuk audit internal.
            </InventoryFieldHint>
          </div>
        </SectionCard>
      </div>

      <SummaryPanel
        title="Ringkasan Opname"
        items={[
          { label: "Jumlah Item", value: String(items.fields.length) },
          { label: "Nilai Variance", value: formatCurrency(variance) },
          { label: "Stok Gudang Termuat", value: String(availableWarehouseBalances.length) },
        ]}
        footer={
          <div className="space-y-3">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <Scale className="size-4 text-primary" />
                Alur approval
              </div>
              Stock take yang disubmit akan diverifikasi dulu sebelum sistem membentuk adjustment resmi.
            </div>
            <Button className="w-full" disabled={submitting} type="submit">
              <ClipboardCheck className="size-4" />
              {submitting ? "Mengirim..." : "Submit Stock Take"}
            </Button>
          </div>
        }
      />
    </form>
  );
}
