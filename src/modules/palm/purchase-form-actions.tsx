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
    <div className="flex flex-wrap items-center justify-end gap-2 rounded-[1.35rem] border border-white/85 bg-card/92 p-1.5 shadow-[0_20px_56px_-36px_rgba(20,37,24,0.22)] ring-1 ring-black/[0.02]">
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
