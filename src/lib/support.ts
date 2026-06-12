import { env } from "@/lib/env";

function sanitizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeWhatsappPhone(rawPhone?: string | null) {
  const digits = sanitizeDigits(rawPhone ?? "");

  if (!digits) {
    return null;
  }

  if (digits.startsWith("62")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  if (digits.startsWith("8")) {
    return `62${digits}`;
  }

  return digits;
}

export function getSupportWhatsappPhone(rawPhone?: string | null) {
  return normalizeWhatsappPhone(rawPhone ?? env.TRIAL_CONTACT_WHATSAPP);
}

export function getSupportWhatsappDisplay(rawPhone?: string | null) {
  return rawPhone?.trim() || env.TRIAL_CONTACT_WHATSAPP;
}

export function getSupportWhatsappHours() {
  return env.SUPPORT_WHATSAPP_HOURS;
}

export function buildSupportWhatsappHref(input: {
  message: string;
  phone?: string | null;
}) {
  const phone = getSupportWhatsappPhone(input.phone);
  if (!phone) {
    return null;
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(input.message)}`;
}
