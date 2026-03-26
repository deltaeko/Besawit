"use client";

import { ArrowLeft, CreditCard, Save } from "lucide-react";

import { Button } from "@/components/ui/button";

export type PalmPurchaseSubmitIntent = "save" | "save_payment";

export function PalmPurchaseFormActions({
  mode,
  formId,
  submitting,
  onCancel,
  onIntentChange,
}: {
  mode: "create" | "edit";
  formId: string;
  submitting: boolean;
  onCancel: () => void;
  onIntentChange: (intent: PalmPurchaseSubmitIntent) => void;
}) {
  const primaryLabel = mode === "create" ? "Simpan" : "Simpan Perubahan";

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-border/70 bg-background/80 p-1.5 shadow-sm">
      <Button
        className="h-9 px-3 text-sm"
        disabled={submitting}
        onClick={onCancel}
        size="sm"
        type="button"
        variant="ghost"
      >
        <ArrowLeft className="size-4" />
        Kembali
      </Button>
      <Button
        className="h-9 px-3 text-sm"
        disabled={submitting}
        form={formId}
        onClick={() => onIntentChange("save_payment")}
        size="sm"
        type="submit"
        variant="outline"
      >
        <CreditCard className="size-4" />
        {submitting ? "Menyimpan..." : "Simpan & Catat Pembayaran"}
      </Button>
      <Button
        className="h-9 px-4 text-sm"
        disabled={submitting}
        form={formId}
        onClick={() => onIntentChange("save")}
        size="sm"
        type="submit"
      >
        <Save className="size-4" />
        {submitting ? "Menyimpan..." : primaryLabel}
      </Button>
    </div>
  );
}
