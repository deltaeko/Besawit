import { hashSync } from "bcryptjs";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { getDefaultPermissionsForRole } from "@/lib/auth/permissions";
import {
  brandingSettings,
  customers,
  factories,
  factoryDeductionDefaults,
  farmers,
  productCategories,
  productPriceHistories,
  products,
  roles,
  suppliers,
  tbsDeductionConfigs,
  transportPersonnel,
  users,
  vehicles,
  warehouses,
} from "@/lib/db/schema";

type TenantSeedInput = {
  companyName: string;
  ownerEmail: string;
  ownerFullName: string;
  ownerPassword: string;
};

const systemRoles = [
  { code: "owner", name: "Owner" },
  { code: "admin_sawit", name: "Admin Sawit" },
  { code: "admin_store", name: "Admin Store" },
  { code: "finance", name: "Finance" },
  { code: "supervisor", name: "Supervisor" },
] as const;

const defaultDeductions = [
  {
    code: "DED-TRASH",
    name: "Sampah",
    legacyType: "trash",
    defaultInputMode: "percentage",
    description: "Potongan kotoran atau sampah campuran.",
  },
  {
    code: "DED-WATER",
    name: "Air",
    legacyType: "water",
    defaultInputMode: "percentage",
    description: "Potongan kadar air berlebih.",
  },
  {
    code: "DED-UNRIPE",
    name: "Mentah",
    legacyType: "unripe",
    defaultInputMode: "percentage",
    description: "Potongan buah mentah atau belum memenuhi grading.",
  },
  {
    code: "DED-LONGSTALK",
    name: "Tangkai Panjang",
    legacyType: "long_stalk",
    defaultInputMode: "kg",
    description: "Potongan tandan dengan tangkai panjang.",
  },
  {
    code: "DED-OTHER",
    name: "Lainnya",
    legacyType: "others",
    defaultInputMode: "nominal",
    description: "Koreksi manual lain dalam bentuk nominal atau berat.",
  },
] as const;

type TenantDb = NodePgDatabase<
  typeof import("@/lib/db/schema")
>;

