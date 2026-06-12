import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

import {
  readBrandingAsset,
  toAbsoluteBrandingAssetUrl,
} from "@/lib/branding-assets";
import { getResolvedBrandingSettings } from "@/services/branding-service";

const internalBrandingAssetPrefix = "/api/branding-assets/";

async function resolveBrandingImageBytes(assetUrl: string | null | undefined) {
  if (!assetUrl) {
    return null;
  }

  if (assetUrl.startsWith(internalBrandingAssetPrefix)) {
    const assetPath = assetUrl
      .slice(internalBrandingAssetPrefix.length)
      .split("/")
      .filter(Boolean);

    if (!assetPath.length) {
      return null;
    }

    return readBrandingAsset(assetPath);
  }

  const response = await fetch(toAbsoluteBrandingAssetUrl(assetUrl), {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type")?.split(";")[0] ?? "image/png",
  };
}

export async function buildBrandIconResponse(options: {
  size: number;
  borderRadius: number;
  fontSize: number;
  letterSpacing: string;
}) {
  const branding = await getResolvedBrandingSettings();
  const imageAsset = await resolveBrandingImageBytes(
    branding.faviconUrl ?? branding.logoSquareUrl ?? branding.logoUrl,
  ).catch(() => null);

  if (imageAsset) {
    return new NextResponse(imageAsset.bytes, {
      headers: {
        "Content-Type": imageAsset.contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(circle at top left, ${branding.accentColor}55, transparent 42%), linear-gradient(145deg, ${branding.primaryColor} 0%, #315938 100%)`,
          borderRadius: options.borderRadius,
          color: branding.accentColor,
          fontSize: options.fontSize,
          fontWeight: 700,
          letterSpacing: options.letterSpacing,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          textTransform: "uppercase",
        }}
      >
        {branding.mark}
      </div>
    ),
    {
      width: options.size,
      height: options.size,
    },
  );
}
