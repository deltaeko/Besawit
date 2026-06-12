import "dotenv/config";

import { hashSync } from "bcryptjs";
import { eq, sql } from "drizzle-orm";

import { db, pool } from "../src/lib/db/client";
import {
  customers,
  factories,
  farmers,
  productCategories,
  productPriceHistories,
  products,
  roles,
  suppliers,
  tbsDeductionConfigs,
  factoryDeductionDefaults,
  transportPersonnel,
  users,
  vehicles,
  warehouses,
} from "../src/lib/db/schema";
import {
  getPayableList,
  getPaymentList,
  getReceivableList,
  postPayment,
} from "../src/services/finance-service";
import {
  getStockBalanceList,
  getStockTakeList,
  submitStockTake,
} from "../src/services/inventory-service";
import {
  createPalmPurchase,
  createPalmSale,
  getPalmPurchaseList,
} from "../src/services/palm-service";
import {
  createStorePurchaseTx,
  createStoreSaleTx,
  getStorePurchaseList,
  getStoreSaleList,
} from "../src/services/store-service";

async function ensureMasters() {
  await db
    .insert(roles)
    .values([
      { code: "owner", name: "Owner", isSystem: true },
      { code: "admin_sawit", name: "Admin Sawit", isSystem: true },
      { code: "admin_store", name: "Admin Store", isSystem: true },
      { code: "finance", name: "Finance", isSystem: true },
      { code: "supervisor", name: "Supervisor", isSystem: true },
    ])
    .onConflictDoNothing();

  const roleRows = await db.select().from(roles);
  const ownerRole = roleRows.find((item) => item.code === "owner");

  if (!ownerRole) {
    throw new Error("Owner role not found after seed.");
  }

  await db
    .insert(users)
    .values({
      roleId: ownerRole.id,
      fullName: "Besawit Owner",
      email: "owner@besawit.local",
      passwordHash: hashSync("password123", 10),
      phone: "081234567890",
      isActive: true,
    })
    .onConflictDoNothing();

  await db
    .insert(farmers)
    .values({
      code: "FRM-001",
      name: "Petani Makmur",
      phone: "081111111111",
      village: "Balai Sebut",
      districtOrCity: "Sanggau",
      address: "Kebun Sawit Blok A",
      isActive: true,
    })
    .onConflictDoNothing();

  await db
    .insert(factories)
    .values({
      code: "FAC-001",
      name: "Pabrik Sentosa",
      phone: "082222222222",
      city: "Pontianak",
      contactPerson: "Budi Pabrik",
      isActive: true,
    })
    .onConflictDoNothing();

  await db
    .insert(tbsDeductionConfigs)
    .values([
      {
        code: "DED-TRASH",
        name: "Sampah",
        legacyType: "trash",
        defaultInputMode: "percentage",
        description: "Potongan kotoran atau sampah campuran.",
        isActive: true,
      },
      {
        code: "DED-WATER",
        name: "Air",
        legacyType: "water",
        defaultInputMode: "percentage",
        description: "Potongan kadar air berlebih.",
        isActive: true,
      },
      {
        code: "DED-UNRIPE",
        name: "Mentah",
        legacyType: "unripe",
        defaultInputMode: "percentage",
        description: "Potongan buah mentah atau belum memenuhi grading.",
        isActive: true,
      },
      {
        code: "DED-LONGSTALK",
        name: "Tangkai Panjang",
        legacyType: "long_stalk",
        defaultInputMode: "kg",
        description: "Potongan tandan dengan tangkai panjang.",
        isActive: true,
      },
      {
        code: "DED-OTHER",
        name: "Lainnya",
        legacyType: "others",
        defaultInputMode: "nominal",
        description: "Koreksi manual lain dalam bentuk nominal atau berat.",
        isActive: true,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(customers)
    .values({
      code: "CUS-001",
      name: "Toko Tani Sejahtera",
      farmerId: sql`(select id from farmers where code = 'FRM-001' limit 1)`,
      phone: "083333333333",
      city: "Pontianak",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: customers.code,
      set: {
        farmerId: sql`(select id from farmers where code = 'FRM-001' limit 1)`,
      },
    });

  await db
    .insert(suppliers)
    .values({
      code: "SUP-001",
      name: "Distributor Agro",
      phone: "084444444444",
      city: "Pontianak",
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

  const [seedVehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.code, "VEH-001"))
    .limit(1);

  if (seedVehicle) {
    await db
      .insert(transportPersonnel)
      .values([
        {
          code: "TRP-001",
          role: "driver",
          name: "Rudi Driver",
          phone: "085555555555",
          licenseNumber: "SIM-B1-001",
          identityNumber: "317500000001",
          primaryVehicleId: seedVehicle.id,
          notes: "Sopir utama untuk armada TBS.",
          isActive: true,
        },
        {
          code: "TRP-002",
          role: "co_driver",
          name: "Jaya Kernet",
          phone: "085566666666",
          identityNumber: "317500000002",
          primaryVehicleId: seedVehicle.id,
          notes: "Kernet utama yang biasa mendampingi pengiriman.",
          isActive: true,
        },
        {
          code: "TRP-003",
          role: "helper",
          name: "Rian Helper",
          phone: "085577777777",
          identityNumber: "317500000003",
          primaryVehicleId: seedVehicle.id,
          notes: "Helper cadangan untuk bongkar muat.",
          isActive: true,
        },
      ])
      .onConflictDoNothing();
  }

  await db
    .insert(warehouses)
    .values({
      code: "WH-001",
      name: "Gudang Utama",
      address: "Jalan Raya Sawit 10",
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

  const [category] = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.code, "CAT-001"))
    .limit(1);

  if (!category) {
    throw new Error("Category seed failed.");
  }

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

  const seededProducts = await db
    .select()
    .from(products)
    .where(eq(products.categoryId, category.id));

  for (const product of seededProducts) {
    const [existingHistory] = await db
      .select()
      .from(productPriceHistories)
      .where(eq(productPriceHistories.productId, product.id))
      .limit(1);

    if (!existingHistory) {
      await db.insert(productPriceHistories).values({
        productId: product.id,
        effectiveFrom: new Date(),
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        notes: "Harga awal produk dari seed.",
        createdBy: null,
      });
    }
  }
}

async function ensureTransactions() {
  const [owner] = await db
    .select()
    .from(users)
    .where(eq(users.email, "owner@besawit.local"))
    .limit(1);
  const [farmer] = await db.select().from(farmers).where(eq(farmers.code, "FRM-001")).limit(1);
  const [factory] = await db
    .select()
    .from(factories)
    .where(eq(factories.code, "FAC-001"))
    .limit(1);
  const deductionConfigs = await db.select().from(tbsDeductionConfigs);
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.code, "SUP-001"))
    .limit(1);
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.code, "CUS-001"))
    .limit(1);
  const [driver] = await db
    .select()
    .from(transportPersonnel)
    .where(eq(transportPersonnel.code, "TRP-001"))
    .limit(1);
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.code, "VEH-001"))
    .limit(1);
  const [warehouse] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.code, "WH-001"))
    .limit(1);
  const productRows = await db.select().from(products);

  if (!owner || !farmer || !factory || !supplier || !customer || !driver || !vehicle || !warehouse) {
    throw new Error("Missing master data for transactional seed.");
  }

  if (deductionConfigs.length > 0) {
    const configMap = Object.fromEntries(deductionConfigs.map((item) => [item.code, item]));
    const defaults = [
      { code: "DED-TRASH", inputMode: "percentage", defaultValue: "0.50", sortOrder: 1 },
      { code: "DED-WATER", inputMode: "percentage", defaultValue: "0.30", sortOrder: 2 },
      { code: "DED-UNRIPE", inputMode: "percentage", defaultValue: "0.20", sortOrder: 3 },
      { code: "DED-LONGSTALK", inputMode: "kg", defaultValue: "15.00", sortOrder: 4 },
      { code: "DED-OTHER", inputMode: "nominal", defaultValue: "0.00", sortOrder: 5 },
    ] as const;

    await db
      .insert(factoryDeductionDefaults)
      .values(
        defaults
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

  const palmPurchases = await getPalmPurchaseList(1);

  if (palmPurchases.length === 0) {
    const purchase = await createPalmPurchase(
      {
        purchaseDate: new Date().toISOString().slice(0, 10),
        farmerId: farmer.id,
        driverId: driver.id,
        vehicleId: vehicle.id,
        warehouseId: warehouse.id,
        grossWeight: 10000,
        tareWeight: 1800,
        buyingPricePerKg: 2800,
        transportCost: 300000,
        loadingCost: 150000,
        otherCost: 50000,
        notes: "Seeded TBS purchase",
      },
      owner.id,
    );

    await createPalmSale(
      {
        saleDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        referencePurchaseId: purchase.id,
        warehouseId: warehouse.id,
        factoryId: factory.id,
        grossWeight: 9800,
        tareWeight: 1600,
        sellingPricePerKg: 3150,
        deductions: [
          { label: "Sampah", type: "trash", inputMode: "percentage", inputValue: 0.5, notes: "" },
          { label: "Air", type: "water", inputMode: "percentage", inputValue: 0.3, notes: "" },
          { label: "Mentah", type: "unripe", inputMode: "percentage", inputValue: 0.2, notes: "" },
          { label: "Tangkai Panjang", type: "long_stalk", inputMode: "kg", inputValue: 10, notes: "" },
          { label: "Lainnya", type: "others", inputMode: "nominal", inputValue: 25000, notes: "" },
        ],
        returnData: {
          returnWeight: 25,
          returnReason: "Sortasi pabrik",
          actionType: "disposed",
          notes: "",
        },
        notes: "Seeded TBS sale",
      },
      owner.id,
    );
  }

  const [storePurchases, storeSales] = await Promise.all([
    getStorePurchaseList(1),
    getStoreSaleList(1),
  ]);

  if (storePurchases.length === 0 && productRows.length >= 2) {
    await createStorePurchaseTx(
      {
        transactionDate: new Date().toISOString().slice(0, 10),
        supplierId: supplier.id,
        warehouseId: warehouse.id,
        invoiceNumber: "INV-SP-001",
        discount: 50000,
        tax: 0,
        items: [
          { productId: productRows[0].id, quantity: 20, unitPrice: 250000 },
          { productId: productRows[1].id, quantity: 30, unitPrice: 65000 },
        ],
        notes: "Seeded store purchase",
      },
      owner.id,
    );
  }

  if (storeSales.length === 0 && productRows.length >= 2) {
    await createStoreSaleTx(
      {
        transactionDate: new Date().toISOString().slice(0, 10),
        customerId: customer.id,
        warehouseId: warehouse.id,
        invoiceNumber: "INV-SS-001",
        saleType: "credit",
        dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
        discount: 25000,
        tax: 0,
        items: [
          { productId: productRows[0].id, quantity: 3, unitPrice: 285000 },
          { productId: productRows[1].id, quantity: 5, unitPrice: 79000 },
        ],
        notes: "Seeded store sale",
      },
      owner.id,
    );
  }

  const [stockTakes, balances] = await Promise.all([
    getStockTakeList(1),
    getStockBalanceList(100),
  ]);
  if (stockTakes.length === 0 && balances.length > 0) {
    await submitStockTake(
      {
        stockDate: new Date().toISOString().slice(0, 10),
        warehouseId: warehouse.id,
        notes: "Seeded stock take",
        items: balances.slice(0, 2).map((item) => ({
          productId: item.productId,
          systemQty: Number(item.quantity),
          physicalQty: Math.max(Number(item.quantity) - 1, 0),
          unitCost: Number(item.averageCost),
          notes: "",
        })),
      },
      owner.id,
    );
  }

  const [payments, payables, receivables] = await Promise.all([
    getPaymentList(1),
    getPayableList(10),
    getReceivableList(10),
  ]);
  if (payments.length === 0) {
    const payable = payables[0];
    const receivable = receivables[0];

    if (payable) {
      await postPayment(
        {
          paymentDate: new Date().toISOString().slice(0, 10),
          direction: "out",
          method: "cash",
          payableId: payable.id,
          receivableId: "",
          amount: Math.min(Number(payable.outstandingAmount), 1000000),
          notes: "Seeded payable payment",
        },
        owner.id,
      );
    }

    if (receivable) {
      await postPayment(
        {
          paymentDate: new Date().toISOString().slice(0, 10),
          direction: "in",
          method: "bank_transfer",
          payableId: "",
          receivableId: receivable.id,
          amount: Math.min(Number(receivable.outstandingAmount), 500000),
          notes: "Seeded receivable collection",
        },
        owner.id,
      );
    }
  }
}

async function main() {
  await ensureMasters();
  await ensureTransactions();
  console.log("Besawit seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
