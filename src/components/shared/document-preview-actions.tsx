"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

import { PrintMarginPresetGroup } from "@/components/shared/print-margin-preset-group";
import { Button } from "@/components/ui/button";
import { WhatsappShareButton } from "@/components/shared/whatsapp-share-button";
import {
  buildPrintSettingsHref,
  type PrintMarginPreset,
} from "@/lib/print-settings";
import { buildShareReadyPrintHref } from "@/modules/palm/weigh-slip-sharing";

export function DocumentPreviewActions({
  backHref,
  printHref,
  printLabel = "Print Preview",
  whatsappMessage,
  whatsappSharePath,
}: {
  backHref: string;
  printHref: string;
  printLabel?: string;
  whatsappMessage: string;
  whatsappSharePath?: string;
}) {
  const [marginPreset, setMarginPreset] = useState<PrintMarginPreset>("normal");
  const resolvedPrintHref = buildPrintSettingsHref(printHref, marginPreset);
  const resolvedWhatsappShareHref = buildShareReadyPrintHref(
    whatsappSharePath ?? printHref,
    marginPreset,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline">
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            Kembali
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={resolvedPrintHref} target="_blank">
            <Printer className="size-4" />
            {printLabel}
          </Link>
        </Button>
        <WhatsappShareButton
          message={whatsappMessage}
          sharePath={resolvedWhatsappShareHref}
        />
      </div>
      <PrintMarginPresetGroup onChange={setMarginPreset} value={marginPreset} />
      <div className="text-xs text-muted-foreground">
        Saran cetak: kertas A4, scale 100%, lalu sesuaikan preset margin dengan printer yang dipakai.
      </div>
    </div>
  );
}
