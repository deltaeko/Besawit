import assert from "node:assert/strict";
import test from "node:test";

import { runCoreApiSmoke } from "@/testing/smoke/core-api";

test("core API smoke proves auth guard and finance side effects", async () => {
  const originalAppUrl = process.env.APP_URL;
  const originalAppDbUrl = process.env.DATABASE_URL;
  const originalControlDbUrl = process.env.CONTROL_DATABASE_URL;

  process.env.APP_URL = "http://localhost:6001";
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@localhost:7000/besawit_app";
  process.env.CONTROL_DATABASE_URL =
    "postgresql://postgres:postgres@localhost:7000/besawit_control";

  try {
    const result = await runCoreApiSmoke();

    assert.equal(result.unauthPalmStatus, 401);
    assert.equal(result.loginStatus, 200);
    assert.equal(result.palmPurchaseStatus, 201);
    assert.equal(result.storeSaleStatus, 201);
    assert.equal(result.manualWhatsappStatus, 201);
    assert.equal(result.financeCheck.sale.payment_status, "paid");
    assert.equal(result.financeCheck.receivable.status, "paid");
    assert.equal(result.financeCheck.payment.method, "cash");
    assert.equal(result.financeCheck.payment.direction, "in");
    assert.equal(result.financeCheck.cashTx.category, "Kas Masuk");
  } finally {
    if (originalAppUrl === undefined) {
      delete process.env.APP_URL;
    } else {
      process.env.APP_URL = originalAppUrl;
    }

    if (originalAppDbUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalAppDbUrl;
    }

    if (originalControlDbUrl === undefined) {
      delete process.env.CONTROL_DATABASE_URL;
    } else {
      process.env.CONTROL_DATABASE_URL = originalControlDbUrl;
    }
  }
});
