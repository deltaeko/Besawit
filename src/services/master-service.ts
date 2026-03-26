import { hashSync } from "bcryptjs";

import {
  createProductPriceHistory,
  createMasterRecord,
  findMasterByCode,
  getMasterFormOptions,
  getMasterRecordById,
  hasMasterTransactions,
  listProductPriceHistories,
  listMasterRecords,
  updateMasterRecord,
  updateMasterStatus,
  type MasterListQuery,
} from "@/repositories/master-repository";
import {
  getMasterEntitySchema,
  productSchema,
  productPriceChangeSchema,
  masterListQuerySchema,
} from "@/lib/validation/master";
import { logAudit } from "@/services/audit-service";
import type { MasterEntityKey } from "@/types/domain";

async function generateFarmerCode() {
  const now = new Date();
  const datePart =
    `${now.getFullYear()}`.slice(2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = String(Math.floor(Math.random() * 9000) + 1000);
    const code = `FRM-${datePart}-${suffix}`;
    const existing = await findMasterByCode("farmers", code);
    if (!existing) return code;
  }

  throw new Error("Gagal membuat kode petani otomatis.");
}

export async function getMasterList(
  entity: MasterEntityKey,
  query?: Partial<MasterListQuery>,
) {
  const parsed = masterListQuerySchema.parse(query ?? {});
  const result = await listMasterRecords(entity, parsed);

  return {
    items: result.items,
    meta: {
      page: parsed.page,
      pageSize: parsed.pageSize,
      total: result.total,
      totalPages: Math.max(Math.ceil(result.total / parsed.pageSize), 1),
      q: parsed.q,
      status: parsed.status,
      sort: parsed.sort,
    },
  };
}

export async function getMasterDetail(entity: MasterEntityKey, id: string) {
  return getMasterRecordById(entity, id);
}

export async function getProductPriceHistoryList(productId: string, limit = 20) {
  return listProductPriceHistories(productId, limit);
}

export async function getMasterOptions() {
  return getMasterFormOptions();
}

export async function recordInitialProductPriceHistory(
  productId: string,
  payload: unknown,
  actorId?: string | null,
) {
  const parsed = productSchema.parse(payload);
  const effectiveFrom = parsed.priceEffectiveFrom
    ? new Date(parsed.priceEffectiveFrom)
    : new Date();

  return createProductPriceHistory({
    productId,
    effectiveFrom,
    purchasePrice: Number(parsed.purchasePrice).toFixed(2),
    sellingPrice: Number(parsed.sellingPrice).toFixed(2),
    notes: parsed.priceChangeNote?.trim() || "Harga awal produk.",
    createdBy: actorId ?? null,
  });
}

export async function recordUpdatedProductPriceHistory(
  productId: string,
  previousRecord: { purchasePrice?: unknown; sellingPrice?: unknown },
  payload: unknown,
  actorId?: string | null,
) {
  const parsed = productSchema.parse(payload);
  const previousPurchasePrice = Number(previousRecord.purchasePrice ?? 0);
  const previousSellingPrice = Number(previousRecord.sellingPrice ?? 0);
  const nextPurchasePrice = Number(parsed.purchasePrice);
  const nextSellingPrice = Number(parsed.sellingPrice);
  const priceChanged =
    previousPurchasePrice !== nextPurchasePrice || previousSellingPrice !== nextSellingPrice;

  if (!priceChanged) {
    return null;
  }

  const effectiveFrom = parsed.priceEffectiveFrom
    ? new Date(parsed.priceEffectiveFrom)
    : new Date();

  return createProductPriceHistory({
    productId,
    effectiveFrom,
    purchasePrice: nextPurchasePrice.toFixed(2),
    sellingPrice: nextSellingPrice.toFixed(2),
    notes: parsed.priceChangeNote?.trim() || "Perubahan harga produk.",
    createdBy: actorId ?? null,
  });
}

