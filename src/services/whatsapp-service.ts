import { db } from "@/lib/db/client";
import { whatsappLogs } from "@/lib/db/schema";

export async function sendManualWhatsapp(input: {
  referenceType:
    | "tbs_purchase"
    | "tbs_sale"
    | "store_purchase"
    | "store_sale"
    | "stock_take"
    | "payment"
    | "manual";
  referenceId: string;
  destination: string;
  message: string;
  sentBy?: string | null;
}) {
  const [row] = await db
    .insert(whatsappLogs)
    .values({
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      destination: input.destination,
      message: input.message,
      sentBy: input.sentBy ?? null,
      provider: "manual",
      status: "sent",
      sentAt: new Date(),
      payload: {
        mode: "manual",
      },
    })
    .returning();

  return {
    ...row,
    providerResponse: "Manual dispatch logged successfully.",
  };
}
