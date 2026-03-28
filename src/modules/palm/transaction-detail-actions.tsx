"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileText, Printer, ArrowLeft, CreditCard, PencilLine, Ban, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancelAction,
  AlertDialogConfirmAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatPalmStatusLabel } from "@/modules/palm/status-utils";

export function PalmTransactionDetailActions({
  backHref,
  editHref,
  editDisabledReason,
  paymentHref,
  paymentStatus,
  transactionStatus,
  documentHref,
  documentLabel = "Preview Dokumen",
  voidAction,
  extraAction,
}: {
  backHref: string;
  editHref?: string;
  editDisabledReason?: string | null;
  paymentHref: string;
  paymentStatus?: string | null;
  transactionStatus?: string | null;
  documentHref?: string;
  documentLabel?: string;
  voidAction?: {
    apiPath: string;
    disabledReason?: string | null;
    label?: string;
  };
  extraAction?: {
    href: string;
    label: string;
    disabledReason?: string | null;
  };
}) {
  const router = useRouter();
  const [voiding, setVoiding] = useState(false);
  const isPaymentLocked =
    paymentStatus === "paid" || transactionStatus === "void" || transactionStatus === "cancelled";
  const isEditLocked = !editHref || Boolean(editDisabledReason);
  const isVoidLocked = !voidAction || Boolean(voidAction.disabledReason);
  const isExtraLocked = !extraAction || Boolean(extraAction.disabledReason);

  async function onVoidConfirm() {
    if (!voidAction) return;

    setVoiding(true);
    const response = await fetch(voidAction.apiPath, { method: "POST" });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      toast.error(result.error ?? "Gagal membatalkan transaksi.");
      setVoiding(false);
      return;
    }

    toast.success("Transaksi berhasil dibatalkan.");
    router.refresh();
  }

  return (
    <div className="flex w-full max-w-full flex-wrap justify-start gap-1.5 rounded-xl border border-border/70 bg-card/70 p-1.5 md:w-auto md:justify-end md:gap-2">
      <Button asChild size="sm" variant="ghost">
        <Link href={backHref}>
          <ArrowLeft className="size-4" />
          Kembali
        </Link>
      </Button>
      {!isEditLocked && editHref ? (
        <Button asChild size="sm" variant="outline">
          <Link href={editHref}>
            <PencilLine className="size-4" />
            Ubah
          </Link>
        </Button>
      ) : (
        <Button
          disabled
          size="sm"
          title={editDisabledReason ?? "Transaksi ini tidak bisa diubah."}
          variant="outline"
        >
          <PencilLine className="size-4" />
          Ubah
        </Button>
      )}
      {isPaymentLocked ? (
        <Button disabled size="sm" variant="default">
          <CreditCard className="size-4" />
          {formatPalmStatusLabel(paymentStatus ?? "paid")}
        </Button>
      ) : (
        <Button asChild size="sm" variant="default">
          <Link href={paymentHref}>
            <CreditCard className="size-4" />
            Catat Pembayaran
          </Link>
        </Button>
      )}
      {!isExtraLocked && extraAction ? (
        <Button asChild size="sm" variant="outline">
          <Link href={extraAction.href}>
            <ArrowRightLeft className="size-4" />
            {extraAction.label}
          </Link>
        </Button>
      ) : extraAction ? (
        <Button
          disabled
          size="sm"
          title={extraAction.disabledReason ?? `${extraAction.label} belum tersedia.`}
          variant="outline"
        >
          <ArrowRightLeft className="size-4" />
          {extraAction.label}
        </Button>
      ) : null}
      {documentHref ? (
        <Button asChild size="sm" variant="outline">
          <Link href={documentHref}>
            <FileText className="size-4" />
            {documentLabel}
          </Link>
        </Button>
      ) : null}
      {!isVoidLocked && voidAction ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Ban className="size-4" />
              {voidAction.label ?? "Batalkan"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Batalkan transaksi ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Pembatalan akan membalik stok yang sudah terbentuk dan membatalkan hutang/piutang
                yang belum dibayar. Tindakan ini dicatat ke audit log.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancelAction>Batal</AlertDialogCancelAction>
              <AlertDialogConfirmAction disabled={voiding} onClick={onVoidConfirm}>
                {voiding ? "Membatalkan..." : voidAction.label ?? "Batalkan"}
              </AlertDialogConfirmAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button
          disabled
          size="sm"
          title={voidAction?.disabledReason ?? "Transaksi ini tidak bisa dibatalkan."}
          variant="outline"
        >
          <Ban className="size-4" />
          {voidAction?.label ?? "Batalkan"}
        </Button>
      )}
      <Button onClick={() => window.print()} size="sm" type="button" variant="outline">
        <Printer className="size-4" />
        Cetak
      </Button>
    </div>
  );
}
