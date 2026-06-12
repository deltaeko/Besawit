import { NextResponse } from "next/server";

import { readBrandingAsset } from "@/lib/branding-assets";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ assetPath?: string[] }>;
  },
) {
  try {
    const params = await context.params;
    const assetPath = params.assetPath ?? [];

    if (!assetPath.length) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const asset = await readBrandingAsset(assetPath);

    return new NextResponse(asset.bytes, {
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
