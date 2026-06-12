"use client";

import { useMemo } from "react";
import { MessageCircleMore } from "lucide-react";

import { Button } from "@/components/ui/button";

function buildShareText(message: string, shareUrl?: string | null) {
  return shareUrl ? `${message}\n${shareUrl}` : message;
}

export function WhatsappShareButton({
  label = "Share WhatsApp",
  message,
  sharePath,
  variant = "outline",
}: {
  label?: string;
  message: string;
  sharePath?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
}) {
  const shareUrl = useMemo(() => {
    if (!sharePath) {
      return typeof window !== "undefined" ? window.location.href : "";
    }

    if (typeof window === "undefined") {
      return sharePath;
    }

    return new URL(sharePath, window.location.origin).toString();
  }, [sharePath]);

  function handleShare() {
    const text = buildShareText(message, shareUrl);
    const desktopHref = `whatsapp://send?text=${encodeURIComponent(text)}`;
    const webHref = `https://wa.me/?text=${encodeURIComponent(text)}`;

    const fallbackTimer = window.setTimeout(() => {
      window.open(webHref, "_blank", "noopener,noreferrer");
    }, 900);

    window.addEventListener(
      "blur",
      () => {
        window.clearTimeout(fallbackTimer);
      },
      { once: true },
    );

    window.location.href = desktopHref;
  }

  return (
    <Button onClick={handleShare} type="button" variant={variant}>
      <MessageCircleMore className="size-4" />
      {label}
    </Button>
  );
}
