"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

import { PrintMarginPresetGroup } from "@/components/shared/print-margin-preset-group";
import { Button } from "@/components/ui/button";
import { WhatsappShareButton } from "@/components/shared/whatsapp-share-button";
import {
  buildPrintSettingsHref,
  resolvePrintMarginPreset,
} from "@/lib/print-settings";

export function BrowserPrintActions({
  backHref,
  printLabel = "Cetak Dokumen",
  whatsappMessage,
  sharePath,
}: {
  backHref: string;
  printLabel?: string;
  whatsappMessage?: string;
  sharePath?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isShared = searchParams.get("shared") === "1";
  const marginPreset = resolvePrintMarginPreset(searchParams.get("margin"));
  const shareHref = useMemo(() => {
    if (!sharePath) return undefined;
    return buildPrintSettingsHref(sharePath, marginPreset);
  }, [marginPreset, sharePath]);

  function handleMarginPresetChange(nextPreset: ReturnType<typeof resolvePrintMarginPreset>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("margin", nextPreset);
    const nextHref = `${pathname}?${params.toString()}`;
    router.replace(nextHref, { scroll: false });
  }

  return (
    <div className="space-y-3 print:hidden">
      <div className="flex flex-wrap gap-3">
        {!isShared ? (
          <Button asChild variant="outline">
            <Link href={backHref}>
              <ArrowLeft className="size-4" />
              Kembali
            </Link>
          </Button>
        ) : null}
        <Button onClick={() => window.print()} type="button">
          <Printer className="size-4" />
          {printLabel}
        </Button>
        {whatsappMessage ? (
          <WhatsappShareButton message={whatsappMessage} sharePath={shareHref} />
        ) : null}
      </div>
      <PrintMarginPresetGroup onChange={handleMarginPresetChange} value={marginPreset} />
      <div className="text-xs text-muted-foreground">
        Saran cetak: kertas A4, scale 100%, lalu sesuaikan preset margin sebelum membuka dialog printer.
      </div>
    </div>
  );
}
