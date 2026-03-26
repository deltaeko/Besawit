import { z } from "zod";

import { nonNegativeNumber } from "@/lib/validation/common";

export const stockTakeItemSchema = z.object({
  productId: z.uuid(),
  systemQty: nonNegativeNumber,
  physicalQty: nonNegativeNumber,
  unitCost: nonNegativeNumber.default(0),
  notes: z.string().max(255).optional().or(z.literal("")),
});

export const stockTakeSchema = z.object({
  stockDate: z.string().min(1),
  warehouseId: z.uuid(),
  notes: z.string().max(500).optional().or(z.literal("")),
  items: z.array(stockTakeItemSchema).min(1),
});

export const stockAdjustmentSchema = z
  .object({
    adjustmentDate: z.string().min(1, "Tanggal mutasi wajib diisi."),
    warehouseId: z.uuid("Gudang asal wajib dipilih."),
    targetWarehouseId: z.uuid("Gudang tujuan tidak valid.").optional().or(z.literal("")),
    productId: z.uuid("Produk wajib dipilih."),
    mode: z.enum(["opening_balance", "adjustment_in", "adjustment_out", "transfer"]),
    reason: z.enum(["correction", "damaged", "lost", "transfer", "stock_take", "other"]),
    quantity: nonNegativeNumber.gt(0, "Qty harus lebih besar dari 0."),
    unitCost: nonNegativeNumber.default(0),
    notes: z.string().max(500).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "transfer") {
      if (!value.targetWarehouseId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["targetWarehouseId"],
          message: "Gudang tujuan wajib diisi untuk transfer.",
        });
      }

      if (value.targetWarehouseId && value.targetWarehouseId === value.warehouseId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["targetWarehouseId"],
          message: "Gudang tujuan harus berbeda dengan gudang asal.",
        });
      }
    }
  });
