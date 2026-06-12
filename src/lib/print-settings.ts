export const printMarginPresetValues = ["narrow", "normal", "wide"] as const;

export type PrintMarginPreset = (typeof printMarginPresetValues)[number];

const printMarginPresetMeta: Record<
  PrintMarginPreset,
  {
    label: string;
    margin: string;
  }
> = {
  narrow: {
    label: "Narrow",
    margin: "8mm",
  },
  normal: {
    label: "Normal",
    margin: "12mm",
  },
  wide: {
    label: "Wide",
    margin: "16mm",
  },
};

export function resolvePrintMarginPreset(value: null | string | undefined): PrintMarginPreset {
  if (!value) return "normal";

  return printMarginPresetValues.includes(value as PrintMarginPreset)
    ? (value as PrintMarginPreset)
    : "normal";
}

export function getPrintMarginPresetLabel(preset: PrintMarginPreset) {
  return printMarginPresetMeta[preset].label;
}

export function getPrintMarginValue(preset: PrintMarginPreset) {
  return printMarginPresetMeta[preset].margin;
}

export function buildPrintSettingsHref(baseHref: string, marginPreset: PrintMarginPreset) {
  const [pathname, queryString] = baseHref.split("?");
  const params = new URLSearchParams(queryString ?? "");
  params.set("margin", marginPreset);

  const serialized = params.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}