export async function changeProductPrice(
  productId: string,
  payload: unknown,
  actorId?: string | null,
) {
  const existing = await getMasterRecordById("products", productId);
  if (!existing) {
    throw new Error("Produk tidak ditemukan.");
  }

  const parsed = productPriceChangeSchema.parse(payload);
  const previousPurchasePrice = Number((existing as Record<string, unknown>).purchasePrice ?? 0);
  const previousSellingPrice = Number((existing as Record<string, unknown>).sellingPrice ?? 0);
  const nextPurchasePrice = Number(parsed.purchasePrice);
  const nextSellingPrice = Number(parsed.sellingPrice);

  if (
    previousPurchasePrice === nextPurchasePrice &&
    previousSellingPrice === nextSellingPrice
  ) {
    throw new Error("Tidak ada perubahan harga yang disimpan.");
  }

  const product = await updateMasterRecord("products", productId, {
    purchasePrice: nextPurchasePrice.toFixed(2),
    sellingPrice: nextSellingPrice.toFixed(2),
    updatedAt: new Date(),
  });

  if (!product) {
    throw new Error("Gagal memperbarui harga produk.");
  }

  const history = await createProductPriceHistory({
    productId,
    effectiveFrom: new Date(parsed.effectiveFrom),
    purchasePrice: nextPurchasePrice.toFixed(2),
    sellingPrice: nextSellingPrice.toFixed(2),
    notes: parsed.note?.trim() || "Perubahan harga produk.",
    createdBy: actorId ?? null,
  });

  await logAudit({
    entityType: "products",
    entityId: productId,
    action: "price_update",
    actorId,
    before: {
      purchasePrice: previousPurchasePrice,
      sellingPrice: previousSellingPrice,
    },
    after: {
      purchasePrice: nextPurchasePrice,
      sellingPrice: nextSellingPrice,
      effectiveFrom: parsed.effectiveFrom,
      note: parsed.note ?? null,
    },
    metadata: {
      historyId: history.id,
    },
  });

  return {
    product,
    history,
  };
}

function parsePermissionsJson(value?: string) {
  if (!value) return {};

  try {
    return JSON.parse(value);
  } catch {
    throw new Error("Permissions JSON tidak valid.");
  }
}

export async function createMaster(
  entity: MasterEntityKey,
  payload: unknown,
  actorId?: string | null,
) {
  const parsed = getMasterEntitySchema(entity).parse(payload) as Record<string, unknown>;

  if ("code" in parsed && typeof parsed.code === "string") {
    const existing = await findMasterByCode(entity, parsed.code);
    if (existing) {
      throw new Error("Code sudah digunakan.");
    }
  }

  let recordValues: Record<string, unknown> = parsed;

  if (entity === "users") {
    recordValues = {
      roleId: parsed.roleId,
      fullName: parsed.fullName,
      email: parsed.email,
      phone: parsed.phone ?? null,
      passwordHash: hashSync(String(parsed.password ?? "password123"), 10),
      isActive: Boolean(parsed.isActive),
    };
  } else if (entity === "roles") {
    recordValues = {
      code: parsed.code,
      name: parsed.name,
      description: parsed.description ?? null,
      permissions: parsePermissionsJson(parsed.permissions as string | undefined),
      isSystem: Boolean(parsed.isSystem),
    };
  } else if (entity === "products") {
    recordValues = {
      categoryId: parsed.categoryId ?? null,
      code: parsed.code,
      sku: parsed.sku ?? null,
      name: parsed.name,
      unit: parsed.unit,
      purchasePrice: Number(parsed.purchasePrice).toFixed(2),
      sellingPrice: Number(parsed.sellingPrice).toFixed(2),
      minStock: Number(parsed.minStock).toFixed(2),
      allowNegativeStock: Boolean(parsed.allowNegativeStock),
      notes: parsed.notes ?? null,
      isActive: Boolean(parsed.isActive),
    };
  } else if (entity === "transport-personnel") {
    recordValues = {
      code: parsed.code,
      role: parsed.role,
      name: parsed.name,
      phone: parsed.phone ?? null,
      licenseNumber: parsed.licenseNumber ?? null,
      identityNumber: parsed.identityNumber ?? null,
      primaryVehicleId: parsed.primaryVehicleId ?? null,
      notes: parsed.notes ?? null,
      isActive: Boolean(parsed.isActive),
    };
  } else if (entity === "vehicles") {
    recordValues = {
      code: parsed.code,
      plateNumber: parsed.plateNumber,
      type: parsed.type ?? null,
      capacityKg: Number(parsed.capacityKg).toFixed(2),
      notes: parsed.notes ?? null,
      isActive: Boolean(parsed.isActive),
    };
  } else {
    recordValues = Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, value ?? null]),
    );
  }

  if (entity === "customers") {
    const isFarmer = Boolean(parsed.isFarmer);
    const existingFarmerId = parsed.farmerId as string | undefined;

    if (isFarmer && !existingFarmerId) {
      const farmerCode = await generateFarmerCode();
      const farmer = await createMasterRecord("farmers", {
        code: farmerCode,
        name: parsed.name,
        phone: parsed.phone ?? null,
        address: parsed.address ?? null,
        village: null,
        districtOrCity: parsed.city ?? null,
        notes: "Dibuat otomatis dari pelanggan toko.",
        isActive: true,
      });

      await logAudit({
        entityType: "farmers",
        entityId: farmer.id,
        action: "create",
        actorId,
        after: farmer,
      });

      recordValues = {
        ...recordValues,
        farmerId: farmer.id,
      };
    }

    if ("isFarmer" in recordValues) {
      delete (recordValues as { isFarmer?: boolean }).isFarmer;
    }
  }

  const record = await createMasterRecord(entity, recordValues);

  await logAudit({
    entityType: entity,
    entityId: record.id,
    action: "create",
    actorId,
    after: record,
  });

  return record;
}

