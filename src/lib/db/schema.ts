import {
  boolean,
  integer,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const recordStatusEnum = pgEnum("record_status", [
  "active",
  "cancelled",
  "void",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "partial",
  "paid",
  "overdue",
  "cancelled",
]);
export const transportPersonnelRoleEnum = pgEnum("transport_personnel_role", [
  "driver",
  "co_driver",
  "helper",
]);
export const saleTypeEnum = pgEnum("sale_type", ["cash", "credit"]);
export const movementTypeEnum = pgEnum("movement_type", [
  "opening_balance",
  "purchase_in",
  "sales_out",
  "adjustment_in",
  "adjustment_out",
  "transfer_in",
  "transfer_out",
]);
export const stockMutationReasonEnum = pgEnum("stock_mutation_reason", [
  "correction",
  "damaged",
  "lost",
  "transfer",
  "stock_take",
  "other",
]);
export const referenceTypeEnum = pgEnum("reference_type", [
  "tbs_purchase",
  "tbs_sale",
  "store_purchase",
  "store_sale",
  "stock_take",
  "stock_adjustment",
  "payment",
  "manual",
]);
export const stockTakeStatusEnum = pgEnum("stock_take_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
]);
export const adjustmentStatusEnum = pgEnum("adjustment_status", [
  "pending",
  "approved",
  "cancelled",
]);
export const deductionTypeEnum = pgEnum("deduction_type", [
  "trash",
  "water",
  "sand_mud",
  "fronds",
  "unripe",
  "long_stalk",
  "others",
]);
export const deductionInputModeEnum = pgEnum("deduction_input_mode", [
  "kg",
  "percentage",
  "nominal",
]);
export const settlementInputModeEnum = pgEnum("settlement_input_mode", [
  "value",
  "percentage",
]);
export const returnActionEnum = pgEnum("return_action_type", [
  "disposed",
  "resold",
  "returned_to_farmer",
]);
export const payablePartyTypeEnum = pgEnum("payable_party_type", [
  "farmer",
  "supplier",
  "other",
]);
export const receivablePartyTypeEnum = pgEnum("receivable_party_type", [
  "factory",
  "customer",
  "other",
]);
export const financeSourceTypeEnum = pgEnum("finance_source_type", [
  "tbs_purchase",
  "tbs_sale",
  "store_purchase",
  "store_sale",
  "manual",
]);
export const paymentDirectionEnum = pgEnum("payment_direction", [
  "in",
  "out",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "bank_transfer",
  "giro",
  "other",
]);
export const cashTransactionTypeEnum = pgEnum("cash_transaction_type", [
  "debit",
  "credit",
]);
export const documentTypeEnum = pgEnum("document_type", [
  "payable_statement",
  "receivable_statement",
  "payment_receipt",
  "store_invoice",
  "stock_take_report",
]);
export const sendStatusEnum = pgEnum("send_status", [
  "pending",
  "sent",
  "failed",
]);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    permissions: jsonb("permissions").$type<Record<string, boolean>>(),
    isSystem: boolean("is_system").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("roles_code_idx").on(table.code),
    uniqueIndex("roles_name_idx").on(table.name),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roleId: uuid("role_id")
      .references(() => roles.id)
      .notNull(),
    fullName: varchar("full_name", { length: 150 }).notNull(),
    email: varchar("email", { length: 150 }).notNull(),
    phone: varchar("phone", { length: 30 }),
    passwordHash: text("password_hash").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    index("users_role_id_idx").on(table.roleId),
  ],
);

export const farmers = pgTable(
  "farmers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    phone: varchar("phone", { length: 30 }),
    address: text("address"),
    village: varchar("village", { length: 120 }),
    districtOrCity: varchar("district_or_city", { length: 120 }),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("farmers_code_idx").on(table.code)],
);

