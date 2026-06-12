import { randomUUID } from "node:crypto";

import { Client } from "pg";

import { ensureLocalAppServer, releaseLocalAppServer } from "@/testing/smoke/app-server";
import { jsonRequest, readJsonEnv } from "@/testing/smoke/http";

type SmokeIds = {
  warehouseId: string;
  farmerId: string;
  driverId: string;
  vehicleId: string;
  customerId: string;
  productId: string;
};

type FinanceCheck = {
  sale: { id: string; payment_status: string };
  receivable: { status: string; outstanding_amount: string | number };
  payment: { method: string; direction: string };
  cashTx: { category: string; reference_type: string };
};

export type CoreApiSmokeResult = {
  unauthPalmStatus: number;
  loginStatus: number;
  palmPurchaseStatus: number;
  storeSaleStatus: number;
  manualWhatsappStatus: number;
  financeCheck: FinanceCheck;
};

function firstCookie(setCookie?: string | string[]) {
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return raw ? raw.split(";", 1)[0] : null;
}

async function querySmokeIds(db: Client): Promise<SmokeIds> {
  const result = await db.query<{ ids: SmokeIds }>(`
    SELECT json_build_object(
      'warehouseId', (SELECT id FROM warehouses ORDER BY created_at ASC LIMIT 1),
      'farmerId', (SELECT id FROM farmers ORDER BY created_at ASC LIMIT 1),
      'driverId', (
        SELECT id
        FROM transport_personnel
        WHERE role = 'driver'
        ORDER BY created_at ASC
        LIMIT 1
      ),
      'vehicleId', (SELECT id FROM vehicles ORDER BY created_at ASC LIMIT 1),
      'customerId', (SELECT id FROM customers ORDER BY created_at ASC LIMIT 1),
      'productId', (
        SELECT p.id
        FROM products p
        JOIN stock_balances sb ON sb.product_id = p.id
        WHERE p.code <> 'SYS-TBS-POOL' AND sb.quantity > 0
        ORDER BY p.created_at ASC
        LIMIT 1
      )
    ) AS ids
  `);

  const ids = result.rows[0]?.ids;

  if (
    !ids?.warehouseId ||
    !ids.farmerId ||
    !ids.driverId ||
    !ids.vehicleId ||
    !ids.customerId ||
    !ids.productId
  ) {
    throw new Error("Smoke setup data is incomplete in the app database.");
  }

  return ids;
}

async function queryFinanceCheck(
  db: Client,
  saleId: string,
): Promise<FinanceCheck> {
  const result = await db.query<{ payload: FinanceCheck }>(
    `
      SELECT json_build_object(
        'sale', (
          SELECT row_to_json(t)
          FROM (
            SELECT id, payment_status
            FROM store_sales
            WHERE id = $1
          ) t
        ),
        'receivable', (
          SELECT row_to_json(t)
          FROM (
            SELECT status, outstanding_amount
            FROM receivables
            WHERE source_type = 'store_sale' AND source_id = $1
            ORDER BY created_at DESC
            LIMIT 1
          ) t
        ),
        'payment', (
          SELECT row_to_json(t)
          FROM (
            SELECT method, direction
            FROM payments
            WHERE receivable_id = (
              SELECT id
              FROM receivables
              WHERE source_type = 'store_sale' AND source_id = $1
              ORDER BY created_at DESC
              LIMIT 1
            )
            ORDER BY created_at DESC
            LIMIT 1
          ) t
        ),
        'cashTx', (
          SELECT row_to_json(t)
          FROM (
            SELECT category, reference_type
            FROM cash_transactions
            WHERE reference_id = (
              SELECT id
              FROM payments
              WHERE receivable_id = (
                SELECT id
                FROM receivables
                WHERE source_type = 'store_sale' AND source_id = $1
                ORDER BY created_at DESC
                LIMIT 1
              )
              ORDER BY created_at DESC
              LIMIT 1
            )
            ORDER BY created_at DESC
            LIMIT 1
          ) t
        )
      ) AS payload
    `,
    [saleId],
  );

  const payload = result.rows[0]?.payload;

  if (
    !payload?.sale ||
    !payload.receivable ||
    !payload.payment ||
    !payload.cashTx
  ) {
    throw new Error("Smoke finance verification did not find complete records.");
  }

  return payload;
}

export async function runCoreApiSmoke(): Promise<CoreApiSmokeResult> {
  const env = readJsonEnv({
    appUrl: "APP_URL",
    appDbUrl: "DATABASE_URL",
  });

  await ensureLocalAppServer(env.appUrl);

  const db = new Client({ connectionString: env.appDbUrl });
  await db.connect();

  try {
    const ids = await querySmokeIds(db);
    const today = new Date().toISOString().slice(0, 10);
    const purchasePayload = {
      purchaseDate: today,
      farmerId: ids.farmerId,
      driverId: ids.driverId,
      vehicleId: ids.vehicleId,
      warehouseId: ids.warehouseId,
      grossWeight: 1234,
      tareWeight: 234,
      buyingPricePerKg: 2800,
      transportCost: 100000,
      loadingCost: 25000,
      otherCost: 10000,
      storeDebtDeductionMode: "none",
      storeDebtDeductionValue: 0,
      storeDebtDeductionPercent: 0,
      notes: "Automated smoke purchase",
    };

    const unauthPalm = await jsonRequest<{ error?: string }>({
      method: "POST",
      url: `${env.appUrl}/api/palm/purchases`,
      body: purchasePayload,
    });

    const login = await jsonRequest<{ ok?: boolean; error?: string }>({
      method: "POST",
      url: `${env.appUrl}/api/auth/login`,
      body: {
        email: "owner@besawit.local",
        password: "password123",
      },
    });

    const cookie = firstCookie(login.headers["set-cookie"]);
    if (!cookie) {
      throw new Error("Smoke login did not return a session cookie.");
    }

    const palmPurchase = await jsonRequest<{ id: string }>({
      method: "POST",
      url: `${env.appUrl}/api/palm/purchases`,
      cookie,
      body: purchasePayload,
    });

    const invoiceNumber = `SMOKE-CORE-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const storeSale = await jsonRequest<{ id: string }>({
      method: "POST",
      url: `${env.appUrl}/api/store/sales`,
      cookie,
      body: {
        transactionDate: today,
        customerId: ids.customerId,
        warehouseId: ids.warehouseId,
        invoiceNumber,
        saleType: "cash",
        dueDate: "",
        discount: 0,
        tax: 0,
        items: [
          {
            productId: ids.productId,
            quantity: 1,
            unitPrice: 50000,
          },
        ],
        notes: "Automated smoke cash sale",
      },
    });

    if (!storeSale.body?.id) {
      throw new Error("Smoke store sale did not return a sale id.");
    }

    const manualWhatsapp = await jsonRequest<{ id?: string }>({
      method: "POST",
      url: `${env.appUrl}/api/whatsapp/send`,
      cookie,
      body: {
        referenceType: "manual",
        referenceId: storeSale.body.id,
        documentType: "payment_receipt",
        destination: "081234567890",
        message: "Automated smoke payment receipt log",
      },
    });

    const financeCheck = await queryFinanceCheck(db, storeSale.body.id);

    return {
      unauthPalmStatus: unauthPalm.status,
      loginStatus: login.status,
      palmPurchaseStatus: palmPurchase.status,
      storeSaleStatus: storeSale.status,
      manualWhatsappStatus: manualWhatsapp.status,
      financeCheck,
    };
  } finally {
    await db.end();
    await releaseLocalAppServer(env.appUrl);
  }
}
