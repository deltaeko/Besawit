"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PrintDocumentActions({
  backHref,
  documentType,
  referenceId,
  referenceType,
  fileName,
  printLabel = "Cetak Dokumen",
}: {
  backHref: string;
  documentType:
    | "payable_statement"
    | "receivable_statement"
    | "payment_receipt"
    | "store_invoice"
    | "stock_take_report";
  referenceType:
    | "tbs_purchase"
    | "tbs_sale"
    | "store_purchase"
    | "store_sale"
    | "stock_take"
    | "payment"
    | "manual";
  referenceId: string;
  fileName?: string;
  printLabel?: string;
}) {
  async function handlePrint() {
    try {
      await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType,
          referenceType,
          referenceId,
          fileName: fileName ?? null,
        }),
      });
    } catch {
      // Logging failure should not block printing.
    }

    window.print();
  }

  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <Button asChild variant="outline">
        <Link href={backHref}>
          <ArrowLeft className="size-4" />
          Kembali
        </Link>
      </Button>
      <Button onClick={handlePrint} type="button">
        <Printer className="size-4" />
        {printLabel}
      </Button>
    </div>
  );
}
