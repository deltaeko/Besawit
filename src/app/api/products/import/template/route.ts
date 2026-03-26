import {
  getProductImportTemplateCsv,
  getProductImportTemplateXlsx,
} from "@/services/product-import-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  if (format === "csv") {
    const csv = getProductImportTemplateCsv();

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="template-import-produk.csv"',
        "Cache-Control": "no-store",
      },
    });
  }

  const workbook = getProductImportTemplateXlsx();

  return new Response(new Uint8Array(workbook), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-produk.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
