import { z } from "zod";

import type { MasterEntityKey } from "@/types/domain";

const phoneRegex = /^[0-9+\-\s().]{8,20}$/;

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined));

const requiredText = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

export const masterListQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  sort: z.enum(["latest", "oldest", "code_asc", "name_asc"]).default("latest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
});

export const farmerSchema = z.object({
  code: requiredText(2, 50),
  name: requiredText(2, 150),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || phoneRegex.test(value), {
      message: "Nomor telepon tidak valid.",
    })
    .transform((value) => (value ? value : undefined)),
  address: optionalText(500),
  village: optionalText(120),
  districtOrCity: optionalText(120),
  notes: optionalText(500),
  isActive: z.coerce.boolean().default(true),
});

export const factorySchema = z.object({
  code: requiredText(2, 50),
  name: requiredText(2, 150),
  phone: optionalText(30),
  email: z.email().optional().or(z.literal("")).transform((value) => value || undefined),
  address: optionalText(500),
  city: optionalText(120),
  contactPerson: optionalText(120),
  notes: optionalText(500),
  isActive: z.coerce.boolean().default(true),
});

export const customerSchema = factorySchema.extend({
  farmerId: z
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  isFarmer: z.coerce.boolean().optional().default(false),
});
export const supplierSchema = factorySchema;

export const transportPersonnelSchema = z.object({
  code: requiredText(2, 50),
  role: z.enum(["driver", "co_driver", "helper"]),
  name: requiredText(2, 150),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || phoneRegex.test(value), {
      message: "Nomor HP tidak valid.",
    })
    .transform((value) => (value ? value : undefined)),
  licenseNumber: optionalText(100),
  identityNumber: optionalText(100),
  primaryVehicleId: z
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  notes: optionalText(500),
  isActive: z.coerce.boolean().default(true),
});

export const vehicleSchema = z.object({
  code: requiredText(2, 50),
  plateNumber: requiredText(2, 50),
  type: optionalText(100),
  capacityKg: z.coerce.number().min(0).default(0),
  notes: optionalText(500),
  isActive: z.coerce.boolean().default(true),
});

export const warehouseSchema = z.object({
  code: requiredText(2, 50),
  name: requiredText(2, 150),
  address: optionalText(500),
  notes: optionalText(500),
  isActive: z.coerce.boolean().default(true),
});

export const categorySchema = z.object({
  code: requiredText(2, 50),
  name: requiredText(2, 150),
  description: optionalText(500),
  isActive: z.coerce.boolean().default(true),
});

export const productSchema = z.object({
  categoryId: z.uuid().optional().or(z.literal("")).transform((value) => value || undefined),
  code: requiredText(2, 50),
  sku: optionalText(80),
  name: requiredText(2, 150),
  unit: requiredText(1, 30),
  purchasePrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  priceEffectiveFrom: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  priceChangeNote: optionalText(500),
  minStock: z.coerce.number().min(0).default(0),
  allowNegativeStock: z.coerce.boolean().default(false),
  notes: optionalText(500),
  isActive: z.coerce.boolean().default(true),
});

export const productPriceChangeSchema = z.object({
  effectiveFrom: z.string().trim().min(1, "Tanggal berlaku wajib diisi."),
  purchasePrice: z.coerce.number().min(0, "Harga beli tidak boleh negatif."),
  sellingPrice: z.coerce.number().min(0, "Harga jual tidak boleh negatif."),
  note: optionalText(500),
});

export const userSchema = z.object({
  roleId: z.uuid(),
  fullName: requiredText(2, 150),
  email: z.email(),
  phone: optionalText(30),
  password: z.string().min(6).optional().or(z.literal("")).transform((value) => value || undefined),
  isActive: z.coerce.boolean().default(true),
});

export const roleSchema = z.object({
  code: requiredText(2, 50),
  name: requiredText(2, 100),
  description: optionalText(500),
  permissions: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  isSystem: z.coerce.boolean().default(false),
});

export const masterEntityPayloadSchemas: Record<MasterEntityKey, z.ZodTypeAny> = {
  farmers: farmerSchema,
  factories: factorySchema,
  customers: customerSchema,
  suppliers: supplierSchema,
  "transport-personnel": transportPersonnelSchema,
  vehicles: vehicleSchema,
  warehouses: warehouseSchema,
  products: productSchema,
  categories: categorySchema,
  users: userSchema,
  roles: roleSchema,
};

export function getMasterEntitySchema(entity: MasterEntityKey) {
  return masterEntityPayloadSchemas[entity];
}
