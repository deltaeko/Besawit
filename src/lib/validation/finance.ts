import { z } from "zod";

export const paymentSchema = z
  .object({
    paymentDate: z.string().min(1, "Tanggal wajib diisi."),
    direction: z.enum(["in", "out"]),
    method: z.enum(["cash", "bank_transfer", "giro", "other"]),
    payableId: z.uuid("Referensi hutang tidak valid.").optional().or(z.literal("")),
    receivableId: z.uuid("Referensi piutang tidak valid.").optional().or(z.literal("")),
    amount: z.coerce.number().gt(0, "Nominal harus lebih besar dari 0."),
    notes: z
      .string()
      .max(500, "Catatan maksimal 500 karakter.")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    const hasPayable = Boolean(value.payableId);
    const hasReceivable = Boolean(value.receivableId);

    if (!hasPayable && !hasReceivable) {
      ctx.addIssue({
        path: ["payableId"],
        code: z.ZodIssueCode.custom,
        message: "Pilih hutang atau piutang yang ingin dicatat.",
      });
    }

    if (hasPayable && hasReceivable) {
      ctx.addIssue({
        path: ["receivableId"],
        code: z.ZodIssueCode.custom,
        message: "Pilih salah satu saja: hutang atau piutang.",
      });
    }
  });
