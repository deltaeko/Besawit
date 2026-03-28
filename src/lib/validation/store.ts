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

export const storePurchaseReturnItemSchema = z.object({
  purchaseItemId: z.uuid(),
  quantity: nonNegativeNumber.default(0),
});

export const storePurchaseReturnSchema = z.object({
  returnDate: z.string().min(1),
  notes: z.string().max(500).optional().or(z.literal("")),
  items: z.array(storePurchaseReturnItemSchema).min(1),
}).superRefine((value, ctx) => {
  const selectedItems = value.items.filter((item) => item.quantity > 0);

  if (!selectedItems.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["items"],
      message: "Minimal satu item retur harus memiliki qty lebih dari 0.",
    });
  }
});

export const storeSaleSchema = z.object({
  transactionDate: z.string().min(1),
  customerId: z.uuid().optional().or(z.literal("")),
  warehouseId: z.uuid(),
  invoiceNumber: z.string().max(100).optional().or(z.literal("")),
  saleType: z.enum(["cash", "credit"]),
  dueDate: z.string().optional().or(z.literal("")),
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

  if (value.saleType === "credit" && !value.dueDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dueDate"],
      message: "Tanggal jatuh tempo wajib diisi untuk penjualan kredit.",
    });
  }
});
