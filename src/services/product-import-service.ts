import {
  listProductCategoriesByCodes,
  listProductsByCodes,
} from "@/repositories/master-repository";
import {
  buildCsvFromRows,
  buildWorkbookFromRows,
  parseImportFile,
  type ImportFileSource,
} from "@/services/import-file-service";
import {
  createMaster,
  recordInitialProductPriceHistory,
  recordUpdatedProductPriceHistory,
  updateMaster,
} from "@/services/master-service";
import { logAudit } from "@/services/audit-service";
import { productSchema } from "@/lib/validation/master";

const PRODUCT_IMPORT_HEADERS = [
  "code",
  "sku",
  "name",
  "category_code",
  "unit",
  "purchase_price",
  "selling_price",
  "min_stock",
  "allow_negative_stock",
  "is_active",
  "notes",
  "price_effective_from",
  "price_change_note",
] as const;

const REQUIRED_PRODUCT_IMPORT_HEADERS = [
  "code",
  "name",
  "unit",
  "purchase_price",
  "selling_price",
] as const;

const PRODUCT_IMPORT_TEMPLATE_ROWS = [
  {
    code: "PRD-1001",
    sku: "NPK-50KG",
    name: "Pupuk NPK 50kg",
    category_code: "CAT-001",
    unit: "sak",
    purchase_price: "250000",
    selling_price: "285000",
    min_stock: "10",
    allow_negative_stock: "false",
    is_active: "true",
    notes: "Contoh produk pupuk",
    price_effective_from: "2026-03-22",
    price_change_note: "Harga awal import",
  },
  {
    code: "PRD-1002",
    sku: "HERB-1L",
    name: "Herbisida 1L",
    category_code: "CAT-001",
    unit: "botol",
    purchase_price: "65000",
    selling_price: "79000",
    min_stock: "20",
    allow_negative_stock: "false",
    is_active: "true",
    notes: "Contoh produk herbisida",
    price_effective_from: "2026-03-22",
    price_change_note: "Harga awal import",
  },
] as const;

type DuplicateStrategy = "update_existing" | "skip_existing";

type ProductImportOperation = "create" | "update" | "skip";

type ParsedImportRow = {
  lineNumber: number;
  raw: Record<string, string>;
};

type ProductImportPreviewRow = {
  lineNumber: number;
  code: string;
  name: string;
  categoryCode: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  minStock: number;
  operation: ProductImportOperation;
  status: "valid" | "error" | "skip";
  messages: string[];
  payload?: Record<string, unknown>;
  existingId?: string;
  existingPurchasePrice?: number;
  existingSellingPrice?: number;
};

type ProductImportPreviewResult = {
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    createRows: number;
    updateRows: number;
    skipRows: number;
  };
  rows: ProductImportPreviewRow[];
  missingHeaders: string[];
};

function parseBoolean(value: string | undefined, fallback: boolean) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "ya", "yes", "aktif"].includes(normalized)) return true;
  if (["0", "false", "tidak", "no", "nonaktif"].includes(normalized)) return false;
  return fallback;
}

function parseNumber(value: string | undefined, fallback = 0) {
  const normalized = (value ?? "").trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return fallback;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}

function getPayloadFromRow(
  row: Record<string, string>,
  categoryId?: string,
) {
  return {
    code: row.code?.trim() ?? "",
    sku: row.sku?.trim() ?? "",
    name: row.name?.trim() ?? "",
    categoryId: categoryId ?? "",
    unit: row.unit?.trim() ?? "",
    purchasePrice: parseNumber(row.purchase_price),
    sellingPrice: parseNumber(row.selling_price),
    minStock: parseNumber(row.min_stock, 0),
    allowNegativeStock: parseBoolean(row.allow_negative_stock, false),
    isActive: parseBoolean(row.is_active, true),
    notes: row.notes?.trim() ?? "",
    priceEffectiveFrom: row.price_effective_from?.trim() ?? "",
    priceChangeNote: row.price_change_note?.trim() ?? "",
  };
}

function getPreviewSummary(rows: ProductImportPreviewRow[]) {
  return {
    totalRows: rows.length,
    validRows: rows.filter((row) => row.status === "valid").length,
    errorRows: rows.filter((row) => row.status === "error").length,
    createRows: rows.filter((row) => row.operation === "create" && row.status === "valid").length,
    updateRows: rows.filter((row) => row.operation === "update" && row.status === "valid").length,
    skipRows: rows.filter((row) => row.operation === "skip").length,
  };
}

