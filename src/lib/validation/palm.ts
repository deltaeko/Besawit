import { z } from "zod";

import { nonNegativeNumber, positiveNumber } from "@/lib/validation/common";

function requiredUuidField(requiredMessage: string, invalidMessage: string) {
  return z
    .string()
    .min(1, requiredMessage)
    .uuid(invalidMessage);
}

function optionalUuidField(invalidMessage: string) {
  return z.union([z.literal(""), z.string().uuid(invalidMessage)]).optional();
}

function friendlyNonNegative(message: string) {
  return z.coerce.number().min(0, message);
}

function friendlyPositive(message: string) {
  return z.coerce.number().gt(0, message);
}

export const palmPurchaseSchema = z
  .object({
    purchaseDate: z.string().min(1, "Tanggal wajib diisi."),
    farmerId: requiredUuidField("Petani wajib diisi.", "Petani tidak valid."),
    driverId: optionalUuidField("Sopir tidak valid."),
    vehicleId: optionalUuidField("Kendaraan tidak valid."),
    warehouseId: optionalUuidField("Gudang tidak valid."),
    grossWeight: friendlyPositive("Berat kotor harus lebih besar dari 0."),
    tareWeight: friendlyNonNegative("Berat tara tidak boleh negatif."),
    buyingPricePerKg: friendlyPositive("Harga beli harus lebih besar dari 0."),
    transportCost: friendlyNonNegative("Biaya angkut tidak boleh negatif.").default(0),
    loadingCost: friendlyNonNegative("Biaya bongkar tidak boleh negatif.").default(0),
    otherCost: friendlyNonNegative("Biaya lain tidak boleh negatif.").default(0),
    storeDebtDeductionMode: z.enum(["none", "value", "percentage"]).default("none"),
    storeDebtDeductionValue: friendlyNonNegative(
      "Potongan hutang toko tidak boleh negatif.",
    ).default(0),
    storeDebtDeductionPercent: z.coerce
      .number()
      .min(0, "Persen potongan tidak boleh negatif.")
      .max(100, "Persen potongan tidak boleh lebih dari 100.")
      .default(0),
    storeDebtDeductionNotes: z
      .string()
      .max(500, "Catatan potongan maksimal 500 karakter.")
      .optional()
      .or(z.literal("")),
    notes: z
      .string()
      .max(500, "Catatan maksimal 500 karakter.")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.tareWeight > value.grossWeight) {
      ctx.addIssue({
        path: ["tareWeight"],
        code: z.ZodIssueCode.custom,
        message: "Berat kotor harus lebih besar atau sama dengan berat tara.",
      });
    }

    if (value.storeDebtDeductionMode === "value" && value.storeDebtDeductionValue <= 0) {
      ctx.addIssue({
        path: ["storeDebtDeductionValue"],
        code: z.ZodIssueCode.custom,
        message: "Nominal potongan harus lebih besar dari 0.",
      });
    }

    if (
      value.storeDebtDeductionMode === "percentage" &&
      value.storeDebtDeductionPercent <= 0
    ) {
      ctx.addIssue({
        path: ["storeDebtDeductionPercent"],
        code: z.ZodIssueCode.custom,
        message: "Persen potongan harus lebih besar dari 0.",
      });
    }
  });

export const palmSaleDeductionSchema = z.object({
  type: z.enum(["trash", "water", "sand_mud", "fronds", "others"]),
  weight: nonNegativeNumber,
  notes: z.string().max(255).optional().or(z.literal("")),
});

export const palmSaleFlexibleDeductionSchema = z.object({
  configId: z.string().uuid().optional().or(z.literal("")),
  type: z
    .enum(["trash", "water", "sand_mud", "fronds", "unripe", "long_stalk", "others"])
    .optional(),
  label: z.string().min(1).max(150),
  inputMode: z.enum(["kg", "percentage", "nominal"]),
  inputValue: nonNegativeNumber,
  notes: z.string().max(255).optional().or(z.literal("")),
});

export const normalizedPalmSaleDeductionSchema = z.union([
  palmSaleFlexibleDeductionSchema,
  palmSaleDeductionSchema.transform((value) => ({
    configId: "",
    type: value.type,
    label:
      value.type === "trash"
        ? "Sampah"
        : value.type === "water"
          ? "Air"
          : value.type === "sand_mud"
            ? "Pasir/Lumpur"
            : value.type === "fronds"
              ? "Pelepah/Tangkai"
              : "Lainnya",
    inputMode: "kg" as const,
    inputValue: value.weight,
    notes: value.notes ?? "",
  })),
]);

export const palmSaleReturnSchema = z.object({
  returnWeight: nonNegativeNumber.default(0),
  returnReason: z.string().max(255).default(""),
  actionType: z.enum(["disposed", "resold", "returned_to_farmer"]).default(
    "disposed",
  ),
  notes: z.string().max(255).optional().or(z.literal("")),
});

export const palmSaleSchema = z
  .object({
    saleDate: z.string().min(1),
    referencePurchaseId: z.uuid(),
    factoryId: z.uuid(),
    grossWeight: positiveNumber,
    tareWeight: nonNegativeNumber,
    sellingPricePerKg: positiveNumber,
    deductions: z.array(normalizedPalmSaleDeductionSchema).default([]),
    returnData: palmSaleReturnSchema,
    notes: z.string().max(500).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    const netWeightInitial = value.grossWeight - value.tareWeight;
    const totalDeduction = value.deductions.reduce(
      (total, item) =>
        total +
        (item.inputMode === "kg"
          ? item.inputValue
          : item.inputMode === "percentage"
            ? (netWeightInitial * item.inputValue) / 100
            : 0),
      0,
    );
    const netAfterDeduction = netWeightInitial - totalDeduction;
    const totalNominalDeduction = value.deductions.reduce(
      (total, item) => total + (item.inputMode === "nominal" ? item.inputValue : 0),
      0,
    );
    const grossSalesAmount =
      Math.max(netAfterDeduction - value.returnData.returnWeight, 0) * value.sellingPricePerKg;

    if (totalDeduction > netWeightInitial) {
      ctx.addIssue({
        path: ["deductions"],
        code: z.ZodIssueCode.custom,
        message: "Total potongan berbasis berat tidak boleh melebihi berat bersih awal.",
      });
    }

    if (value.returnData.returnWeight > netAfterDeduction) {
      ctx.addIssue({
        path: ["returnData", "returnWeight"],
        code: z.ZodIssueCode.custom,
        message: "Berat retur tidak boleh melebihi berat setelah potongan.",
      });
    }

    if (totalNominalDeduction > grossSalesAmount) {
      ctx.addIssue({
        path: ["deductions"],
        code: z.ZodIssueCode.custom,
        message: "Total potongan nominal tidak boleh melebihi nilai bruto penjualan.",
      });
    }
  });
