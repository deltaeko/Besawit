"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function BrowserPrintActions({
  backHref,
  printLabel = "Cetak Dokumen",
}: {
  backHref: string;
  printLabel?: string;
}) {
  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <Button asChild variant="outline">
        <Link href={backHref}>
          <ArrowLeft className="size-4" />
          Kembali
        </Link>
      </Button>
      <Button onClick={() => window.print()} type="button">
        <Printer className="size-4" />
        {printLabel}
      </Button>
    </div>
  );
}
