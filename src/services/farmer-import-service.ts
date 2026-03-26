import { listFarmersByCodes } from "@/repositories/master-repository";
import { createMaster, updateMaster } from "@/services/master-service";
import { logAudit } from "@/services/audit-service";
import { farmerSchema } from "@/lib/validation/master";
import {
  buildCsvFromRows,
  buildWorkbookFromRows,
  parseImportFile,
  type ImportFileSource,
} from "@/services/import-file-service";

const FARMER_IMPORT_HEADERS = [
  "code",
  "name",
  "phone",
  "address",
  "village",
  "district_or_city",
  "notes",
  "is_active",
] as const;

const REQUIRED_FARMER_IMPORT_HEADERS = ["code", "name"] as const;

const FARMER_IMPORT_TEMPLATE_ROWS = [
  {
    code: "FRM-1001",
    name: "Petani Makmur Jaya",
    phone: "081234567890",
    address: "Dusun Suka Maju, Blok A",
    village: "Suka Maju",
    district_or_city: "Sanggau",
    notes: "Contoh petani pemasok TBS",
    is_active: "true",
  },
  {
    code: "FRM-1002",
    name: "Kelompok Tani Sawit Sejahtera",
    phone: "081298765432",
    address: "Jalan Kebun Sawit 8",
    village: "Karya Baru",
    district_or_city: "Sekadau",
    notes: "Contoh data kelompok tani",
    is_active: "true",
  },
] as const;

type DuplicateStrategy = "update_existing" | "skip_existing";
type FarmerImportOperation = "create" | "update" | "skip";

type ParsedImportRow = {
  lineNumber: number;
  raw: Record<string, string>;
};

type FarmerImportPreviewRow = {
  lineNumber: number;
  code: string;
  name: string;
  phone: string;
  village: string;
  districtOrCity: string;
  operation: FarmerImportOperation;
  status: "valid" | "error" | "skip";
  messages: string[];
  payload?: Record<string, unknown>;
  existingId?: string;
};

type FarmerImportPreviewResult = {
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    createRows: number;
    updateRows: number;
    skipRows: number;
  };
  rows: FarmerImportPreviewRow[];
  missingHeaders: string[];
};

function parseBoolean(value: string | undefined, fallback: boolean) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "ya", "yes", "aktif"].includes(normalized)) return true;
  if (["0", "false", "tidak", "no", "nonaktif"].includes(normalized)) return false;
  return fallback;
}

function getPayloadFromRow(row: Record<string, string>) {
  return {
    code: row.code?.trim() ?? "",
    name: row.name?.trim() ?? "",
    phone: row.phone?.trim() ?? "",
    address: row.address?.trim() ?? "",
    village: row.village?.trim() ?? "",
    districtOrCity: row.district_or_city?.trim() ?? "",
    notes: row.notes?.trim() ?? "",
    isActive: parseBoolean(row.is_active, true),
  };
}

function getPreviewSummary(rows: FarmerImportPreviewRow[]) {
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
): Promise<FarmerImportPreviewResult> {
  const parsed = (() => {
    const { headers, rows } = parseImportFile(source);
    const missingHeaders = REQUIRED_FARMER_IMPORT_HEADERS.filter(
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

  const codes = Array.from(
    new Set(
      parsed.rows
        .map((row) => row.raw.code?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const existingFarmers = await listFarmersByCodes(codes);
  const farmerMap = new Map(existingFarmers.map((item) => [item.code, item]));
  const seenCodes = new Set<string>();

  const rows = parsed.rows.map((row) => {
    const code = row.raw.code?.trim() ?? "";
    const messages: string[] = [];

    if (!code) {
      messages.push("Kode petani wajib diisi.");
    } else if (seenCodes.has(code)) {
      messages.push("Kode petani duplikat di dalam file import.");
    } else {
      seenCodes.add(code);
    }

    const payload = getPayloadFromRow(row.raw);
    const parsedPayload = farmerSchema.safeParse(payload);
    if (!parsedPayload.success) {
      messages.push(...parsedPayload.error.issues.map((issue) => issue.message));
    }

    const existing = code ? farmerMap.get(code) : undefined;
    const operation: FarmerImportOperation = existing
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
      phone: row.raw.phone?.trim() ?? "",
      village: row.raw.village?.trim() ?? "",
      districtOrCity: row.raw.district_or_city?.trim() ?? "",
      operation,
      status,
      messages,
      payload: parsedPayload.success ? parsedPayload.data : undefined,
      existingId: existing?.id,
    } satisfies FarmerImportPreviewRow;
  });

  return {
    summary: getPreviewSummary(rows),
    rows,
    missingHeaders: [],
  };
}

export function getFarmerImportTemplateCsv() {
  return buildCsvFromRows(FARMER_IMPORT_HEADERS, FARMER_IMPORT_TEMPLATE_ROWS.map((row) => ({ ...row })));
}

export function getFarmerImportTemplateXlsx() {
  return buildWorkbookFromRows(
    FARMER_IMPORT_HEADERS,
    FARMER_IMPORT_TEMPLATE_ROWS.map((row) => ({ ...row })),
    "Import Petani",
  );
}

export async function previewFarmerImport(
  source: string | ImportFileSource,
  duplicateStrategy: DuplicateStrategy = "update_existing",
) {
  return buildPreview(typeof source === "string" ? { csvText: source } : source, duplicateStrategy);
}

export async function applyFarmerImport(
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
        const record = await createMaster("farmers", payload, actorId);
        createdIds.push(record.id);
      } else if (row.operation === "update" && row.existingId) {
        const updated = await updateMaster("farmers", row.existingId, payload, actorId);
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
    entityType: "farmers",
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
