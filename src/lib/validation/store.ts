import { z } from "zod";

import { nonNegativeNumber, positiveNumber } from "@/lib/validation/common";

export const storeItemSchema = z.object({
  productId: z.uuid(),
  quantity: positiveNumber,
  unitPrice: positiveNumber,
});

export const storePurchaseSchema = z.object({
  transactionDate: z.string().min(1),
  supplierId: z.uuid(),
  warehouseId: z.uuid(),
  invoiceNumber: z.string().max(100).optional().or(z.literal("")),
  discount: nonNegativeNumber.default(0),
  tax: nonNegativeNumber.default(0),
  items: z.array(storeItemSchema).min(1),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const storeSaleSchema = z.object({
  transactionDate: z.string().min(1),
  customerId: z.uuid().optional().or(z.literal("")),
  warehouseId: z.uuid(),
  invoiceNumber: z.string().max(100).optional().or(z.literal("")),
  saleType: z.enum(["cash", "credit"]),
  discount: nonNegativeNumber.default(0),
  tax: nonNegativeNumber.default(0),
  items: z.array(storeItemSchema).min(1),
  notes: z.string().max(500).optional().or(z.literal("")),
}).superRefine((value, ctx) => {
  const hasCustomer = Boolean(value.customerId && value.customerId !== "");
  if (value.saleType === "credit" && !hasCustomer) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customerId"],
      message: "Pelanggan wajib diisi untuk penjualan kredit.",
    });
  }
});
