"use client";

import { MessageCircleMore } from "lucide-react";

import {
  buildSupportWhatsappHref,
  getSupportWhatsappDisplay,
  getSupportWhatsappHours,
  getSupportWhatsappPhone,
} from "@/lib/support";
import { cn } from "@/lib/utils";

export function SupportWhatsappButton({
  className,
  float = false,
  label = "Butuh Bantuan?",
  message,
  phone,
  showAvailability = false,
  source,
}: {
  className?: string;
  float?: boolean;
  label?: string;
  message: string;
  phone?: string | null;
  showAvailability?: boolean;
  source?: string;
}) {
  const href = buildSupportWhatsappHref({ message, phone });
  const normalizedPhone = getSupportWhatsappPhone(phone);

  if (!href || !normalizedPhone) {
    return null;
  }

  function handleClick() {
    void fetch("/api/support/whatsapp-click", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        href,
        label,
        message,
        phone: normalizedPhone,
        source: source ?? null,
        pathname: window.location.pathname,
        host: window.location.host,
      }),
      keepalive: true,
    }).catch(() => {
      // Support click logging should never block the user from opening WhatsApp.
    });
  }

  return (
    <div className={cn("inline-flex flex-col gap-1.5", float && "fixed bottom-5 right-5 z-50 print:hidden")}>
      <a
        className={cn(
          "inline-flex items-center gap-3 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-[#0f2616] shadow-[0_18px_40px_-22px_rgba(37,211,102,0.75)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_46px_-22px_rgba(37,211,102,0.85)]",
          className,
        )}
        href={href}
        onClick={handleClick}
        rel="noreferrer"
        target="_blank"
        title={`Chat WhatsApp ${getSupportWhatsappDisplay(phone)}`}
      >
        <MessageCircleMore className="size-5 shrink-0" />
        <span>{label}</span>
      </a>
      {showAvailability ? (
        <div className="px-3 text-xs text-muted-foreground">
          Respon WhatsApp: {getSupportWhatsappHours()}
        </div>
      ) : null}
    </div>
  );
}