export const factories = pgTable(
  "factories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    phone: varchar("phone", { length: 30 }),
    email: varchar("email", { length: 150 }),
    address: text("address"),
    city: varchar("city", { length: 120 }),
    contactPerson: varchar("contact_person", { length: 120 }),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("factories_code_idx").on(table.code)],
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    farmerId: uuid("farmer_id").references(() => farmers.id),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    phone: varchar("phone", { length: 30 }),
    email: varchar("email", { length: 150 }),
    address: text("address"),
    city: varchar("city", { length: 120 }),
    contactPerson: varchar("contact_person", { length: 120 }),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("customers_code_idx").on(table.code),
    index("customers_farmer_id_idx").on(table.farmerId),
  ],
);

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    phone: varchar("phone", { length: 30 }),
    email: varchar("email", { length: 150 }),
    address: text("address"),
    city: varchar("city", { length: 120 }),
    contactPerson: varchar("contact_person", { length: 120 }),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("suppliers_code_idx").on(table.code)],
);

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    plateNumber: varchar("plate_number", { length: 50 }).notNull(),
    type: varchar("type", { length: 100 }),
    capacityKg: numeric("capacity_kg", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("vehicles_code_idx").on(table.code),
    uniqueIndex("vehicles_plate_number_idx").on(table.plateNumber),
  ],
);

export const transportPersonnel = pgTable(
  "transport_personnel",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    role: transportPersonnelRoleEnum("role").notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    phone: varchar("phone", { length: 30 }),
    licenseNumber: varchar("license_number", { length: 100 }),
    identityNumber: varchar("identity_number", { length: 100 }),
    primaryVehicleId: uuid("primary_vehicle_id").references(() => vehicles.id),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("transport_personnel_code_idx").on(table.code),
    index("transport_personnel_role_idx").on(table.role),
    index("transport_personnel_vehicle_idx").on(table.primaryVehicleId),
  ],
);

export const warehouses = pgTable(
  "warehouses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    address: text("address"),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("warehouses_code_idx").on(table.code)],
);

export const productCategories = pgTable(
  "product_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("product_categories_code_idx").on(table.code)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id").references(() => productCategories.id),
    code: varchar("code", { length: 50 }).notNull(),
    sku: varchar("sku", { length: 80 }),
    name: varchar("name", { length: 150 }).notNull(),
    unit: varchar("unit", { length: 30 }).notNull(),
    purchasePrice: numeric("purchase_price", { precision: 16, scale: 2 })
      .default("0")
      .notNull(),
    sellingPrice: numeric("selling_price", { precision: 16, scale: 2 })
      .default("0")
      .notNull(),
    minStock: numeric("min_stock", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    allowNegativeStock: boolean("allow_negative_stock").default(false).notNull(),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("products_code_idx").on(table.code),
    index("products_category_id_idx").on(table.categoryId),
  ],
);

export const productPriceHistories = pgTable(
  "product_price_histories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true })
      .defaultNow()
      .notNull(),
    purchasePrice: numeric("purchase_price", { precision: 16, scale: 2 })
      .default("0")
      .notNull(),
    sellingPrice: numeric("selling_price", { precision: 16, scale: 2 })
      .default("0")
      .notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (table) => [
    index("product_price_histories_product_idx").on(table.productId),
    index("product_price_histories_effective_idx").on(table.effectiveFrom),
  ],
);

export const tbsPurchases = pgTable(
  "tbs_purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    purchaseDate: timestamp("purchase_date", { withTimezone: true })
      .defaultNow()
      .notNull(),
    farmerId: uuid("farmer_id")
      .references(() => farmers.id)
      .notNull(),
    driverId: uuid("driver_id").references(() => transportPersonnel.id),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id),
    warehouseId: uuid("warehouse_id").references(() => warehouses.id),
    grossWeight: numeric("gross_weight", { precision: 14, scale: 2 }).notNull(),
    tareWeight: numeric("tare_weight", { precision: 14, scale: 2 }).notNull(),
    netWeight: numeric("net_weight", { precision: 14, scale: 2 }).notNull(),
    buyingPricePerKg: numeric("buying_price_per_kg", {
      precision: 16,
      scale: 2,
    }).notNull(),
    totalPurchase: numeric("total_purchase", {
      precision: 16,
      scale: 2,
    }).notNull(),
    transportCost: numeric("transport_cost", { precision: 16, scale: 2 })
      .default("0")
      .notNull(),
    loadingCost: numeric("loading_cost", { precision: 16, scale: 2 })
      .default("0")
      .notNull(),
    otherCost: numeric("other_cost", { precision: 16, scale: 2 })
      .default("0")
      .notNull(),
    totalOperationalCost: numeric("total_operational_cost", {
      precision: 16,
      scale: 2,
    }).notNull(),
    paymentStatus: paymentStatusEnum("payment_status").default("unpaid").notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    status: recordStatusEnum("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("tbs_purchases_code_idx").on(table.code),
    index("tbs_purchases_farmer_idx").on(table.farmerId),
    index("tbs_purchases_date_idx").on(table.purchaseDate),
  ],
);