export async function seedTenantDatabase(db: TenantDb, input: TenantSeedInput) {
  await db
    .insert(brandingSettings)
    .values({
      scope: "default",
      companyName: input.companyName,
      appDisplayName: input.companyName,
      tagline: "Operasional sawit, stok, toko, dan finance untuk satu usaha.",
      primaryColor: "#1f3b23",
      accentColor: "#e0f46e",
      supportPhone: null,
      supportEmail: input.ownerEmail,
    })
    .onConflictDoNothing();

  await db
    .insert(roles)
    .values(
      systemRoles.map((role) => ({
        code: role.code,
        name: role.name,
        permissions: getDefaultPermissionsForRole(role.code),
        isSystem: true,
      })),
    )
    .onConflictDoNothing();

  const roleRows = await db.select().from(roles);
  const ownerRole = roleRows.find((role) => role.code === "owner");

  if (!ownerRole) {
    throw new Error("Owner role not found after tenant seed.");
  }

  await db
    .insert(users)
    .values({
      roleId: ownerRole.id,
      fullName: input.ownerFullName,
      email: input.ownerEmail,
      passwordHash: hashSync(input.ownerPassword, 10),
      phone: null,
      isActive: true,
    })
    .onConflictDoNothing();

  await db
    .insert(farmers)
    .values({
      code: "FRM-001",
      name: "Petani Demo",
      phone: "081111111111",
      village: "Kebun Inti",
      districtOrCity: "Sanggau",
      address: "Contoh data petani untuk trial Besawit.",
      isActive: true,
    })
    .onConflictDoNothing();

  await db
    .insert(factories)
    .values({
      code: "FAC-001",
      name: "Pabrik Demo",
      phone: "082222222222",
      city: "Pontianak",
      contactPerson: "Admin Pabrik",
      isActive: true,
    })
    .onConflictDoNothing();

  await db
    .insert(suppliers)
    .values({
      code: "SUP-001",
      name: "Supplier Demo",
      phone: "083333333333",
      city: "Pontianak",
      isActive: true,
    })
    .onConflictDoNothing();

  await db
    .insert(warehouses)
    .values({
      code: "WH-001",
      name: "Gudang Utama",
      address: "Gudang demo untuk trial.",
      isActive: true,
    })
    .onConflictDoNothing();

  await db
    .insert(productCategories)
    .values({
      code: "CAT-001",
      name: "Pupuk",
      isActive: true,
    })
    .onConflictDoNothing();

  await db
    .insert(vehicles)
    .values({
      code: "VEH-001",
      plateNumber: "KB 1234 AW",
      type: "Truk Colt Diesel",
      capacityKg: "8000.00",
      isActive: true,
    })
    .onConflictDoNothing();

  const [category, farmer, vehicle, factory] = await Promise.all([
    db
      .select()
      .from(productCategories)
      .where(eq(productCategories.code, "CAT-001"))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select()
      .from(farmers)
      .where(eq(farmers.code, "FRM-001"))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select()
      .from(vehicles)
      .where(eq(vehicles.code, "VEH-001"))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select()
      .from(factories)
      .where(eq(factories.code, "FAC-001"))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  if (farmer) {
    await db
      .insert(customers)
      .values({
        code: "CUS-001",
        name: "Toko Demo",
        farmerId: farmer.id,
        phone: "084444444444",
        city: "Pontianak",
        isActive: true,
      })
      .onConflictDoNothing();
  }

  if (vehicle) {
    await db
      .insert(transportPersonnel)
      .values({
        code: "TRP-001",
        role: "driver",
        name: "Driver Demo",
        phone: "085555555555",
        licenseNumber: "SIM-B1-DEMO",
        identityNumber: "317500000001",
        primaryVehicleId: vehicle.id,
        notes: "Armada contoh untuk trial.",
        isActive: true,
      })
      .onConflictDoNothing();
  }

  await db
    .insert(tbsDeductionConfigs)
    .values(
      defaultDeductions.map((item) => ({
        ...item,
        isActive: true,
      })),
    )
    .onConflictDoNothing();

  if (category) {
    await db
      .insert(products)
      .values([
        {
          categoryId: category.id,
          code: "PRD-001",
          name: "Pupuk NPK 50kg",
          unit: "sak",
          purchasePrice: "250000.00",
          sellingPrice: "285000.00",
          minStock: "10.00",
          isActive: true,
        },
        {
          categoryId: category.id,
          code: "PRD-002",
          name: "Herbisida 1L",
          unit: "botol",
          purchasePrice: "65000.00",
          sellingPrice: "79000.00",
          minStock: "20.00",
          isActive: true,
        },
        {
          categoryId: null,
          code: "SYS-TBS-POOL",
          name: "TBS Pool",
          unit: "kg",
          purchasePrice: "0.00",
          sellingPrice: "0.00",
          minStock: "0.00",
          notes: "Produk internal sistem untuk pooled stock TBS.",
          isActive: false,
        },
      ])
      .onConflictDoNothing();
  }

  const seededProducts = await db.select().from(products);
  for (const product of seededProducts) {
    const [history] = await db
      .select()
      .from(productPriceHistories)
      .where(eq(productPriceHistories.productId, product.id))
      .limit(1);

    if (!history) {
      await db.insert(productPriceHistories).values({
        productId: product.id,
        effectiveFrom: new Date(),
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        notes: "Harga awal produk dari seed trial.",
        createdBy: null,
      });
    }
  }

  if (factory) {
    const deductionRows = await db.select().from(tbsDeductionConfigs);
    const configMap = Object.fromEntries(
      deductionRows.map((item) => [item.code, item]),
    );

    await db
      .insert(factoryDeductionDefaults)
      .values(
        [
          { code: "DED-TRASH", inputMode: "percentage", defaultValue: "0.50", sortOrder: 1 },
          { code: "DED-WATER", inputMode: "percentage", defaultValue: "0.30", sortOrder: 2 },
          { code: "DED-UNRIPE", inputMode: "percentage", defaultValue: "0.20", sortOrder: 3 },
          { code: "DED-LONGSTALK", inputMode: "kg", defaultValue: "15.00", sortOrder: 4 },
          { code: "DED-OTHER", inputMode: "nominal", defaultValue: "0.00", sortOrder: 5 },
        ]
          .map((item) => {
            const config = configMap[item.code];
            if (!config) return null;

            return {
              factoryId: factory.id,
              deductionConfigId: config.id,
              inputMode: item.inputMode,
              defaultValue: item.defaultValue,
              sortOrder: item.sortOrder,
              isActive: true,
            };
          })
          .filter(Boolean) as typeof factoryDeductionDefaults.$inferInsert[],
      )
      .onConflictDoNothing();
  }
}
