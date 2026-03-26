import {
  getFarmerImportTemplateCsv,
  getFarmerImportTemplateXlsx,
} from "@/services/farmer-import-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  if (format === "csv") {
    const csv = getFarmerImportTemplateCsv();

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="template-import-petani.csv"',
        "Cache-Control": "no-store",
      },
    });
  }

  const workbook = getFarmerImportTemplateXlsx();

  return new Response(new Uint8Array(workbook), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-petani.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