export const tbsSales = pgTable(
  "tbs_sales",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    saleDate: timestamp("sale_date", { withTimezone: true }).defaultNow().notNull(),
    referencePurchaseId: uuid("reference_purchase_id").references(() => tbsPurchases.id),
    warehouseId: uuid("warehouse_id").references(() => warehouses.id),
    factoryId: uuid("factory_id")
      .references(() => factories.id)
      .notNull(),
    grossWeight: numeric("gross_weight", { precision: 14, scale: 2 }).notNull(),
    tareWeight: numeric("tare_weight", { precision: 14, scale: 2 }).notNull(),
    netWeightInitial: numeric("net_weight_initial", {
      precision: 14,
      scale: 2,
    }).notNull(),
    totalDeduction: numeric("total_deduction", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    returnWeight: numeric("return_weight", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    netWeightFinal: numeric("net_weight_final", { precision: 14, scale: 2 }).notNull(),
    grossSalesAmount: numeric("gross_sales_amount", {
      precision: 16,
      scale: 2,
    })
      .default("0")
      .notNull(),
    totalDeductionAmount: numeric("total_deduction_amount", {
      precision: 16,
      scale: 2,
    })
      .default("0")
      .notNull(),
    sellingPricePerKg: numeric("selling_price_per_kg", {
      precision: 16,
      scale: 2,
    }).notNull(),
    totalSales: numeric("total_sales", { precision: 16, scale: 2 }).notNull(),
    margin: numeric("margin", { precision: 16, scale: 2 }).notNull(),
    paymentStatus: paymentStatusEnum("payment_status").default("unpaid").notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    status: recordStatusEnum("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("tbs_sales_code_idx").on(table.code),
    index("tbs_sales_purchase_idx").on(table.referencePurchaseId),
    index("tbs_sales_warehouse_idx").on(table.warehouseId),
    index("tbs_sales_factory_idx").on(table.factoryId),
    index("tbs_sales_date_idx").on(table.saleDate),
  ],
);

export const tbsDeductionConfigs = pgTable(
  "tbs_deduction_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    legacyType: deductionTypeEnum("legacy_type"),
    defaultInputMode: deductionInputModeEnum("default_input_mode")
      .default("kg")
      .notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("tbs_deduction_configs_code_idx").on(table.code),
    index("tbs_deduction_configs_active_idx").on(table.isActive),
  ],
);

export const factoryDeductionDefaults = pgTable(
  "factory_deduction_defaults",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    factoryId: uuid("factory_id")
      .references(() => factories.id, { onDelete: "cascade" })
      .notNull(),
    deductionConfigId: uuid("deduction_config_id")
      .references(() => tbsDeductionConfigs.id, { onDelete: "cascade" })
      .notNull(),
    inputMode: deductionInputModeEnum("input_mode").default("kg").notNull(),
    defaultValue: numeric("default_value", { precision: 16, scale: 2 })
      .default("0")
      .notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("factory_deduction_defaults_factory_config_idx").on(
      table.factoryId,
      table.deductionConfigId,
    ),
    index("factory_deduction_defaults_factory_idx").on(table.factoryId),
  ],
);

export const tbsSaleDeductions = pgTable(
  "tbs_sale_deductions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    saleId: uuid("sale_id")
      .references(() => tbsSales.id, { onDelete: "cascade" })
      .notNull(),
    configId: uuid("config_id").references(() => tbsDeductionConfigs.id),
    type: deductionTypeEnum("type").notNull(),
    label: varchar("label", { length: 150 }),
    inputMode: deductionInputModeEnum("input_mode").default("kg").notNull(),
    inputValue: numeric("input_value", { precision: 16, scale: 2 })
      .default("0")
      .notNull(),
    percentageValue: numeric("percentage_value", { precision: 10, scale: 4 })
      .default("0")
      .notNull(),
    weight: numeric("weight", { precision: 14, scale: 2 }).notNull(),
    deductionAmount: numeric("deduction_amount", { precision: 16, scale: 2 })
      .default("0")
      .notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("tbs_sale_deductions_sale_idx").on(table.saleId),
    index("tbs_sale_deductions_config_idx").on(table.configId),
  ],
);

