import { z } from "zod";

const optionalText = (maxLength: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    },
    z.string().max(maxLength).optional(),
  );

export const convertTrialToPaidSchema = z.object({
  planName: z.string().trim().min(2).max(80),
  billingCycle: z.enum([
    "monthly",
    "quarterly",
    "semiannual",
    "annual",
    "custom",
  ]),
  contractAmount: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }
      return value;
    },
    z.coerce.number().finite().min(0).optional(),
  ),
  currency: z
    .string()
    .trim()
    .min(3)
    .max(3)
    .transform((value) => value.toUpperCase()),
  paidUntil: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    },
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  ),
  salesNotes: optionalText(1000),
});

export type ConvertTrialToPaidInput = z.infer<typeof convertTrialToPaidSchema>;
