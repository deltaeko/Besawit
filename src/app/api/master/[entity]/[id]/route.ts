import { NextResponse } from "next/server";

import { requireMasterEntityPermission } from "@/lib/auth/api-guard";
import { isMasterEntity } from "@/modules/master/helpers";
import { getMasterRecordById } from "@/repositories/master-repository";
import { recordUpdatedProductPriceHistory, updateMaster } from "@/services/master-service";

export async function GET(
  _: Request,
  context: { params: Promise<{ entity: string; id: string }> },
) {
  const { entity, id } = await context.params;

  if (!isMasterEntity(entity)) {
    return NextResponse.json({ error: "Unknown entity." }, { status: 404 });
  }

  const record = await getMasterRecordById(entity, id);

  if (!record) {
    return NextResponse.json({ error: "Record not found." }, { status: 404 });
  }

  return NextResponse.json(record);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ entity: string; id: string }> },
) {
  const { entity, id } = await context.params;

  if (!isMasterEntity(entity)) {
    return NextResponse.json({ error: "Unknown entity." }, { status: 404 });
  }

  const payload = await request.json();
  const auth = await requireMasterEntityPermission(entity);
  if (auth.response || !auth.session) {
    return auth.response;
  }
  const previousRecord = entity === "products" ? await getMasterRecordById(entity, id) : null;

  try {
    const record = await updateMaster(entity, id, payload, auth.session.sub);
    if (entity === "products" && previousRecord) {
      await recordUpdatedProductPriceHistory(
        id,
        previousRecord as { purchasePrice?: unknown; sellingPrice?: unknown },
        payload,
        auth.session.sub,
      );
    }
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update record." },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ entity: string; id: string }> },
) {
  const { entity, id } = await context.params;

  if (!isMasterEntity(entity)) {
    return NextResponse.json({ error: "Unknown entity." }, { status: 404 });
  }

  const payload = await request.json();
  const auth = await requireMasterEntityPermission(entity);
  if (auth.response || !auth.session) {
    return auth.response;
  }
  const previousRecord = entity === "products" ? await getMasterRecordById(entity, id) : null;

  try {
    const record = await updateMaster(entity, id, payload, auth.session.sub);
    if (entity === "products" && previousRecord) {
      await recordUpdatedProductPriceHistory(
        id,
        previousRecord as { purchasePrice?: unknown; sellingPrice?: unknown },
        payload,
        auth.session.sub,
      );
    }
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update record." },
      { status: 400 },
    );
  }
}
