"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Calculator, ChevronDown, Info, Scale, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { palmPurchaseSchema } from "@/lib/validation/palm";
import {
  PalmPurchaseFormActions,
  type PalmPurchaseSubmitIntent,
} from "@/modules/palm/purchase-form-actions";
import { PalmPurchaseFormSummary } from "@/modules/palm/purchase-form-summary";
import {
  formatPalmStatusLabel,
  resolvePalmStatusBadgeVariant,
} from "@/modules/palm/status-utils";

type PurchaseFormInput = z.input<typeof palmPurchaseSchema>;
type PurchaseValues = z.output<typeof palmPurchaseSchema>;

type NamedOption = {
  id: string;
  name: string;
};

type VehicleOption = {
  id: string;
  plateNumber: string;
  type?: string | null;
};

type PaymentSnapshot = {
  payableId?: string | null;
  payableCode?: string | null;
  paymentStatus?: string | null;
  paidAmount?: number;
  outstandingAmount?: number;
};

type FarmerStoreDebtSummary = {
  farmerId: string;
  receivableCount: number;
  totalOutstanding: number;
  nearestDueDate?: Date | string | null;
};

type SearchOption = {
  id: string;
  label: string;
};

function FieldLabel({
  children,
  required = false,
  htmlFor,
}: {
  children: string;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <Label className="flex items-center gap-1.5" htmlFor={htmlFor}>
      <span>{children}</span>
      {required ? <span className="text-destructive">*</span> : null}
    </Label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function FieldHint({ children }: { children: string }) {
  return <p className="text-xs leading-5 text-muted-foreground">{children}</p>;
}

function InfoBlock({
  label,
  value,
  helper,
  emphasis = false,
}: {
  label: string;
  value: string;
  helper?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-muted/25 p-4",
        emphasis && "border-primary/20 bg-primary/10",
      )}
    >
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-2 font-semibold tracking-tight text-foreground",
          emphasis ? "text-2xl" : "text-base",
        )}
      >
        {value}
      </div>
      {helper ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function getErrorMessage(
  errors: Partial<Record<keyof PurchaseValues, { message?: string }>>,
  name: keyof PurchaseValues,
) {
  return errors[name]?.message ?? "";
}

export function PalmPurchaseForm({
  mode,
  purchaseId,
  transactionCode,
  transactionStatus,
  farmers,
  driverOptions,
  vehicles,
  warehouses,
  farmerStoreDebtMap,
  initialValues,
  paymentSnapshot,
}: {
  mode: "create" | "edit";
  purchaseId?: string;
  transactionCode?: string | null;
  transactionStatus?: string | null;
  farmers: NamedOption[];
  driverOptions: NamedOption[];
  vehicles: VehicleOption[];
  warehouses: NamedOption[];
  farmerStoreDebtMap: Record<string, FarmerStoreDebtSummary>;
  initialValues?: Partial<PurchaseFormInput>;
  paymentSnapshot?: PaymentSnapshot | null;
}) {
  const router = useRouter();
  const [submitIntent, setSubmitIntent] = useState<PalmPurchaseSubmitIntent>("save");
  const [submitting, setSubmitting] = useState(false);
  const [showStoreDebtSection, setShowStoreDebtSection] = useState(false);
  const [farmerQuery, setFarmerQuery] = useState("");
  const [showFarmerDropdown, setShowFarmerDropdown] = useState(false);
  const formId = "palm-purchase-form";

  const form = useForm<PurchaseFormInput, unknown, PurchaseValues>({
    resolver: zodResolver(palmPurchaseSchema),
    defaultValues: {
      purchaseDate: initialValues?.purchaseDate ?? new Date().toISOString().slice(0, 10),
      farmerId: initialValues?.farmerId ?? "",
      driverId: initialValues?.driverId ?? "",
      vehicleId: initialValues?.vehicleId ?? "",
      warehouseId: initialValues?.warehouseId ?? "",
      grossWeight: initialValues?.grossWeight ?? 0,
      tareWeight: initialValues?.tareWeight ?? 0,
      buyingPricePerKg: initialValues?.buyingPricePerKg ?? 0,
      transportCost: initialValues?.transportCost ?? 0,
      loadingCost: initialValues?.loadingCost ?? 0,
      otherCost: initialValues?.otherCost ?? 0,
      storeDebtDeductionMode: initialValues?.storeDebtDeductionMode ?? "none",
      storeDebtDeductionValue: initialValues?.storeDebtDeductionValue ?? 0,
      storeDebtDeductionPercent: initialValues?.storeDebtDeductionPercent ?? 0,
      storeDebtDeductionNotes: initialValues?.storeDebtDeductionNotes ?? "",
      notes: initialValues?.notes ?? "",
    },
  });

  const [
    farmerId = "",
    grossWeight = 0,
    tareWeight = 0,
    buyingPricePerKg = 0,
    transportCost = 0,
    loadingCost = 0,
    otherCost = 0,
    storeDebtDeductionMode = "none",
    storeDebtDeductionValue = 0,
    storeDebtDeductionPercent = 0,
  ] = useWatch({
    control: form.control,
    name: [
      "farmerId",
      "grossWeight",
      "tareWeight",
      "buyingPricePerKg",
      "transportCost",
      "loadingCost",
      "otherCost",
      "storeDebtDeductionMode",
      "storeDebtDeductionValue",
      "storeDebtDeductionPercent",
    ],
  });

  const farmerOptions = useMemo<SearchOption[]>(
    () => farmers.map((item) => ({ id: item.id, label: item.name })),
    [farmers],
  );

  useEffect(() => {
    const selected = farmerOptions.find((item) => item.id === farmerId);
    if (selected) {
      setFarmerQuery(selected.label);
      return;
    }
    if (!farmerId) {
      setFarmerQuery("");
    }
  }, [farmerId, farmerOptions]);

  const calculations = useMemo(() => {
    const storeDebtSummary = farmerStoreDebtMap[farmerId] ?? {
      farmerId,
      receivableCount: 0,
      totalOutstanding: 0,
      nearestDueDate: null,
    };
    const normalizedGross = Number(grossWeight || 0);
    const normalizedTare = Number(tareWeight || 0);
    const normalizedPrice = Number(buyingPricePerKg || 0);
    const operationalCost =
      Number(transportCost || 0) +
      Number(loadingCost || 0) +
      Number(otherCost || 0);
    const netWeight = Math.max(normalizedGross - normalizedTare, 0);
    const totalPurchase = netWeight * normalizedPrice;
    const requestedStoreDebtDeduction =
      storeDebtDeductionMode === "percentage"
        ? (totalPurchase * Number(storeDebtDeductionPercent || 0)) / 100
        : Number(storeDebtDeductionValue || 0);
    const deductionAmount =
      storeDebtDeductionMode === "none"
        ? 0
        : Math.min(
            Math.max(requestedStoreDebtDeduction, 0),
            Number(storeDebtSummary.totalOutstanding || 0),
            totalPurchase,
          );
    const totalFinal = totalPurchase - deductionAmount;
    const paidAmount = Number(paymentSnapshot?.paidAmount ?? 0);
    const outstandingAmount = Math.max(totalFinal - paidAmount, 0);
    const paymentStatus =
      totalFinal <= 0 ? "paid" : paidAmount <= 0 ? "unpaid" : paidAmount >= totalFinal ? "paid" : "partial";

    return {
      netWeight,
      totalPurchase,
      operationalCost,
      deductionAmount,
      requestedStoreDebtDeduction,
      totalFinal,
      paidAmount,
      outstandingAmount,
      storeDebtSummary,
      storeDebtOutstandingAfterOffset: Math.max(
        Number(storeDebtSummary.totalOutstanding || 0) - deductionAmount,
        0,
      ),
      paymentStatus,
      hasPaymentConflict: paidAmount > totalFinal,
    };
  }, [
    buyingPricePerKg,
    farmerId,
    farmerStoreDebtMap,
    grossWeight,
    loadingCost,
    otherCost,
    paymentSnapshot?.paidAmount,
    storeDebtDeductionMode,
    storeDebtDeductionPercent,
    storeDebtDeductionValue,
    tareWeight,
    transportCost,
  ]);

  const currentTransactionStatus =
    mode === "edit" ? transactionStatus || "active" : "draft";
  const effectivePaymentStatus = paymentSnapshot?.paymentStatus || calculations.paymentStatus;

  useEffect(() => {
    if (!form.formState.isDirty) return undefined;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form.formState.isDirty]);

  function confirmLeave() {
    if (!form.formState.isDirty) {
      return true;
    }

    return window.confirm("Perubahan belum disimpan. Keluar dari halaman ini?");
  }

  function handleCancel() {
    if (!confirmLeave()) return;

    if (mode === "edit" && purchaseId) {
      router.push(`/palm/purchases/${purchaseId}`);
      return;
    }

    router.push("/palm/purchases");
  }

  function handleFarmerSelect(option: SearchOption) {
    form.setValue("farmerId", option.id, { shouldDirty: true, shouldValidate: true });
    setFarmerQuery(option.label);
    setShowFarmerDropdown(false);
  }

  async function onSubmit(payload: PurchaseValues) {
    setSubmitting(true);

    const endpoint =
      mode === "edit" && purchaseId
        ? `/api/palm/purchases/${purchaseId}`
        : "/api/palm/purchases";

    const response = await fetch(endpoint, {
      method: mode === "edit" ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as { id?: string; error?: string };

    if (!response.ok) {
      toast.error(result.error ?? "Gagal menyimpan transaksi pembelian.");
      setSubmitting(false);
      return;
    }

    const nextId = result.id ?? purchaseId;

    toast.success(
      mode === "edit"
        ? "Perubahan transaksi pembelian tersimpan."
        : "Transaksi pembelian berhasil dibuat.",
    );

    if (submitIntent === "save_payment" && nextId) {
      router.push(`/finance/payments?sourceType=tbs_purchase&sourceId=${nextId}`);
      router.refresh();
      return;
    }

    if (nextId) {
      router.push(`/palm/purchases/${nextId}`);
      router.refresh();
      return;
    }

    setSubmitting(false);
  }

  const errors = form.formState.errors as Partial<
    Record<keyof PurchaseValues, { message?: string }>
  >;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start xl:gap-6">
          <div className="space-y-3">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
              Agen Sawit
            </div>
            <div>
              <h1 className="text-[1.65rem] font-semibold tracking-tight md:text-3xl">
                {mode === "create"
                  ? "Buat Transaksi Pembelian"
                  : "Ubah Transaksi Pembelian"}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {transactionCode ? (
                <div className="rounded-full border border-border/70 bg-muted/20 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {transactionCode}
                </div>
              ) : null}
              <Badge variant={resolvePalmStatusBadgeVariant(currentTransactionStatus)}>
                {mode === "create"
                  ? "Siap Disimpan"
                  : formatPalmStatusLabel(currentTransactionStatus)}
              </Badge>
              <Badge variant={resolvePalmStatusBadgeVariant(effectivePaymentStatus)}>
                {formatPalmStatusLabel(effectivePaymentStatus)}
              </Badge>
            </div>
          </div>

          <div className="xl:justify-self-end">
            <PalmPurchaseFormActions
              formId={formId}
              mode={mode}
              onCancel={handleCancel}
              onIntentChange={setSubmitIntent}
              submitting={submitting}
            />
          </div>
        </div>
      </div>

      <form
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
        id={formId}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="space-y-6">
          <SectionCard
            description="Tetapkan tanggal transaksi, petani, dan relasi operasional utama."
            title="Informasi Utama"
          >
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel htmlFor="purchaseDate" required>
                    Tanggal
                  </FieldLabel>
                  <Input id="purchaseDate" type="date" {...form.register("purchaseDate")} />
                  <FieldError message={getErrorMessage(errors, "purchaseDate")} />
                </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="farmerId" required>
                  Petani
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="farmerId"
                    placeholder="Cari petani"
                    value={farmerQuery}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setFarmerQuery(nextValue);
                      setShowFarmerDropdown(true);
                      if (!nextValue) {
                        form.setValue("farmerId", "", { shouldDirty: true, shouldValidate: true });
                      }
                    }}
                    onFocus={() => setShowFarmerDropdown(true)}
                    onBlur={() => {
                      window.setTimeout(() => setShowFarmerDropdown(false), 120);
                    }}
                  />
                  <input type="hidden" {...form.register("farmerId")} />
                  {showFarmerDropdown ? (
                    <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-border/80 bg-card p-2 shadow-lg">
                      {farmerOptions.filter((option) =>
                        option.label.toLowerCase().includes(farmerQuery.toLowerCase()),
                      ).length ? (
                        farmerOptions
                          .filter((option) =>
                            option.label.toLowerCase().includes(farmerQuery.toLowerCase()),
                          )
                          .map((option) => (
                            <button
                              className={cn(
                                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-muted/40",
                                option.id === farmerId && "bg-muted/50 font-medium",
                              )}
                              key={option.id}
                              onClick={() => handleFarmerSelect(option)}
                              type="button"
                            >
                              <span>{option.label}</span>
                              {option.id === farmerId ? (
                                <span className="text-xs text-muted-foreground">Terpilih</span>
                              ) : null}
                            </button>
                          ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Petani tidak ditemukan.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
                <FieldError message={getErrorMessage(errors, "farmerId")} />
              </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="driverId">Sopir</FieldLabel>
                  <Select
                    id="driverId"
                    placeholder="Pilih sopir"
                    {...form.register("driverId")}
                  >
                    {driverOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                  <FieldHint>Daftar sopir berasal dari master Personel Armada dengan peran Sopir.</FieldHint>
                  <FieldError message={getErrorMessage(errors, "driverId")} />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="vehicleId">Kendaraan</FieldLabel>
                  <Select
                    id="vehicleId"
                    placeholder="Pilih kendaraan"
                    {...form.register("vehicleId")}
                  >
                    {vehicles.map((item) => (
                      <option key={item.id} value={item.id}>
                        {[item.plateNumber, item.type].filter(Boolean).join(" / ")}
                      </option>
                    ))}
                  </Select>
                  <FieldError message={getErrorMessage(errors, "vehicleId")} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <FieldLabel htmlFor="warehouseId">Gudang</FieldLabel>
                  <Select
                    id="warehouseId"
                    placeholder="Pilih gudang"
                    {...form.register("warehouseId")}
                  >
                    {warehouses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                  <FieldError message={getErrorMessage(errors, "warehouseId")} />
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Ringkasan Petani
                </div>
                <div className="mt-3 grid gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {formatCurrency(calculations.storeDebtSummary.totalOutstanding)}
                    </div>
                    <div className="text-xs text-muted-foreground">Hutang toko aktif</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {calculations.storeDebtSummary.receivableCount}
                    </div>
                    <div className="text-xs text-muted-foreground">Jumlah piutang</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {formatDate(calculations.storeDebtSummary.nearestDueDate)}
                    </div>
                    <div className="text-xs text-muted-foreground">Jatuh tempo terdekat</div>
                  </div>
                </div>
              </div>

            </div>
          </SectionCard>

          <SectionCard
            description="Masukkan hasil timbang aktual. Berat bersih dihitung otomatis oleh sistem."
            title="Data Timbangan"
          >
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <FieldLabel htmlFor="grossWeight" required>
                    Berat Kotor
                  </FieldLabel>
                  <Input
                    id="grossWeight"
                    min="0"
                    step="0.01"
                    type="number"
                    {...form.register("grossWeight")}
                  />
                  <FieldError message={getErrorMessage(errors, "grossWeight")} />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="tareWeight" required>
                    Berat Tara
                  </FieldLabel>
                  <Input
                    id="tareWeight"
                    min="0"
                    step="0.01"
                    type="number"
                    {...form.register("tareWeight")}
                  />
                  <FieldError message={getErrorMessage(errors, "tareWeight")} />
                </div>
                <div className="space-y-2 xl:col-span-1">
                  <FieldLabel htmlFor="netWeight">Berat Bersih</FieldLabel>
                  <Input
                    id="netWeight"
                    readOnly
                    value={formatNumber(calculations.netWeight)}
                  />
                  <FieldHint>Berat Bersih = Berat Kotor - Berat Tara</FieldHint>
                </div>
              </div>
              <div className="rounded-3xl border border-border/80 bg-muted/25 p-5">
                <div className="flex items-start gap-3">
                  <Scale className="mt-1 size-5 text-primary" />
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground">
                      Verifikasi Timbangan
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Sistem akan menolak nilai yang tidak logis, termasuk berat tara yang
                      lebih besar dari berat kotor.
                    </p>
                    <div className="rounded-2xl border bg-card/90 p-4">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                        Berat Bersih Saat Ini
                      </div>
                      <div className="mt-2 text-2xl font-semibold tracking-tight">
                        {formatNumber(calculations.netWeight)} kg
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            description="Opsional. Potongan akan dialokasikan otomatis ke piutang toko tertua."
            title="Potong Hutang Toko Petani"
          >
            <button
              className="flex w-full items-center justify-between rounded-2xl border border-border/70 bg-muted/15 px-4 py-3 text-left"
              onClick={() => setShowStoreDebtSection((prev) => !prev)}
              type="button"
            >
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {formatCurrency(calculations.storeDebtSummary.totalOutstanding)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {calculations.storeDebtSummary.receivableCount} piutang aktif
                </div>
              </div>
              <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", showStoreDebtSection && "rotate-180")} />
            </button>

            {showStoreDebtSection ? (
              <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="space-y-2">
                      <FieldLabel htmlFor="storeDebtDeductionMode">
                        Mode Potongan
                      </FieldLabel>
                      <Select
                        id="storeDebtDeductionMode"
                        {...form.register("storeDebtDeductionMode")}
                      >
                        <option value="none">Tidak dipotong</option>
                        <option value="value">Nominal</option>
                        <option value="percentage">Persen</option>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel htmlFor="storeDebtDeductionValue">
                        Nominal Potongan
                      </FieldLabel>
                      <Input
                        id="storeDebtDeductionValue"
                        min="0"
                        step="0.01"
                        type="number"
                        {...form.register("storeDebtDeductionValue")}
                        disabled={storeDebtDeductionMode !== "value"}
                      />
                      <FieldError message={getErrorMessage(errors, "storeDebtDeductionValue")} />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel htmlFor="storeDebtDeductionPercent">
                        Persen Potongan
                      </FieldLabel>
                      <Input
                        id="storeDebtDeductionPercent"
                        min="0"
                        max="100"
                        step="0.01"
                        type="number"
                        {...form.register("storeDebtDeductionPercent")}
                        disabled={storeDebtDeductionMode !== "percentage"}
                      />
                      <FieldError message={getErrorMessage(errors, "storeDebtDeductionPercent")} />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <FieldLabel htmlFor="storeDebtDeductionNotes">
                        Catatan Potongan
                      </FieldLabel>
                      <Textarea
                        id="storeDebtDeductionNotes"
                        placeholder="Contoh: potong untuk pupuk dan pestisida bulan berjalan."
                        {...form.register("storeDebtDeductionNotes")}
                      />
                      <FieldError message={getErrorMessage(errors, "storeDebtDeductionNotes")} />
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground">
                      <div className="font-medium text-foreground">
                        Status hutang toko petani
                      </div>
                      <p className="mt-2 leading-6">
                        {calculations.storeDebtSummary.receivableCount > 0
                          ? `Terdapat ${calculations.storeDebtSummary.receivableCount} piutang toko aktif yang akan dipotong secara FIFO, dimulai dari piutang tertua.`
                          : "Belum ada piutang toko aktif yang terhubung ke petani ini. Hubungkan pelanggan toko ke master petani agar potongan bisa digunakan."}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            form.setValue("storeDebtDeductionMode", "value", { shouldDirty: true });
                            form.setValue(
                              "storeDebtDeductionValue",
                              calculations.storeDebtSummary.totalOutstanding,
                              { shouldDirty: true },
                            );
                            form.setValue("storeDebtDeductionPercent", 0, { shouldDirty: true });
                          }}
                        >
                          Potong Penuh
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            form.setValue("storeDebtDeductionMode", "percentage", {
                              shouldDirty: true,
                            });
                            form.setValue("storeDebtDeductionPercent", 25, { shouldDirty: true });
                            form.setValue("storeDebtDeductionValue", 0, { shouldDirty: true });
                          }}
                        >
                          Potong 25%
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            form.setValue("storeDebtDeductionMode", "percentage", {
                              shouldDirty: true,
                            });
                            form.setValue("storeDebtDeductionPercent", 50, { shouldDirty: true });
                            form.setValue("storeDebtDeductionValue", 0, { shouldDirty: true });
                          }}
                        >
                          Potong 50%
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            form.setValue("storeDebtDeductionMode", "none", { shouldDirty: true });
                            form.setValue("storeDebtDeductionValue", 0, { shouldDirty: true });
                            form.setValue("storeDebtDeductionPercent", 0, { shouldDirty: true });
                          }}
                        >
                          Reset Potongan
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-border/80 bg-muted/25 p-5">
                  <div className="flex items-start gap-3">
                    <Wallet className="mt-1 size-5 text-primary" />
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          Ringkasan Potongan
                        </div>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          Sistem membatasi potongan agar tidak melebihi piutang toko aktif atau nilai pembelian TBS.
                        </p>
                      </div>
                      <div className="grid gap-3">
                        <InfoBlock
                          label="Outstanding Hutang Toko"
                          value={formatCurrency(calculations.storeDebtSummary.totalOutstanding)}
                          helper={`${calculations.storeDebtSummary.receivableCount} piutang aktif`}
                        />
                        <InfoBlock
                          label="Potongan Diminta"
                          value={formatCurrency(calculations.requestedStoreDebtDeduction)}
                          helper={
                            storeDebtDeductionMode === "percentage"
                              ? `${formatNumber(Number(storeDebtDeductionPercent || 0))}% x total pembelian`
                              : "Nilai input user sebelum dibatasi sistem"
                          }
                        />
                        <InfoBlock
                          emphasis
                          label="Potongan Diterapkan"
                          value={formatCurrency(calculations.deductionAmount)}
                          helper="Akan mengurangi hutang pembelian petani"
                        />
                        <InfoBlock
                          label="Sisa Hutang Toko"
                          value={formatCurrency(calculations.storeDebtOutstandingAfterOffset)}
                          helper="Sisa piutang toko setelah potong hasil"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            description="Harga pembelian dan biaya operasional dihitung otomatis agar admin tidak perlu menghitung manual."
            title="Harga & Perhitungan"
          >
            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel htmlFor="buyingPricePerKg" required>
                    Harga Beli / Kg
                  </FieldLabel>
                  <Input
                    id="buyingPricePerKg"
                    min="0"
                    step="0.01"
                    type="number"
                    {...form.register("buyingPricePerKg")}
                  />
                  <FieldError message={getErrorMessage(errors, "buyingPricePerKg")} />
                  <FieldHint>Masukkan harga beli TBS per kilogram.</FieldHint>
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="transportCost">Biaya Angkut</FieldLabel>
                  <Input
                    id="transportCost"
                    min="0"
                    step="0.01"
                    type="number"
                    {...form.register("transportCost")}
                  />
                  <FieldError message={getErrorMessage(errors, "transportCost")} />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="loadingCost">Biaya Bongkar</FieldLabel>
                  <Input
                    id="loadingCost"
                    min="0"
                    step="0.01"
                    type="number"
                    {...form.register("loadingCost")}
                  />
                  <FieldError message={getErrorMessage(errors, "loadingCost")} />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="otherCost">Biaya Lain</FieldLabel>
                  <Input
                    id="otherCost"
                    min="0"
                    step="0.01"
                    type="number"
                    {...form.register("otherCost")}
                  />
                  <FieldError message={getErrorMessage(errors, "otherCost")} />
                </div>
              </div>
                <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">
                    Total biaya operasional saat ini: {formatCurrency(calculations.operationalCost)}
                  </div>
                  <p className="mt-2 leading-6">
                    Nilai ini dicatat untuk kebutuhan operasional dan analisis margin, sementara hutang pembelian tetap mengikuti total akhir transaksi.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-border/80 bg-muted/20 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Calculator className="size-4 text-primary" />
                  Alur Perhitungan
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Sistem menghitung total pembelian secara otomatis agar admin bisa fokus memverifikasi angka, bukan menghitung manual.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <InfoBlock
                    label="Total Pembelian"
                    value={formatCurrency(calculations.totalPurchase)}
                    helper="Berat Bersih x Harga Beli / Kg"
                  />
                  <InfoBlock
                    label="Biaya Operasional"
                    value={formatCurrency(calculations.operationalCost)}
                    helper="Biaya angkut + bongkar + biaya lain"
                  />
                  <InfoBlock
                    label="Potongan"
                    value={formatCurrency(calculations.deductionAmount)}
                    helper="Potong hutang toko petani yang diterapkan sistem."
                  />
                  <div className="sm:col-span-2">
                    <InfoBlock
                      emphasis
                      label="Total Akhir"
                      value={formatCurrency(calculations.totalFinal)}
                      helper="Nilai hutang petani yang akan dibentuk sistem"
                    />
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            description="Informasi pembayaran ditampilkan sebagai referensi. Pencatatan pembayaran tetap dilakukan pada modul Finance."
            title="Status & Pembayaran"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoBlock
                label="Status Transaksi"
                value={
                  mode === "create"
                    ? "Akan aktif setelah disimpan"
                    : formatPalmStatusLabel(currentTransactionStatus)
                }
              />
              <InfoBlock
                label="Status Pembayaran"
                value={formatPalmStatusLabel(effectivePaymentStatus)}
              />
              <InfoBlock
                label="Sudah Dibayar"
                value={formatCurrency(calculations.paidAmount)}
              />
              <InfoBlock
                emphasis
                label="Sisa Hutang"
                value={formatCurrency(calculations.outstandingAmount)}
              />
            </div>
            <div className="mt-4 rounded-2xl border border-border/80 bg-card/80 p-4 text-sm leading-6 text-muted-foreground">
              <div className="flex items-start gap-3">
                <Wallet className="mt-0.5 size-4 text-primary" />
                <div>
                  {paymentSnapshot?.payableCode ? (
                    <p className="font-medium text-foreground">
                      Referensi hutang aktif: {paymentSnapshot.payableCode}
                    </p>
                  ) : (
                    <p className="font-medium text-foreground">
                      Hutang dibuat otomatis setelah transaksi disimpan.
                    </p>
                  )}
                  <p className="mt-1">
                    Jika Anda ingin langsung mencatat pembayaran, gunakan aksi{" "}
                    <span className="font-medium text-foreground">
                      Simpan & Catat Pembayaran
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
            {calculations.hasPaymentConflict ? (
              <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 size-4" />
                  <p>
                    Nilai yang sudah dibayar melebihi total akhir hasil edit. Sesuaikan
                    nilai transaksi atau koreksi pembayaran sebelum menyimpan.
                  </p>
                </div>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            description="Catatan tambahan membantu audit dan tindak lanjut operasional."
            title="Catatan Tambahan"
          >
            <div className="space-y-2">
              <FieldLabel htmlFor="notes">Catatan</FieldLabel>
              <Textarea
                id="notes"
                placeholder="Tambahkan informasi penting seperti kondisi muatan, catatan timbangan, atau arahan pembayaran."
                {...form.register("notes")}
              />
              <FieldHint>
                Biarkan kosong jika tidak ada catatan tambahan. Sistem akan
                menampilkan status catatan kosong pada halaman detail.
              </FieldHint>
              <FieldError message={getErrorMessage(errors, "notes")} />
            </div>
          </SectionCard>
        </div>

        <PalmPurchaseFormSummary
          deductionAmount={calculations.deductionAmount}
          hasPaymentConflict={calculations.hasPaymentConflict}
          netWeight={calculations.netWeight}
          outstandingAmount={calculations.outstandingAmount}
          paidAmount={calculations.paidAmount}
          payableCode={paymentSnapshot?.payableCode}
          paymentStatus={effectivePaymentStatus}
          totalFinal={calculations.totalFinal}
          totalPurchase={calculations.totalPurchase}
          transactionStatus={currentTransactionStatus}
        />
      </form>
    </div>
  );
}
