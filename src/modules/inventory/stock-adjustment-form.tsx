"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightLeft, ClipboardList, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { SectionCard } from "@/components/shared/section-card";
import { SummaryPanel } from "@/components/shared/summary-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { stockAdjustmentSchema } from "@/lib/validation/inventory";
import {
  InventoryFieldError,
  InventoryFieldLabel,
  InventoryMetricCard,
} from "@/modules/inventory/inventory-form-primitives";

type StockAdjustmentFormInput = z.input<typeof stockAdjustmentSchema>;
type StockAdjustmentValues = z.output<typeof stockAdjustmentSchema>;

export function StockAdjustmentForm({
  warehouses,
  products,
  balances,
  reasons,
}: {
  warehouses: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string; unit?: string }>;
  balances: Array<{ warehouseId: string; productId: string; quantity: number }>;
  reasons: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const form = useForm<StockAdjustmentFormInput, unknown, StockAdjustmentValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      adjustmentDate: new Date().toISOString().slice(0, 10),
      warehouseId: "",
      targetWarehouseId: "",
      productId: "",
      mode: "adjustment_out",
      reason: "correction",
      quantity: 0,
      unitCost: 0,
      notes: "",
    },
  });

  const [
    mode = "adjustment_out",
    productId = "",
    quantity = 0,
    unitCost = 0,
    reason = "correction",
    warehouseId = "",
    targetWarehouseId = "",
  ] =
    useWatch({
      control: form.control,
      name: ["mode", "productId", "quantity", "unitCost", "reason", "warehouseId", "targetWarehouseId"],
    });

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === productId) ?? null,
    [productId, products],
  );

  const productOptions = useMemo(
    () =>
      products.map((item) => ({
        id: item.id,
        label: item.name,
        unit: item.unit,
      })),
    [products],
  );

  const displayedProductQuery =
    showProductDropdown || !productId ? productQuery : selectedProduct?.name ?? "";

  const selectedBalance = useMemo(() => {
    if (!warehouseId || !productId) return null;
    return (
      balances.find(
        (item) => item.warehouseId === warehouseId && item.productId === productId,
      ) ?? null
    );
  }, [balances, warehouseId, productId]);

  const targetBalance = useMemo(() => {
    if (mode !== "transfer" || !targetWarehouseId || !productId) return null;
    return (
      balances.find(
        (item) => item.warehouseId === targetWarehouseId && item.productId === productId,
      ) ?? null
    );
  }, [balances, mode, productId, targetWarehouseId]);

  const beforeQty = Number(selectedBalance?.quantity ?? 0);
  const isOpeningBalance = mode === "opening_balance";
  const signedQty =
    mode === "opening_balance"
      ? Number(quantity || 0)
      : mode === "adjustment_in"
        ? Number(quantity || 0)
        : mode === "adjustment_out"
          ? -Number(quantity || 0)
          : -Number(quantity || 0);
  const afterQty = isOpeningBalance ? Number(quantity || 0) : beforeQty + signedQty;
  const targetAfterQty =
    mode === "transfer" ? Number(targetBalance?.quantity ?? 0) + Number(quantity || 0) : null;

  const totalValue = Number(quantity || 0) * Number(unitCost || 0);
  const errors = form.formState.errors;

  async function onSubmit(payload: StockAdjustmentValues) {
    setSubmitting(true);
    const response = await fetch("/api/inventory/adjustments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { id?: string; error?: string };

    if (!response.ok) {
      toast.error(result.error ?? "Gagal menyimpan mutasi stok.");
      setSubmitting(false);
      return;
    }

    toast.success(
      payload.mode === "opening_balance"
        ? "Opening balance berhasil dicatat."
        : "Adjustment berhasil disimpan dan menunggu approval.",
    );
    router.refresh();
    form.reset({
      adjustmentDate: new Date().toISOString().slice(0, 10),
      warehouseId: "",
      targetWarehouseId: "",
      productId: "",
      mode: "adjustment_out",
      reason: "correction",
      quantity: 0,
      unitCost: 0,
      notes: "",
    });
    setProductQuery("");
    setShowProductDropdown(false);
    setSubmitting(false);
  }

  return (
    <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-6">
        <SectionCard
          title="Form Mutasi & Adjustment"
          description="Catat koreksi, stok rusak, hilang, transfer, dan mutasi operasional lainnya dengan alasan yang jelas."
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <InventoryFieldLabel htmlFor="adjustmentDate" required>
                  Tanggal
                </InventoryFieldLabel>
                <Input id="adjustmentDate" type="date" {...form.register("adjustmentDate")} />
                <InventoryFieldError message={errors.adjustmentDate?.message} />
              </div>
              <div className="space-y-2">
                <InventoryFieldLabel htmlFor="mode" required>
                  Jenis Mutasi
                </InventoryFieldLabel>
                <Select id="mode" {...form.register("mode")}>
                  <option value="opening_balance">Opening Balance</option>
                  <option value="adjustment_in">Adjustment Masuk</option>
                  <option value="adjustment_out">Adjustment Keluar</option>
                  <option value="transfer">Transfer Gudang</option>
                </Select>
                <InventoryFieldError message={errors.mode?.message} />
              </div>
              <div className="space-y-2">
                <InventoryFieldLabel htmlFor="warehouseId" required>
                  {mode === "transfer" ? "Gudang Asal" : "Gudang"}
                </InventoryFieldLabel>
                <Select id="warehouseId" placeholder="Pilih gudang asal" {...form.register("warehouseId")}>
                  {warehouses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
                <InventoryFieldError message={errors.warehouseId?.message} />
              </div>
              {mode === "transfer" ? (
                <div className="space-y-2">
                  <InventoryFieldLabel htmlFor="targetWarehouseId" required>
                    Gudang Tujuan
                  </InventoryFieldLabel>
                  <Select
                    id="targetWarehouseId"
                    placeholder="Pilih gudang tujuan"
                    {...form.register("targetWarehouseId")}
                  >
                    {warehouses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                  <InventoryFieldError message={errors.targetWarehouseId?.message} />
                </div>
              ) : null}
              <div className="space-y-2 md:col-span-2">
                <InventoryFieldLabel htmlFor="productId" required>
                  Produk
                </InventoryFieldLabel>
                <div className="relative">
                  <Input
                    id="productId"
                    placeholder="Cari produk"
                    value={displayedProductQuery}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setProductQuery(nextValue);
                      setShowProductDropdown(true);
                      if (!nextValue) {
                        form.setValue("productId", "", { shouldDirty: true, shouldValidate: true });
                      }
                    }}
                    onFocus={() => {
                      setProductQuery(selectedProduct?.name ?? "");
                      setShowProductDropdown(true);
                    }}
                    onBlur={() => window.setTimeout(() => setShowProductDropdown(false), 120)}
                  />
                  <input type="hidden" {...form.register("productId")} />
                  {showProductDropdown ? (
                    <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-border/80 bg-card p-2 shadow-lg">
                      {productOptions.filter((option) =>
                        option.label.toLowerCase().includes(productQuery.toLowerCase()),
                      ).length ? (
                        productOptions
                          .filter((option) =>
                            option.label.toLowerCase().includes(productQuery.toLowerCase()),
                          )
                          .map((option) => (
                            <button
                              className={cn(
                                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-muted/40",
                                option.id === productId && "bg-muted/50 font-medium",
                              )}
                              key={option.id}
                              onClick={() => {
                                form.setValue("productId", option.id, { shouldDirty: true, shouldValidate: true });
                                setProductQuery(option.label);
                                setShowProductDropdown(false);
                              }}
                              type="button"
                            >
                              <span>{option.label}</span>
                              {option.id === productId ? (
                                <span className="text-xs text-muted-foreground">Terpilih</span>
                              ) : null}
                            </button>
                          ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Produk tidak ditemukan.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
                <InventoryFieldError message={errors.productId?.message} />
              </div>
              <div className="space-y-2">
                <InventoryFieldLabel htmlFor="quantity" required>
                  {isOpeningBalance ? "Qty Saldo Awal" : "Qty"}
                </InventoryFieldLabel>
                <Input id="quantity" step="0.01" type="number" {...form.register("quantity")} />
                <InventoryFieldError message={errors.quantity?.message} />
              </div>
              <div className="space-y-2">
                <InventoryFieldLabel htmlFor="unitCost" required>
                  Nilai Per Unit
                </InventoryFieldLabel>
                <Input id="unitCost" step="0.01" type="number" {...form.register("unitCost")} />
                <InventoryFieldError message={errors.unitCost?.message} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <InventoryFieldLabel htmlFor="reason" required>
                  Alasan Mutasi
                </InventoryFieldLabel>
                <Select id="reason" {...form.register("reason")}>
                  {reasons.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
                <InventoryFieldError message={errors.reason?.message} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <InventoryFieldLabel htmlFor="notes">Catatan</InventoryFieldLabel>
                <Textarea
                  id="notes"
                  placeholder="Jelaskan detail koreksi, kerusakan, kehilangan, transfer, atau catatan audit lainnya."
                  {...form.register("notes")}
                />
                <InventoryFieldError message={errors.notes?.message} />
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <ClipboardList className="size-4 text-primary" />
                Dampak mutasi
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {isOpeningBalance
                  ? "Opening balance hanya dipakai untuk saldo awal produk yang belum memiliki histori stok di gudang tersebut."
                  : "Setiap adjustment akan menghasilkan histori stok dengan saldo sebelum dan sesudah. Transfer gudang akan mencatat mutasi keluar dan masuk."}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SummaryPanel
        title="Ringkasan Mutasi"
        items={[
          {
            label: "Jenis",
            value:
              mode === "opening_balance"
                ? "Opening Balance"
                : mode === "transfer"
                  ? "Transfer Gudang"
                  : mode === "adjustment_in"
                    ? "Adjustment Masuk"
                    : "Adjustment Keluar",
          },
          { label: "Produk", value: selectedProduct?.name ?? "-" },
          { label: "Satuan", value: selectedProduct?.unit ?? "-" },
          { label: "Alasan", value: reasons.find((item) => item.value === reason)?.label ?? "-" },
          { label: "Qty", value: String(quantity || 0) },
          { label: "Nilai Mutasi", value: formatCurrency(totalValue) },
          { label: isOpeningBalance ? "Saldo Sistem" : "Saldo Awal", value: formatNumber(beforeQty) },
          { label: isOpeningBalance ? "Saldo Awal Dibentuk" : "Saldo Setelah", value: formatNumber(afterQty) },
          ...(mode === "transfer"
            ? [
                { label: "Saldo Tujuan Awal", value: formatNumber(targetBalance?.quantity ?? 0) },
                { label: "Saldo Tujuan Setelah", value: formatNumber(targetAfterQty ?? 0) },
              ]
            : []),
        ]}
        footer={
          <div className="space-y-3">
            <div className="grid gap-3">
              <InventoryMetricCard label="Produk" value={selectedProduct?.name ?? "-"} />
              <InventoryMetricCard
                emphasis
                label={isOpeningBalance ? "Nilai Saldo Awal" : "Nilai Mutasi"}
                value={formatCurrency(totalValue)}
                helper="Qty x Nilai Per Unit"
              />
              {mode === "transfer" ? (
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                  <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                    <ArrowRightLeft className="size-4 text-primary" />
                    Transfer antar gudang
                  </div>
                  Setelah di-approve, sistem akan mencatat stok keluar dari gudang asal dan stok masuk ke gudang tujuan.
                </div>
              ) : !isOpeningBalance ? (
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                  Adjustment manual akan menunggu approval sebelum memengaruhi saldo stok.
                </div>
              ) : null}
            </div>
            <Button className="w-full" disabled={submitting} type="submit">
              <Wallet className="size-4" />
              {submitting
                ? "Menyimpan..."
                : isOpeningBalance
                  ? "Simpan Saldo Awal"
                  : "Submit Adjustment"}
            </Button>
          </div>
        }
      />
    </form>
  );
}
