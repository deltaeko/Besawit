"use client";

import { useState } from "react";

import { appBrand } from "@/lib/brand";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  fallbackImageUrl?: string | null;
  imageUrl?: string | null;
  markClassName?: string;
  mark?: string;
  name?: string;
  imageAlt?: string;
  textClassName?: string;
  tagline?: string;
  showTagline?: boolean;
  showWordmark?: boolean;
};

export function AppLogo({
  className,
  fallbackImageUrl,
  imageUrl,
  markClassName,
  mark = appBrand.mark,
  name = appBrand.name,
  imageAlt,
  textClassName,
  tagline = appBrand.tagline,
  showTagline = false,
  showWordmark = true,
}: AppLogoProps) {
  const [failedImageUrls, setFailedImageUrls] = useState<Record<string, boolean>>({});
  const candidateImageUrls = [imageUrl, fallbackImageUrl].filter(
    (value): value is string => Boolean(value),
  );
  const resolvedImageUrl =
    candidateImageUrls.find((value) => !failedImageUrls[value]) ?? null;
  const shouldRenderImage = Boolean(resolvedImageUrl);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/15 bg-[linear-gradient(145deg,#1f3b23_0%,#2f5a35_100%)] font-mono text-sm font-semibold uppercase tracking-[0.22em] text-[#e0f46e] shadow-[0_16px_34px_-18px_rgba(31,59,35,0.55)]",
          markClassName,
        )}
      >
        {shouldRenderImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={imageAlt ?? name}
            className="h-full w-full object-contain bg-transparent p-1"
            onError={() => {
              if (!resolvedImageUrl) {
                return;
              }

              setFailedImageUrls((current) => ({
                ...current,
                [resolvedImageUrl]: true,
              }));
            }}
            src={resolvedImageUrl ?? undefined}
          />
        ) : (
          mark
        )}
      </div>
      {showWordmark ? (
        <div className={cn("min-w-0", textClassName)}>
          <div className="truncate font-semibold tracking-tight text-foreground">
            {name}
          </div>
          {showTagline ? (
            <div className="truncate text-sm text-muted-foreground">{tagline}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