export const tbsSaleReturns = pgTable(
  "tbs_sale_returns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    saleId: uuid("sale_id")
      .references(() => tbsSales.id, { onDelete: "cascade" })
      .notNull(),
    returnWeight: numeric("return_weight", { precision: 14, scale: 2 }).notNull(),
    returnReason: text("return_reason").notNull(),
    actionType: returnActionEnum("action_type").notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [index("tbs_sale_returns_sale_idx").on(table.saleId)],
);

export const storePurchases = pgTable(
  "store_purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    transactionDate: timestamp("transaction_date", { withTimezone: true })
      .defaultNow()
      .notNull(),
    supplierId: uuid("supplier_id")
      .references(() => suppliers.id)
      .notNull(),
    warehouseId: uuid("warehouse_id")
      .references(() => warehouses.id)
      .notNull(),
    invoiceNumber: varchar("invoice_number", { length: 100 }),
    subtotal: numeric("subtotal", { precision: 16, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 16, scale: 2 }).default("0").notNull(),
    tax: numeric("tax", { precision: 16, scale: 2 }).default("0").notNull(),
    totalAmount: numeric("total_amount", { precision: 16, scale: 2 }).notNull(),
    paymentStatus: paymentStatusEnum("payment_status").default("unpaid").notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    status: recordStatusEnum("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("store_purchases_code_idx").on(table.code),
    index("store_purchases_supplier_idx").on(table.supplierId),
  ],
);

export const storePurchaseItems = pgTable(
  "store_purchase_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    purchaseId: uuid("purchase_id")
      .references(() => storePurchases.id, { onDelete: "cascade" })
      .notNull(),
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 2 }).notNull(),
    unitCost: numeric("unit_cost", { precision: 16, scale: 2 }).notNull(),
    lineTotal: numeric("line_total", { precision: 16, scale: 2 }).notNull(),
    ...timestamps,
  },
  (table) => [index("store_purchase_items_purchase_idx").on(table.purchaseId)],
);

export const storePurchaseReturns = pgTable(
  "store_purchase_returns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    purchaseId: uuid("purchase_id")
      .references(() => storePurchases.id, { onDelete: "cascade" })
      .notNull(),
    returnDate: timestamp("return_date", { withTimezone: true })
      .defaultNow()
      .notNull(),
    totalReturnAmount: numeric("total_return_amount", { precision: 16, scale: 2 }).notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    status: recordStatusEnum("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("store_purchase_returns_code_idx").on(table.code),
    index("store_purchase_returns_purchase_idx").on(table.purchaseId),
    index("store_purchase_returns_date_idx").on(table.returnDate),
  ],
);

export const storePurchaseReturnItems = pgTable(
  "store_purchase_return_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    returnId: uuid("return_id")
      .references(() => storePurchaseReturns.id, { onDelete: "cascade" })
      .notNull(),
    purchaseItemId: uuid("purchase_item_id")
      .references(() => storePurchaseItems.id, { onDelete: "cascade" })
      .notNull(),
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 2 }).notNull(),
    unitCost: numeric("unit_cost", { precision: 16, scale: 2 }).notNull(),
    lineTotal: numeric("line_total", { precision: 16, scale: 2 }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("store_purchase_return_items_return_idx").on(table.returnId),
    index("store_purchase_return_items_purchase_item_idx").on(table.purchaseItemId),
  ],
);

export const storeSales = pgTable(
  "store_sales",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    transactionDate: timestamp("transaction_date", { withTimezone: true })
      .defaultNow()
      .notNull(),
    customerId: uuid("customer_id").references(() => customers.id),
    warehouseId: uuid("warehouse_id")
      .references(() => warehouses.id)
      .notNull(),
    invoiceNumber: varchar("invoice_number", { length: 100 }),
    saleType: saleTypeEnum("sale_type").notNull(),
    subtotal: numeric("subtotal", { precision: 16, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 16, scale: 2 }).default("0").notNull(),
    tax: numeric("tax", { precision: 16, scale: 2 }).default("0").notNull(),
    totalAmount: numeric("total_amount", { precision: 16, scale: 2 }).notNull(),
    paymentStatus: paymentStatusEnum("payment_status").default("unpaid").notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    status: recordStatusEnum("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("store_sales_code_idx").on(table.code),
    index("store_sales_customer_idx").on(table.customerId),
  ],
);