export async function updateMaster(
  entity: MasterEntityKey,
  id: string,
  payload: unknown,
  actorId?: string | null,
) {
  const existing = await getMasterRecordById(entity, id);

  if (!existing) {
    throw new Error("Record not found.");
  }

  if (await hasMasterTransactions(entity, id)) {
    throw new Error("Data sudah digunakan pada transaksi, perubahan tidak diizinkan.");
  }

  const parsed = getMasterEntitySchema(entity).parse(payload) as Record<string, unknown>;

  if ("code" in parsed && typeof parsed.code === "string") {
    const duplicate = await findMasterByCode(entity, parsed.code, id);
    if (duplicate) {
      throw new Error("Code sudah digunakan.");
    }
  }

  let values: Record<string, unknown> = {
    ...parsed,
    updatedAt: new Date(),
  };

  if (entity === "users") {
    values = {
      roleId: parsed.roleId,
      fullName: parsed.fullName,
      email: parsed.email,
      phone: parsed.phone ?? null,
      isActive: Boolean(parsed.isActive),
      updatedAt: new Date(),
    };

    if (parsed.password) {
      values.passwordHash = hashSync(String(parsed.password), 10);
    }
  } else if (entity === "roles") {
    values = {
      code: parsed.code,
      name: parsed.name,
      description: parsed.description ?? null,
      permissions: parsePermissionsJson(parsed.permissions as string | undefined),
      isSystem: Boolean(parsed.isSystem),
      updatedAt: new Date(),
    };
  } else if (entity === "products") {
    values = {
      categoryId: parsed.categoryId ?? null,
      code: parsed.code,
      sku: parsed.sku ?? null,
      name: parsed.name,
      unit: parsed.unit,
      purchasePrice: Number(parsed.purchasePrice).toFixed(2),
      sellingPrice: Number(parsed.sellingPrice).toFixed(2),
      minStock: Number(parsed.minStock).toFixed(2),
      allowNegativeStock: Boolean(parsed.allowNegativeStock),
      notes: parsed.notes ?? null,
      isActive: Boolean(parsed.isActive),
      updatedAt: new Date(),
    };
  } else if (entity === "transport-personnel") {
    values = {
      code: parsed.code,
      role: parsed.role,
      name: parsed.name,
      phone: parsed.phone ?? null,
      licenseNumber: parsed.licenseNumber ?? null,
      identityNumber: parsed.identityNumber ?? null,
      primaryVehicleId: parsed.primaryVehicleId ?? null,
      notes: parsed.notes ?? null,
      isActive: Boolean(parsed.isActive),
      updatedAt: new Date(),
    };
  } else if (entity === "vehicles") {
    values = {
      code: parsed.code,
      plateNumber: parsed.plateNumber,
      type: parsed.type ?? null,
      capacityKg: Number(parsed.capacityKg).toFixed(2),
      notes: parsed.notes ?? null,
      isActive: Boolean(parsed.isActive),
      updatedAt: new Date(),
    };
  } else {
    values = {
      ...Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [key, value ?? null]),
      ),
      updatedAt: new Date(),
    };
  }

  if (entity === "customers") {
    const isFarmer = Boolean(parsed.isFarmer);
    const existingFarmerId = parsed.farmerId as string | undefined;

    if (isFarmer && !existingFarmerId) {
      const farmerCode = await generateFarmerCode();
      const farmer = await createMasterRecord("farmers", {
        code: farmerCode,
        name: parsed.name,
        phone: parsed.phone ?? null,
        address: parsed.address ?? null,
        village: null,
        districtOrCity: parsed.city ?? null,
        notes: "Dibuat otomatis dari pelanggan toko.",
        isActive: true,
      });

      await logAudit({
        entityType: "farmers",
        entityId: farmer.id,
        action: "create",
        actorId,
        after: farmer,
      });

      values = {
        ...values,
        farmerId: farmer.id,
      };
    }

    if ("isFarmer" in values) {
      delete (values as { isFarmer?: boolean }).isFarmer;
    }
  }

  const record = await updateMasterRecord(entity, id, values);

  if (!record) {
    throw new Error("Failed to update record.");
  }

  await logAudit({
    entityType: entity,
    entityId: record.id,
    action: "update",
    actorId,
    before: existing,
    after: record,
  });

  return record;
}

export async function changeMasterStatus(
  entity: MasterEntityKey,
  id: string,
  isActive: boolean,
  actorId?: string | null,
) {
  const existing = await getMasterRecordById(entity, id);

  if (!existing) {
    throw new Error("Record not found.");
  }

  const record = await updateMasterStatus(entity, id, isActive);

  if (!record) {
    throw new Error("Failed to update status.");
  }

  await logAudit({
    entityType: entity,
    entityId: record.id,
    action: isActive ? "activate" : "deactivate",
    actorId,
    before: existing,
    after: record,
  });

  return record;
}
