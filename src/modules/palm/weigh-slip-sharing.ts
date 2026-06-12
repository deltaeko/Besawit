import { buildPrintSettingsHref, type PrintMarginPreset } from "@/lib/print-settings";

type PayableLike = {
  amount?: number | string | null;
  code?: string | null;
  outstandingAmount?: number | string | null;
  paidAmount?: number | string | null;
  status?: string | null;
};

type PaymentLike = {
  method?: string | null;
  paymentDate?: Date | string | null;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toTimestamp(value: Date | string | null | undefined) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
  }

  return Number.NEGATIVE_INFINITY;
}

function toDateString(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : null;
}

export function buildShareReadyPrintHref(baseHref: string, marginPreset: PrintMarginPreset) {
  const hrefWithMargin = buildPrintSettingsHref(baseHref, marginPreset);
  const [pathname, queryString] = hrefWithMargin.split("?");
  const params = new URLSearchParams(queryString ?? "");
  params.set("shared", "1");
  const serialized = params.toString();

  return serialized ? `${pathname}?${serialized}` : pathname;
}

export function buildWeighSlipPaymentSummary(input?: {
  payable?: PayableLike | null;
  paymentHistory?: PaymentLike[] | null;
}) {
  const paymentHistory = input?.paymentHistory ?? [];
  const latestPayment =
    paymentHistory.length > 0
      ? [...paymentHistory].sort(
          (left, right) => toTimestamp(right.paymentDate) - toTimestamp(left.paymentDate),
        )[0]
      : null;

  return {
    payableCode: input?.payable?.code ?? null,
    paymentStatus: input?.payable?.status ?? "unpaid",
    totalAmount: toNumber(input?.payable?.amount),
    paidAmount: toNumber(input?.payable?.paidAmount),
    outstandingAmount: toNumber(input?.payable?.outstandingAmount),
    latestPaymentDate: toDateString(latestPayment?.paymentDate),
    latestPaymentMethod: latestPayment?.method ?? null,
  };
}

export type WeighSlipPaymentSummary = ReturnType<typeof buildWeighSlipPaymentSummary>;