export const storeSaleItems = pgTable(
  "store_sale_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    saleId: uuid("sale_id")
      .references(() => storeSales.id, { onDelete: "cascade" })
      .notNull(),
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 2 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 16, scale: 2 }).notNull(),
    lineTotal: numeric("line_total", { precision: 16, scale: 2 }).notNull(),
    ...timestamps,
  },
  (table) => [index("store_sale_items_sale_idx").on(table.saleId)],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    warehouseId: uuid("warehouse_id")
      .references(() => warehouses.id)
      .notNull(),
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    referenceType: referenceTypeEnum("reference_type").notNull(),
    referenceId: uuid("reference_id"),
    movementType: movementTypeEnum("movement_type").notNull(),
    reason: stockMutationReasonEnum("reason").default("other").notNull(),
    counterpartyWarehouseId: uuid("counterparty_warehouse_id").references(() => warehouses.id),
    movementDate: timestamp("movement_date", { withTimezone: true })
      .defaultNow()
      .notNull(),
    beforeQuantity: numeric("before_quantity", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 2 }).notNull(),
    afterQuantity: numeric("after_quantity", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    unitCost: numeric("unit_cost", { precision: 16, scale: 2 }).default("0").notNull(),
    totalValue: numeric("total_value", { precision: 16, scale: 2 }).default("0").notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (table) => [
    index("stock_movements_product_idx").on(table.productId),
    index("stock_movements_warehouse_idx").on(table.warehouseId),
    index("stock_movements_reference_idx").on(table.referenceType, table.referenceId),
  ],
);

export const stockBalances = pgTable(
  "stock_balances",
  {
    warehouseId: uuid("warehouse_id")
      .references(() => warehouses.id)
      .notNull(),
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 2 }).default("0").notNull(),
    averageCost: numeric("average_cost", { precision: 16, scale: 2 })
      .default("0")
      .notNull(),
    lastMovementAt: timestamp("last_movement_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.warehouseId, table.productId] }),
    index("stock_balances_product_idx").on(table.productId),
  ],
);

export const stockTakes = pgTable(
  "stock_takes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    warehouseId: uuid("warehouse_id")
      .references(() => warehouses.id)
      .notNull(),
    stockDate: timestamp("stock_date", { withTimezone: true }).defaultNow().notNull(),
    status: stockTakeStatusEnum("status").default("draft").notNull(),
    varianceValue: numeric("variance_value", { precision: 16, scale: 2 })
      .default("0")
      .notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("stock_takes_code_idx").on(table.code),
    index("stock_takes_warehouse_idx").on(table.warehouseId),
  ],
);

export const stockTakeItems = pgTable(
  "stock_take_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stockTakeId: uuid("stock_take_id")
      .references(() => stockTakes.id, { onDelete: "cascade" })
      .notNull(),
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    systemQty: numeric("system_qty", { precision: 14, scale: 2 }).notNull(),
    physicalQty: numeric("physical_qty", { precision: 14, scale: 2 }).notNull(),
    varianceQty: numeric("variance_qty", { precision: 14, scale: 2 }).notNull(),
    unitCost: numeric("unit_cost", { precision: 16, scale: 2 }).default("0").notNull(),
    varianceValue: numeric("variance_value", { precision: 16, scale: 2 })
      .default("0")
      .notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [index("stock_take_items_stock_take_idx").on(table.stockTakeId)],
);

export const stockAdjustments = pgTable(
  "stock_adjustments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    warehouseId: uuid("warehouse_id")
      .references(() => warehouses.id)
      .notNull(),
    targetWarehouseId: uuid("target_warehouse_id").references(() => warehouses.id),
    stockTakeId: uuid("stock_take_id").references(() => stockTakes.id),
    status: adjustmentStatusEnum("status").default("pending").notNull(),
    reason: stockMutationReasonEnum("reason").default("other").notNull(),
    totalVarianceValue: numeric("total_variance_value", {
      precision: 16,
      scale: 2,
    })
      .default("0")
      .notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("stock_adjustments_code_idx").on(table.code),
    index("stock_adjustments_stock_take_idx").on(table.stockTakeId),
  ],
);

