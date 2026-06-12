import { getDb } from "@/lib/db/client";
import { documentLogs } from "@/lib/db/schema";

export async function logDocumentPrint(input: {
  documentType:
    | "payable_statement"
    | "receivable_statement"
    | "payment_receipt"
    | "store_invoice"
    | "stock_take_report";
  referenceType:
    | "tbs_purchase"
    | "tbs_sale"
    | "store_purchase"
    | "store_sale"
    | "stock_take"
    | "payment"
    | "manual";
  referenceId: string;
  fileName?: string;
  fileUrl?: string;
  printedBy?: string | null;
  payload?: unknown;
}) {
  const db = await getDb();
  const [row] = await db
    .insert(documentLogs)
    .values({
      documentType: input.documentType,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      fileName: input.fileName ?? null,
      fileUrl: input.fileUrl ?? null,
      payload: input.payload ?? null,
      printedBy: input.printedBy ?? null,
      status: "sent",
    })
    .returning();

  return row;
}
