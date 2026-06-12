import { getPrintMarginValue, type PrintMarginPreset } from "@/lib/print-settings";

export function PrintPageStyle({
  marginPreset,
}: {
  marginPreset: PrintMarginPreset;
}) {
  return (
    <style media="print">{`
      @page {
        size: A4 portrait;
        margin: ${getPrintMarginValue(marginPreset)};
      }
    `}</style>
  );
}