export const stockAdjustmentItems = pgTable(
  "stock_adjustment_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adjustmentId: uuid("adjustment_id")
      .references(() => stockAdjustments.id, { onDelete: "cascade" })
      .notNull(),
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    adjustmentType: movementTypeEnum("adjustment_type").notNull(),
    reason: stockMutationReasonEnum("reason").default("other").notNull(),
    systemQty: numeric("system_qty", { precision: 14, scale: 2 }).notNull(),
    physicalQty: numeric("physical_qty", { precision: 14, scale: 2 }).notNull(),
    beforeQty: numeric("before_qty", { precision: 14, scale: 2 }).default("0").notNull(),
    afterQty: numeric("after_qty", { precision: 14, scale: 2 }).default("0").notNull(),
    adjustmentQty: numeric("adjustment_qty", { precision: 14, scale: 2 }).notNull(),
    unitCost: numeric("unit_cost", { precision: 16, scale: 2 }).default("0").notNull(),
    varianceValue: numeric("variance_value", { precision: 16, scale: 2 })
      .default("0")
      .notNull(),
    ...timestamps,
  },
  (table) => [index("stock_adjustment_items_adjustment_idx").on(table.adjustmentId)],
);

export const payables = pgTable(
  "payables",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    sourceType: financeSourceTypeEnum("source_type").notNull(),
    sourceId: uuid("source_id"),
    partyType: payablePartyTypeEnum("party_type").notNull(),
    farmerId: uuid("farmer_id").references(() => farmers.id),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    dueDate: timestamp("due_date", { withTimezone: true }),
    amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
    paidAmount: numeric("paid_amount", { precision: 16, scale: 2 })
      .default("0")
      .notNull(),
    outstandingAmount: numeric("outstanding_amount", {
      precision: 16,
      scale: 2,
    }).notNull(),
    status: paymentStatusEnum("status").default("unpaid").notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("payables_code_idx").on(table.code),
    index("payables_status_idx").on(table.status),
    index("payables_source_idx").on(table.sourceType, table.sourceId),
  ],
);

export const receivables = pgTable(
  "receivables",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    sourceType: financeSourceTypeEnum("source_type").notNull(),
    sourceId: uuid("source_id"),
    partyType: receivablePartyTypeEnum("party_type").notNull(),
    factoryId: uuid("factory_id").references(() => factories.id),
    customerId: uuid("customer_id").references(() => customers.id),
    dueDate: timestamp("due_date", { withTimezone: true }),
    amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
    paidAmount: numeric("paid_amount", { precision: 16, scale: 2 })
      .default("0")
      .notNull(),
    outstandingAmount: numeric("outstanding_amount", {
      precision: 16,
      scale: 2,
    }).notNull(),
    status: paymentStatusEnum("status").default("unpaid").notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("receivables_code_idx").on(table.code),
    index("receivables_status_idx").on(table.status),
    index("receivables_source_idx").on(table.sourceType, table.sourceId),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    paymentDate: timestamp("payment_date", { withTimezone: true }).defaultNow().notNull(),
    direction: paymentDirectionEnum("direction").notNull(),
    method: paymentMethodEnum("method").notNull(),
    payableId: uuid("payable_id").references(() => payables.id),
    receivableId: uuid("receivable_id").references(() => receivables.id),
    amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    status: recordStatusEnum("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("payments_code_idx").on(table.code),
    index("payments_date_idx").on(table.paymentDate),
  ],
);

export const tbsPurchaseStoreOffsets = pgTable(
  "tbs_purchase_store_offsets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    purchaseId: uuid("purchase_id")
      .references(() => tbsPurchases.id, { onDelete: "cascade" })
      .notNull(),
    payableId: uuid("payable_id").references(() => payables.id, {
      onDelete: "set null",
    }),
    farmerId: uuid("farmer_id")
      .references(() => farmers.id)
      .notNull(),
    inputMode: settlementInputModeEnum("input_mode").notNull(),
    inputPercentage: numeric("input_percentage", { precision: 8, scale: 2 }),
    inputAmount: numeric("input_amount", { precision: 16, scale: 2 })
      .default("0")
      .notNull(),
    baseAmount: numeric("base_amount", { precision: 16, scale: 2 }).notNull(),
    requestedAmount: numeric("requested_amount", { precision: 16, scale: 2 })
      .notNull(),
    appliedAmount: numeric("applied_amount", { precision: 16, scale: 2 })
      .notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("tbs_purchase_store_offsets_purchase_idx").on(table.purchaseId),
    index("tbs_purchase_store_offsets_farmer_idx").on(table.farmerId),
    index("tbs_purchase_store_offsets_payable_idx").on(table.payableId),
  ],
);

