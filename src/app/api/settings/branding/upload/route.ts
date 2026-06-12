import { NextResponse } from "next/server";

import { saveBrandingAsset, type BrandingAssetKind } from "@/lib/branding-assets";
import { canAccessPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { resolveTenantContextFromRequest } from "@/lib/platform/tenant-resolver";

export const runtime = "nodejs";

function isBrandingAssetKind(value: FormDataEntryValue | null): value is BrandingAssetKind {
  return value === "logoUrl" || value === "logoSquareUrl" || value === "faviconUrl";
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canAccessPermission(session.role, session.permissions, "settings.branding")) {
    return NextResponse.json(
      { error: "Anda tidak memiliki hak akses ke branding settings." },
      { status: 403 },
    );
  }

  try {
    const formData = await request.formData();
    const assetKind = formData.get("assetKind");
    const assetFile = formData.get("file");

    if (!isBrandingAssetKind(assetKind)) {
      return NextResponse.json({ error: "Jenis asset tidak valid." }, { status: 400 });
    }

    if (!(assetFile instanceof File)) {
      return NextResponse.json({ error: "File upload tidak ditemukan." }, { status: 400 });
    }

    const tenantContext = await resolveTenantContextFromRequest();
    const scope =
      tenantContext.kind === "tenant"
        ? `tenant-${tenantContext.subdomain}`
        : "base-app";

    const uploaded = await saveBrandingAsset({
      file: assetFile,
      kind: assetKind,
      scope,
    });

    return NextResponse.json({
      assetKind,
      assetUrl: uploaded.publicUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengunggah branding asset.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

