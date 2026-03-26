"use client";

import Link from "next/link";
import { FileText, Printer, ArrowLeft, CreditCard, PencilLine } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PalmTransactionDetailActions({
  backHref,
  editHref,
  paymentHref,
  documentHref,
  documentLabel = "Preview Dokumen",
}: {
  backHref: string;
  editHref?: string;
  paymentHref: string;
  documentHref?: string;
  documentLabel?: string;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2 rounded-xl border border-border/70 bg-card/70 p-1.5">
      <Button asChild size="sm" variant="ghost">
        <Link href={backHref}>
          <ArrowLeft className="size-4" />
          Kembali
        </Link>
      </Button>
      {editHref ? (
        <Button asChild size="sm" variant="outline">
          <Link href={editHref}>
            <PencilLine className="size-4" />
            Ubah
          </Link>
        </Button>
      ) : (
        <Button disabled size="sm" variant="outline">
          <PencilLine className="size-4" />
          Ubah
        </Button>
      )}
      <Button asChild size="sm" variant="default">
        <Link href={paymentHref}>
          <CreditCard className="size-4" />
          Catat Pembayaran
        </Link>
      </Button>
      {documentHref ? (
        <Button asChild size="sm" variant="outline">
          <Link href={documentHref}>
            <FileText className="size-4" />
            {documentLabel}
          </Link>
        </Button>
      ) : null}
      <Button onClick={() => window.print()} size="sm" type="button" variant="outline">
        <Printer className="size-4" />
        Cetak
      </Button>
    </div>
  );
}