export const tbsPurchaseStoreOffsetItems = pgTable(
  "tbs_purchase_store_offset_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    offsetId: uuid("offset_id")
      .references(() => tbsPurchaseStoreOffsets.id, { onDelete: "cascade" })
      .notNull(),
    receivableId: uuid("receivable_id")
      .references(() => receivables.id)
      .notNull(),
    customerId: uuid("customer_id").references(() => customers.id),
    appliedAmount: numeric("applied_amount", { precision: 16, scale: 2 })
      .notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    ...timestamps,
  },
  (table) => [
    index("tbs_purchase_store_offset_items_offset_idx").on(table.offsetId),
    index("tbs_purchase_store_offset_items_receivable_idx").on(table.receivableId),
    index("tbs_purchase_store_offset_items_customer_idx").on(table.customerId),
  ],
);

export const cashTransactions = pgTable(
  "cash_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    transactionDate: timestamp("transaction_date", { withTimezone: true })
      .defaultNow()
      .notNull(),
    type: cashTransactionTypeEnum("type").notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    referenceType: referenceTypeEnum("reference_type"),
    referenceId: uuid("reference_id"),
    amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
    description: text("description"),
    createdBy: uuid("created_by").references(() => users.id),
    status: recordStatusEnum("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("cash_transactions_code_idx").on(table.code),
    index("cash_transactions_date_idx").on(table.transactionDate),
  ],
);

export const documentLogs = pgTable(
  "document_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentType: documentTypeEnum("document_type").notNull(),
    referenceType: referenceTypeEnum("reference_type").notNull(),
    referenceId: uuid("reference_id").notNull(),
    fileName: varchar("file_name", { length: 200 }),
    fileUrl: text("file_url"),
    payload: jsonb("payload"),
    status: sendStatusEnum("status").default("pending").notNull(),
    printedBy: uuid("printed_by").references(() => users.id),
    printedAt: timestamp("printed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("document_logs_reference_idx").on(table.referenceType, table.referenceId),
  ],
);

export const whatsappLogs = pgTable(
  "whatsapp_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    referenceType: referenceTypeEnum("reference_type").notNull(),
    referenceId: uuid("reference_id").notNull(),
    destination: varchar("destination", { length: 30 }).notNull(),
    message: text("message").notNull(),
    provider: varchar("provider", { length: 100 }).default("manual").notNull(),
    status: sendStatusEnum("status").default("pending").notNull(),
    errorMessage: text("error_message"),
    payload: jsonb("payload"),
    sentBy: uuid("sent_by").references(() => users.id),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("whatsapp_logs_reference_idx").on(table.referenceType, table.referenceId),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: uuid("entity_id"),
    action: varchar("action", { length: 80 }).notNull(),
    actorId: uuid("actor_id").references(() => users.id),
    before: jsonb("before"),
    after: jsonb("after"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("audit_logs_entity_idx").on(table.entityType, table.entityId)],
);

export type Role = typeof roles.$inferSelect;
export type User = typeof users.$inferSelect;
export type Farmer = typeof farmers.$inferSelect;
export type Factory = typeof factories.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type TransportPersonnel = typeof transportPersonnel.$inferSelect;
export type Warehouse = typeof warehouses.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductPriceHistory = typeof productPriceHistories.$inferSelect;
export type TbsPurchaseStoreOffset = typeof tbsPurchaseStoreOffsets.$inferSelect;
export type TbsPurchaseStoreOffsetItem = typeof tbsPurchaseStoreOffsetItems.$inferSelect;
export type TbsDeductionConfig = typeof tbsDeductionConfigs.$inferSelect;
export type TbsPurchase = typeof tbsPurchases.$inferSelect;
export type TbsSale = typeof tbsSales.$inferSelect;
export type StorePurchase = typeof storePurchases.$inferSelect;
export type StoreSale = typeof storeSales.$inferSelect;
export type StockTake = typeof stockTakes.$inferSelect;
export type Payable = typeof payables.$inferSelect;
export type Receivable = typeof receivables.$inferSelect;
