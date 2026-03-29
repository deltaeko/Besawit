"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { palmSaleSchema } from "@/lib/validation/palm";
import { PalmSaleFormSummary } from "@/modules/palm/sale-form-summary";

type SaleFormInput = z.input<typeof palmSaleSchema>;
type SaleValues = z.output<typeof palmSaleSchema>;
type DeductionRow = {
  configId?: string;
  type?: "trash" | "water" | "sand_mud" | "fronds" | "unripe" | "long_stalk" | "others";
  label: string;
  inputMode: "kg" | "percentage" | "nominal";
  inputValue: number;
  notes?: string;
};

type DeductionConfigOption = {
  id: string;
  code: string;
  name: string;
  legacyType: string | null;
  defaultInputMode: "kg" | "percentage" | "nominal";
  description?: string | null;
};

type FactoryDeductionDefault = {
  deductionConfigId: string;
  inputMode: "kg" | "percentage" | "nominal";
  defaultValue: string;
  sortOrder: number;
  configCode?: string;
  configName?: string;
  legacyType?: string | null;
  defaultInputMode?: "kg" | "percentage" | "nominal";
};

function formatWeight(value: number) {
  return `${formatNumber(value, 2)} kg`;
}

function buildDeductionRows(
  configs: DeductionConfigOption[],
  defaults: FactoryDeductionDefault[] = [],
  currentRows: DeductionRow[] = [],
) {
  const defaultMap = new Map(defaults.map((item) => [item.deductionConfigId, item]));
  const currentMap = new Map(
    currentRows
      .filter((item) => item?.configId)
      .map((item) => [item.configId as string, item]),
  );

  const orderedConfigs = [...configs].sort((left, right) => {
    const leftOrder = defaultMap.get(left.id)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = defaultMap.get(right.id)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.name.localeCompare(right.name);
  });

  return orderedConfigs.map((config) => {
    const factoryDefault = defaultMap.get(config.id);
    const current = currentMap.get(config.id);

    return {
      configId: config.id,
      type: (current?.type ?? config.legacyType ?? "others") as DeductionRow["type"],
      label: config.name,
      inputMode: current?.inputMode ?? factoryDefault?.inputMode ?? config.defaultInputMode,
      inputValue: Number(current?.inputValue ?? factoryDefault?.defaultValue ?? 0),
      notes: current?.notes ?? "",
    };
  });
}

