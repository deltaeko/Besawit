import * as XLSX from "xlsx";

export type ImportFileSource = {
  csvText?: string;
  fileName?: string;
  fileBuffer?: ArrayBuffer | Buffer | Uint8Array;
};

function toUint8Array(input: ArrayBuffer | Buffer | Uint8Array) {
  if (input instanceof Uint8Array) {
    return input;
  }

  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }

  return new Uint8Array(input);
}

function escapeCsvCell(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }

  return value;
}

export function buildCsvFromRows(headers: readonly string[], rows: Array<Record<string, string>>) {
  const headerLine = headers.join(",");
  const lines = rows.map((row) =>
    headers.map((header) => escapeCsvCell(row[header] ?? "")).join(","),
  );

  return `\uFEFF${[headerLine, ...lines].join("\n")}`;
}

export function buildWorkbookFromRows(
  headers: readonly string[],
  rows: Array<Record<string, string>>,
  sheetName: string,
) {
  const worksheet = XLSX.utils.aoa_to_sheet([
    [...headers],
    ...rows.map((row) => headers.map((header) => row[header] ?? "")),
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function parseCsvRows(text: string) {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        currentCell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((item) => item !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some((item) => item !== "")) {
    rows.push(currentRow);
  }

  return rows;
}

export function normalizeImportHeader(value: string) {
  return value.trim().toLowerCase();
}

export function parseRowsToObjects(rows: string[][]) {
  if (!rows.length) {
    throw new Error("File import kosong.");
  }

  const [headerRow, ...dataRows] = rows;
  const normalizedHeaders = headerRow.map((header) => normalizeImportHeader(String(header ?? "")));

  return {
    headers: normalizedHeaders,
    rows: dataRows.map((values, index) => ({
      lineNumber: index + 2,
      raw: normalizedHeaders.reduce<Record<string, string>>((acc, header, headerIndex) => {
        acc[header] = String(values[headerIndex] ?? "").trim();
        return acc;
      }, {}),
    })),
  };
}

export function parseWorkbookRows(fileBuffer: ArrayBuffer | Buffer | Uint8Array) {
  const workbook = XLSX.read(toUint8Array(fileBuffer), { type: "buffer", cellDates: false });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("File Excel tidak memiliki sheet data.");
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });

  return rows.map((row) => row.map((value) => String(value ?? "").trim()));
}

export function parseImportFile(source: ImportFileSource) {
  if (source.fileBuffer) {
    const lowerFileName = source.fileName?.toLowerCase() ?? "";

    if (lowerFileName.endsWith(".xlsx") || lowerFileName.endsWith(".xls")) {
      return parseRowsToObjects(parseWorkbookRows(source.fileBuffer));
    }

    if (lowerFileName.endsWith(".csv")) {
      const text = Buffer.from(toUint8Array(source.fileBuffer)).toString("utf8");
      return parseRowsToObjects(parseCsvRows(text));
    }

    throw new Error("Format file belum didukung. Gunakan Excel (.xlsx) atau CSV.");
  }

  if (source.csvText?.trim()) {
    return parseRowsToObjects(parseCsvRows(source.csvText));
  }

  throw new Error("File import belum dipilih atau masih kosong.");
}