async function buildPreview(
  source: ImportFileSource,
  duplicateStrategy: DuplicateStrategy,
): Promise<ProductImportPreviewResult> {
  const parsed = (() => {
    const { headers, rows } = parseImportFile(source);
    const missingHeaders = REQUIRED_PRODUCT_IMPORT_HEADERS.filter(
      (header) => !headers.includes(header),
    );

    if (missingHeaders.length) {
      return {
        summary: {
          totalRows: 0,
          validRows: 0,
          errorRows: 0,
          createRows: 0,
          updateRows: 0,
          skipRows: 0,
        },
        rows: [] as ParsedImportRow[],
        missingHeaders,
      };
    }

    return {
      rows,
      missingHeaders: [] as string[],
    };
  })();

  if (parsed.missingHeaders.length) {
    return {
      summary: {
        totalRows: 0,
        validRows: 0,
        errorRows: 0,
        createRows: 0,
        updateRows: 0,
        skipRows: 0,
      },
      rows: [],
      missingHeaders: parsed.missingHeaders,
    };
  }

  const categoryCodes = Array.from(
    new Set(
      parsed.rows
        .map((row) => row.raw.category_code?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const productCodes = Array.from(
    new Set(
      parsed.rows
        .map((row) => row.raw.code?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const [categories, existingProducts] = await Promise.all([
    listProductCategoriesByCodes(categoryCodes),
    listProductsByCodes(productCodes),
  ]);

  const categoryMap = new Map(categories.map((item) => [item.code, item]));
  const productMap = new Map(existingProducts.map((item) => [item.code, item]));
  const seenCodes = new Set<string>();

  const rows = parsed.rows.map((row) => {
    const code = row.raw.code?.trim() ?? "";
    const categoryCode = row.raw.category_code?.trim() ?? "";
    const messages: string[] = [];

    if (!code) {
      messages.push("Kode produk wajib diisi.");
    } else if (seenCodes.has(code)) {
      messages.push("Kode produk duplikat di dalam file import.");
    } else {
      seenCodes.add(code);
    }

    const category = categoryCode ? categoryMap.get(categoryCode) : undefined;
    if (categoryCode && !category) {
      messages.push(`Kategori dengan kode ${categoryCode} tidak ditemukan.`);
    }

    const payload = getPayloadFromRow(row.raw, category?.id);
    const parsedPayload = productSchema.safeParse(payload);
    if (!parsedPayload.success) {
      messages.push(...parsedPayload.error.issues.map((issue) => issue.message));
    }

    const existing = code ? productMap.get(code) : undefined;
    const operation: ProductImportOperation = existing
      ? duplicateStrategy === "skip_existing"
        ? "skip"
        : "update"
      : "create";
    const status: "valid" | "error" | "skip" =
      messages.length > 0 ? "error" : operation === "skip" ? "skip" : "valid";

    return {
      lineNumber: row.lineNumber,
      code,
      name: row.raw.name?.trim() ?? "",
      categoryCode,
      unit: row.raw.unit?.trim() ?? "",
      purchasePrice: Number.isFinite(payload.purchasePrice) ? Number(payload.purchasePrice) : 0,
      sellingPrice: Number.isFinite(payload.sellingPrice) ? Number(payload.sellingPrice) : 0,
      minStock: Number.isFinite(payload.minStock) ? Number(payload.minStock) : 0,
      operation,
      status,
      messages,
      payload: parsedPayload.success ? parsedPayload.data : undefined,
      existingId: existing?.id,
      existingPurchasePrice: existing ? Number(existing.purchasePrice) : undefined,
      existingSellingPrice: existing ? Number(existing.sellingPrice) : undefined,
    } satisfies ProductImportPreviewRow;
  });

  return {
    summary: getPreviewSummary(rows),
    rows,
    missingHeaders: [],
  };
}

export function getProductImportTemplateCsv() {
  return buildCsvFromRows(PRODUCT_IMPORT_HEADERS, PRODUCT_IMPORT_TEMPLATE_ROWS.map((row) => ({ ...row })));
}

export function getProductImportTemplateXlsx() {
  return buildWorkbookFromRows(
    PRODUCT_IMPORT_HEADERS,
    PRODUCT_IMPORT_TEMPLATE_ROWS.map((row) => ({ ...row })),
    "Import Produk",
  );
}

export async function previewProductImport(
  source: string | ImportFileSource,
  duplicateStrategy: DuplicateStrategy = "update_existing",
) {
  return buildPreview(typeof source === "string" ? { csvText: source } : source, duplicateStrategy);
}

export async function applyProductImport(
  source: string | ImportFileSource,
  duplicateStrategy: DuplicateStrategy = "update_existing",
  actorId?: string | null,
) {
  const preview = await buildPreview(
    typeof source === "string" ? { csvText: source } : source,
    duplicateStrategy,
  );

  if (preview.missingHeaders.length) {
    throw new Error(`Header wajib belum lengkap: ${preview.missingHeaders.join(", ")}`);
  }

  const createdIds: string[] = [];
  const updatedIds: string[] = [];
  const skippedCodes: string[] = [];
  const errors: Array<{ lineNumber: number; code: string; message: string }> = [];

  for (const row of preview.rows) {
    if (row.status === "error") {
      errors.push({
        lineNumber: row.lineNumber,
        code: row.code,
        message: row.messages.join(" "),
      });
      continue;
    }

    if (row.operation === "skip") {
      skippedCodes.push(row.code);
      continue;
    }

    const payload = row.payload;
    if (!payload) {
      errors.push({
        lineNumber: row.lineNumber,
        code: row.code,
        message: "Payload validasi tidak tersedia.",
      });
      continue;
    }

    try {
      if (row.operation === "create") {
        const record = await createMaster("products", payload, actorId);
        await recordInitialProductPriceHistory(record.id, payload, actorId);
        createdIds.push(record.id);
      } else if (row.operation === "update" && row.existingId) {
        const existingSnapshot = {
          purchasePrice: row.existingPurchasePrice,
          sellingPrice: row.existingSellingPrice,
        };
        const updated = await updateMaster("products", row.existingId, payload, actorId);
        await recordUpdatedProductPriceHistory(
          updated.id,
          existingSnapshot,
          payload,
          actorId,
        );
        updatedIds.push(updated.id);
      }
    } catch (error) {
      errors.push({
        lineNumber: row.lineNumber,
        code: row.code,
        message: error instanceof Error ? error.message : "Gagal memproses baris import.",
      });
    }
  }

  const result = {
    summary: {
      totalRows: preview.rows.length,
      createdRows: createdIds.length,
      updatedRows: updatedIds.length,
      skippedRows: skippedCodes.length,
      errorRows: errors.length,
    },
    createdIds,
    updatedIds,
    skippedCodes,
    errors,
  };

  await logAudit({
    entityType: "products",
    action: "import",
    actorId,
    metadata: {
      duplicateStrategy,
      ...result.summary,
      skippedCodes,
      errors,
    },
  });

  return result;
}