export function PalmSaleForm({
  factories,
  warehouses,
  tbsPoolBalances,
  deductionConfigs,
  factoryDefaults,
}: {
  factories: Array<{ id: string; name: string }>;
  warehouses: Array<{ id: string; name: string }>;
  tbsPoolBalances: Array<{
    warehouseId: string;
    warehouseName: string;
    quantity: number;
    averageCost: number;
    unit: string;
  }>;
  deductionConfigs: DeductionConfigOption[];
  factoryDefaults: Record<string, FactoryDeductionDefault[]>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const defaultDueDate = useMemo(() => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().slice(0, 10);
  }, []);
  const form = useForm<SaleFormInput, unknown, SaleValues>({
    resolver: zodResolver(palmSaleSchema),
    defaultValues: {
      saleDate: new Date().toISOString().slice(0, 10),
      dueDate: defaultDueDate,
      warehouseId: "",
      factoryId: "",
      grossWeight: 0,
      tareWeight: 0,
      sellingPricePerKg: 0,
      deductions: buildDeductionRows(deductionConfigs) as SaleFormInput["deductions"],
      returnData: {
        returnWeight: 0,
        returnReason: "",
        actionType: "disposed",
        notes: "",
      },
      notes: "",
    },
  });

  const values = useWatch({ control: form.control });
  const deductionRows = ((values.deductions ?? []) as DeductionRow[]).map((item) => ({
    configId: item.configId,
    type: item.type,
    label: item.label ?? "Potongan",
    inputMode: item.inputMode ?? "kg",
    inputValue: Number(item.inputValue ?? 0),
    notes: item.notes ?? "",
  }));
  const selectedFactoryId = values.factoryId ?? "";
  const selectedWarehouseId = values.warehouseId ?? "";

  useEffect(() => {
    form.setValue(
      "deductions",
      buildDeductionRows(
        deductionConfigs,
        factoryDefaults[selectedFactoryId] ?? [],
        (form.getValues("deductions") ?? []) as DeductionRow[],
      ),
      { shouldDirty: false },
    );
  }, [deductionConfigs, factoryDefaults, form, selectedFactoryId]);

  const selectedWarehouse = warehouses.find((item) => item.id === selectedWarehouseId);
  const selectedTbsPoolBalance = tbsPoolBalances.find(
    (item) => item.warehouseId === selectedWarehouseId,
  );
  const returnData = values.returnData ?? {
    returnWeight: 0,
    returnReason: "",
    actionType: "disposed",
    notes: "",
  };

  const summary = useMemo(() => {
    const netInitial = Math.max(Number(values.grossWeight) - Number(values.tareWeight), 0);
    const breakdown = deductionRows.map((item) => {
      const inputValue = Number(item.inputValue || 0);
      const deductionWeight =
        item.inputMode === "kg"
          ? inputValue
          : item.inputMode === "percentage"
            ? (netInitial * inputValue) / 100
            : 0;
      const deductionAmount = item.inputMode === "nominal" ? inputValue : 0;

      return {
        ...item,
        deductionWeight,
        deductionAmount,
      };
    });

    const totalDeductionWeight = breakdown.reduce((sum, item) => sum + item.deductionWeight, 0);
    const totalDeductionAmount = breakdown.reduce((sum, item) => sum + item.deductionAmount, 0);
    const netAfterDeduction = Math.max(netInitial - totalDeductionWeight, 0);
    const netFinal = Math.max(netAfterDeduction - Number(returnData.returnWeight || 0), 0);
    const grossSalesAmount = netFinal * Number(values.sellingPricePerKg || 0);
    const totalSales = Math.max(grossSalesAmount - totalDeductionAmount, 0);
    const estimatedCost = netFinal * Number(selectedTbsPoolBalance?.averageCost ?? 0);
    const margin = totalSales - estimatedCost;

    return {
      breakdown,
      netInitial,
      totalDeductionWeight,
      totalDeductionAmount,
      netFinal,
      grossSalesAmount,
      totalSales,
      estimatedCost,
      margin,
    };
  }, [
    deductionRows,
    returnData.returnWeight,
    selectedTbsPoolBalance?.averageCost,
    values.grossWeight,
    values.tareWeight,
    values.sellingPricePerKg,
  ]);

  async function onSubmit(payload: SaleValues) {
    setSubmitting(true);

    const response = await fetch("/api/palm/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as { id?: string; error?: string };

    if (!response.ok) {
      toast.error(result.error ?? "Gagal menyimpan penjualan TBS.");
      setSubmitting(false);
      return;
    }

    toast.success("Penjualan TBS tersimpan.");
    router.push(`/palm/sales/${result.id}`);
    router.refresh();
  }

  return (
    <form className="grid gap-6 xl:grid-cols-[1.45fr_0.7fr]" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-6">
        <SectionCard title="Informasi Penjualan">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input type="date" {...form.register("saleDate")} />
            </div>
            <div className="space-y-2">
              <Label>Jatuh Tempo Piutang</Label>
              <Input type="date" {...form.register("dueDate")} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Gudang Asal</Label>
              <Select {...form.register("warehouseId")}>
                <option value="">Pilih gudang asal</option>
                {warehouses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
              <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Saldo TBS gudang</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {selectedWarehouseId
                      ? formatWeight(Number(selectedTbsPoolBalance?.quantity ?? 0))
                      : "-"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {selectedWarehouse
                    ? `Pool stok sawit campuran di ${selectedWarehouse.name}.`
                    : "Pilih gudang asal untuk melihat saldo pool TBS."}
                </div>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Pabrik</Label>
              <Select {...form.register("factoryId")}>
                <option value="">Pilih pabrik</option>
                {factories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Berat & Harga">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Berat Kotor</Label>
              <Input step="0.01" type="number" {...form.register("grossWeight")} />
            </div>
            <div className="space-y-2">
              <Label>Berat Tara</Label>
              <Input step="0.01" type="number" {...form.register("tareWeight")} />
            </div>
            <div className="space-y-2">
              <Label>Harga Jual / Kg</Label>
              <Input step="0.01" type="number" {...form.register("sellingPricePerKg")} />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Potongan & Grading Pabrik"
          description="Jenis potongan diambil dari konfigurasi master dan bisa berbeda default-nya per pabrik."
        >
          <div className="space-y-4">
            {deductionRows.map((deduction, index) => {
              const breakdown = summary.breakdown[index];

              return (
                <div key={deduction.configId || deduction.label || index} className="rounded-2xl border p-4">
                  <input type="hidden" {...form.register(`deductions.${index}.configId`)} />
                  <input type="hidden" {...form.register(`deductions.${index}.label`)} />
                  <input type="hidden" {...form.register(`deductions.${index}.type`)} />
                  <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_0.8fr] xl:grid-cols-[1.2fr_0.7fr_0.7fr_1fr]">
                    <div className="space-y-2">
                      <Label>{deduction.label}</Label>
                      <Input
                        readOnly
                        value={deduction.label}
                        className="bg-muted/30"
                      />
                      {deductionConfigs.find((item) => item.id === deduction.configId)?.description ? (
                        <p className="text-xs text-muted-foreground">
                          {deductionConfigs.find((item) => item.id === deduction.configId)?.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label>Mode Input</Label>
                      <Select {...form.register(`deductions.${index}.inputMode`)}>
                        <option value="kg">Kg</option>
                        <option value="percentage">Persen</option>
                        <option value="nominal">Nominal</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        {deduction.inputMode === "percentage"
                          ? "Nilai (%)"
                          : deduction.inputMode === "nominal"
                            ? "Nilai (Rp)"
                            : "Nilai (Kg)"}
                      </Label>
                      <Input
                        step="0.01"
                        type="number"
                        {...form.register(`deductions.${index}.inputValue`)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Dampak Perhitungan</Label>
                      <div className="rounded-lg border bg-muted/25 px-3 py-2 text-sm">
                        <div className="font-medium">
                          {formatWeight(Number(breakdown?.deductionWeight ?? 0))}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Potongan nominal {formatCurrency(Number(breakdown?.deductionAmount ?? 0))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label>Catatan</Label>
                    <Input {...form.register(`deductions.${index}.notes`)} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Retur & Catatan">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Berat Retur</Label>
              <Input step="0.01" type="number" {...form.register("returnData.returnWeight")} />
            </div>
            <div className="space-y-2">
              <Label>Tindakan</Label>
              <Select {...form.register("returnData.actionType")}>
                <option value="disposed">Dimusnahkan</option>
                <option value="resold">Dijual Ulang</option>
                <option value="returned_to_farmer">Dikembalikan ke Petani</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Alasan Retur</Label>
              <Input {...form.register("returnData.returnReason")} />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label>Catatan Transaksi</Label>
            <Textarea {...form.register("notes")} />
          </div>
        </SectionCard>
      </div>

      <PalmSaleFormSummary
        averageCostLabel={formatCurrency(Number(selectedTbsPoolBalance?.averageCost ?? 0))}
        deductionNominalLabel={formatCurrency(summary.totalDeductionAmount)}
        deductionWeightLabel={formatWeight(summary.totalDeductionWeight)}
        dueDateLabel={values.dueDate || "-"}
        estimatedCostLabel={formatCurrency(summary.estimatedCost)}
        grossSalesLabel={formatCurrency(summary.grossSalesAmount)}
        marginLabel={formatCurrency(summary.margin)}
        netFinalLabel={formatWeight(summary.netFinal)}
        netInitialLabel={formatWeight(summary.netInitial)}
        stockBalanceLabel={
          selectedWarehouseId ? formatWeight(Number(selectedTbsPoolBalance?.quantity ?? 0)) : "-"
        }
        submitting={submitting}
        totalSalesLabel={formatCurrency(summary.totalSales)}
      />
    </form>
  );
}
