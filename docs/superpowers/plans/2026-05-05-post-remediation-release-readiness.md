# Post-Remediation Release Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add repeatable automated smoke coverage and a final release-readiness gate for the Besawit security/integrity fixes that were just completed.

**Architecture:** Put runtime smoke logic in small TypeScript helpers under `src/testing/smoke/`, then expose them through thin scripts in `scripts/` and focused node tests in `tests/smoke/`. Keep the existing service and route code unchanged unless a smoke test proves a real regression. The end state is a clean path to verify fresh app DB, fresh control DB, core API auth, cash sale finance posting, and trial setup flow before commit or deploy.

**Tech Stack:** Next.js 16, TypeScript, Node test runner via `tsx --test`, PostgreSQL via `pg`, Drizzle migrations, existing npm scripts

---

## File Structure

- Create: `D:\Besawit\src\testing\smoke\http.ts`
  - Shared low-level HTTP helper for JSON requests against `localhost` with optional `Host` header and cookie support.
- Create: `D:\Besawit\src\testing\smoke\core-api.ts`
  - End-to-end smoke routine for unauthenticated rejection, seeded login, palm purchase creation, cash store sale creation, and finance side effects verification.
- Create: `D:\Besawit\src\testing\smoke\trial-flow.ts`
  - End-to-end smoke routine for public trial request, provisioning worker execution, setup token issuance, tenant account setup, tenant login, and token single-use enforcement.
- Create: `D:\Besawit\scripts\smoke-core-api.ts`
  - Thin CLI wrapper that runs `runCoreApiSmoke()` and exits non-zero on failure.
- Create: `D:\Besawit\scripts\smoke-trial-flow.ts`
  - Thin CLI wrapper that runs `runTrialFlowSmoke()` and exits non-zero on failure.
- Create: `D:\Besawit\tests\smoke\core-api-smoke.test.ts`
  - Automated test that calls the core API smoke helper and asserts the expected statuses and DB side effects.
- Create: `D:\Besawit\tests\smoke\trial-flow-smoke.test.ts`
  - Automated test that calls the trial-flow smoke helper and asserts the expected `queued -> ready -> setup complete` lifecycle.
- Modify: `D:\Besawit\package.json`
  - Add explicit smoke scripts and a release verification aggregate script.
- Create: `D:\Besawit\docs\release-readiness.md`
  - Manual gate document for fresh DB bootstrap, smoke expectations, and pre-commit/pre-deploy checks.

### Task 1: Shared Smoke Harness

**Files:**
- Create: `D:\Besawit\src\testing\smoke\http.ts`
- Modify: `D:\Besawit\package.json`
- Test: `D:\Besawit\tests\smoke\core-api-smoke.test.ts`

- [ ] **Step 1: Write the failing test scaffold**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { jsonRequest, readJsonEnv } from "@/testing/smoke/http";

test("smoke http helper exposes env and request utilities", async () => {
  const env = readJsonEnv({
    appUrl: "APP_URL",
    appDbUrl: "DATABASE_URL",
    controlDbUrl: "CONTROL_DATABASE_URL",
  });

  assert.equal(typeof env.appUrl, "string");
  assert.equal(typeof env.appDbUrl, "string");
  assert.equal(typeof env.controlDbUrl, "string");
  assert.equal(typeof jsonRequest, "function");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test tests/smoke/core-api-smoke.test.ts
```

Expected: FAIL with `Cannot find module '@/testing/smoke/http'` or missing export errors.

- [ ] **Step 3: Write minimal implementation**

```ts
// D:\Besawit\src\testing\smoke\http.ts
import http from "node:http";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type JsonRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  host?: string;
  body?: JsonValue;
  cookie?: string | null;
};

export type JsonResponse<T = unknown> = {
  status: number;
  body: T;
  headers: http.IncomingHttpHeaders;
};

export function readJsonEnv<T extends Record<string, string>>(mapping: T): {
  [K in keyof T]: string;
} {
  const entries = Object.entries(mapping).map(([key, envName]) => {
    const value = process.env[envName];
    if (!value) {
      throw new Error(`Missing required env var: ${envName}`);
    }

    return [key, value];
  });

  return Object.fromEntries(entries) as { [K in keyof T]: string };
}

export async function jsonRequest<T = unknown>(
  options: JsonRequestOptions,
): Promise<JsonResponse<T>> {
  const target = new URL(options.url);
  const payload =
    options.body === undefined ? null : JSON.stringify(options.body);

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: target.hostname,
        port: target.port || 80,
        path: `${target.pathname}${target.search}`,
        method: options.method ?? "GET",
        headers: {
          Host: options.host ?? target.host,
          "Content-Type": "application/json",
          ...(payload
            ? { "Content-Length": Buffer.byteLength(payload) }
            : {}),
          ...(options.cookie ? { Cookie: options.cookie } : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            body: (raw ? JSON.parse(raw) : null) as T,
            headers: res.headers,
          });
        });
      },
    );

    req.on("error", reject);

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}
```

- [ ] **Step 4: Add smoke scripts to package.json**

```json
{
  "scripts": {
    "smoke:core-api": "tsx scripts/smoke-core-api.ts",
    "smoke:trial-flow": "tsx scripts/smoke-trial-flow.ts",
    "verify:release": "npm run check && npm run test && npm run smoke:core-api && npm run smoke:trial-flow"
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
npx tsx --test tests/smoke/core-api-smoke.test.ts
```

Expected: PASS for the helper test.

- [ ] **Step 6: Commit**

```bash
git add src/testing/smoke/http.ts tests/smoke/core-api-smoke.test.ts package.json
git commit -m "test: add shared smoke harness"
```

### Task 2: Core API + Finance Smoke Coverage

**Files:**
- Create: `D:\Besawit\src\testing\smoke\core-api.ts`
- Create: `D:\Besawit\scripts\smoke-core-api.ts`
- Modify: `D:\Besawit\tests\smoke\core-api-smoke.test.ts`
- Test: `D:\Besawit\tests\smoke\core-api-smoke.test.ts`

- [ ] **Step 1: Write the failing smoke test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { runCoreApiSmoke } from "@/testing/smoke/core-api";

test("core API smoke proves auth guard and finance side effects", async () => {
  const result = await runCoreApiSmoke();

  assert.equal(result.unauthPalmStatus, 401);
  assert.equal(result.loginStatus, 200);
  assert.equal(result.palmPurchaseStatus, 201);
  assert.equal(result.storeSaleStatus, 201);
  assert.equal(result.manualWhatsappStatus, 201);
  assert.equal(result.financeCheck.sale.payment_status, "paid");
  assert.equal(result.financeCheck.receivable.status, "paid");
  assert.equal(result.financeCheck.payment.method, "cash");
  assert.equal(result.financeCheck.cashTx.category, "Kas Masuk");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test tests/smoke/core-api-smoke.test.ts
```

Expected: FAIL because `runCoreApiSmoke` does not exist yet.

- [ ] **Step 3: Write the smoke runner**

```ts
// D:\Besawit\src\testing\smoke\core-api.ts
import { Client } from "pg";

import { jsonRequest, readJsonEnv } from "@/testing/smoke/http";

type CoreApiSmokeResult = {
  unauthPalmStatus: number;
  loginStatus: number;
  palmPurchaseStatus: number;
  storeSaleStatus: number;
  manualWhatsappStatus: number;
  financeCheck: {
    sale: { payment_status: string };
    receivable: { status: string; outstanding_amount: string | number };
    payment: { method: string; direction: string };
    cashTx: { category: string; reference_type: string };
  };
};

function firstCookie(setCookie?: string | string[]) {
  const value = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return value ? value.split(";")[0] : null;
}

export async function runCoreApiSmoke(): Promise<CoreApiSmokeResult> {
  const env = readJsonEnv({
    appUrl: "APP_URL",
    appDbUrl: "DATABASE_URL",
  });

  const db = new Client({ connectionString: env.appDbUrl });
  await db.connect();

  try {
    const ids = (
      await db.query(`
        SELECT json_build_object(
          'warehouseId', (SELECT id FROM warehouses ORDER BY created_at ASC LIMIT 1),
          'farmerId', (SELECT id FROM farmers ORDER BY created_at ASC LIMIT 1),
          'driverId', (SELECT id FROM transport_personnel WHERE role = 'driver' ORDER BY created_at ASC LIMIT 1),
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
      `)
    ).rows[0].ids;

    const purchasePayload = {
      purchaseDate: new Date().toISOString().slice(0, 10),
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

    const unauthPalm = await jsonRequest<{ error: string }>({
      method: "POST",
      url: `${env.appUrl}/api/palm/purchases`,
      body: purchasePayload,
    });

    const login = await jsonRequest<{ ok: boolean }>({
      method: "POST",
      url: `${env.appUrl}/api/auth/login`,
      body: {
        email: "owner@besawit.local",
        password: "password123",
      },
    });
    const cookie = firstCookie(login.headers["set-cookie"]);
    if (!cookie) {
      throw new Error("Login smoke did not return a session cookie.");
    }

    const palmPurchase = await jsonRequest<{ id: string }>({
      method: "POST",
      url: `${env.appUrl}/api/palm/purchases`,
      body: purchasePayload,
      cookie,
    });

    const invoiceNumber = `SMOKE-CORE-${Date.now()}`;
    const storeSale = await jsonRequest<{ id: string }>({
      method: "POST",
      url: `${env.appUrl}/api/store/sales`,
      cookie,
      body: {
        transactionDate: new Date().toISOString().slice(0, 10),
        customerId: ids.customerId,
        warehouseId: ids.warehouseId,
        invoiceNumber,
        saleType: "cash",
        dueDate: "",
        discount: 0,
        tax: 0,
        items: [{ productId: ids.productId, quantity: 1, unitPrice: 50000 }],
        notes: "Automated smoke cash sale",
      },
    });

    const manualWhatsapp = await jsonRequest<{ id: string }>({
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

    const financeCheck = (
      await db.query(
        `
          SELECT json_build_object(
            'sale', (SELECT row_to_json(t) FROM (
              SELECT id, payment_status
              FROM store_sales
              WHERE id = $1
            ) t),
            'receivable', (SELECT row_to_json(t) FROM (
              SELECT status, outstanding_amount
              FROM receivables
              WHERE source_type = 'store_sale' AND source_id = $1
              ORDER BY created_at DESC LIMIT 1
            ) t),
            'payment', (SELECT row_to_json(t) FROM (
              SELECT method, direction
              FROM payments
              WHERE receivable_id = (
                SELECT id FROM receivables
                WHERE source_type = 'store_sale' AND source_id = $1
                ORDER BY created_at DESC LIMIT 1
              )
              ORDER BY created_at DESC LIMIT 1
            ) t),
            'cashTx', (SELECT row_to_json(t) FROM (
              SELECT category, reference_type
              FROM cash_transactions
              WHERE reference_id = (
                SELECT id FROM payments
                WHERE receivable_id = (
                  SELECT id FROM receivables
                  WHERE source_type = 'store_sale' AND source_id = $1
                  ORDER BY created_at DESC LIMIT 1
                )
                ORDER BY created_at DESC LIMIT 1
              )
              ORDER BY created_at DESC LIMIT 1
            ) t)
          ) AS payload
        `,
        [storeSale.body.id],
      )
    ).rows[0].payload;

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
  }
}
```

- [ ] **Step 4: Add the CLI wrapper**

```ts
// D:\Besawit\scripts\smoke-core-api.ts
import { runCoreApiSmoke } from "@/testing/smoke/core-api";

runCoreApiSmoke()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
```

- [ ] **Step 5: Run the test and script**

Run:

```bash
npx tsx --test tests/smoke/core-api-smoke.test.ts
npm run smoke:core-api
```

Expected:
- test PASS
- script prints `401`, `200`, `201`, `201`, `201`
- JSON shows `payment_status: "paid"` and `category: "Kas Masuk"`

- [ ] **Step 6: Commit**

```bash
git add src/testing/smoke/core-api.ts scripts/smoke-core-api.ts tests/smoke/core-api-smoke.test.ts package.json
git commit -m "test: automate core api smoke coverage"
```

### Task 3: Trial / Control-Plane Smoke Coverage

**Files:**
- Create: `D:\Besawit\src\testing\smoke\trial-flow.ts`
- Create: `D:\Besawit\scripts\smoke-trial-flow.ts`
- Create: `D:\Besawit\tests\smoke\trial-flow-smoke.test.ts`
- Test: `D:\Besawit\tests\smoke\trial-flow-smoke.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { runTrialFlowSmoke } from "@/testing/smoke/trial-flow";

test("trial flow smoke proves queued request, ready provisioning, setup completion, and single-use token", async () => {
  const result = await runTrialFlowSmoke();

  assert.equal(result.create.status, 200);
  assert.equal(result.create.body.setupUrl, null);
  assert.equal(result.initial.trialStatus, "queued");
  assert.equal(result.ready.trialStatus, "ready");
  assert.equal(result.ready.instanceStatus, "ready");
  assert.equal(result.ready.notification.hasSetupUrl, true);
  assert.equal(result.setup.status, 200);
  assert.equal(result.login.status, 200);
  assert.equal(result.reuse.status, 400);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test tests/smoke/trial-flow-smoke.test.ts
```

Expected: FAIL because `runTrialFlowSmoke` does not exist yet.

- [ ] **Step 3: Write the smoke runner**

```ts
// D:\Besawit\src\testing\smoke\trial-flow.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { Client } from "pg";

import { jsonRequest, readJsonEnv } from "@/testing/smoke/http";

const execFileAsync = promisify(execFile);

export async function runTrialFlowSmoke() {
  const env = readJsonEnv({
    appUrl: "APP_URL",
    controlDbUrl: "CONTROL_DATABASE_URL",
  });

  const unique = Date.now();
  const email = `smoke-trial-${unique}@example.com`;
  const requestedSubdomain = `smoke${unique}`;

  const create = await jsonRequest<{
    ok: boolean;
    requestId: string;
    subdomain: string;
    loginUrl: string;
    setupUrl: string | null;
  }>({
    method: "POST",
    url: `${env.appUrl}/api/trial-requests`,
    body: {
      fullName: "Smoke Trial User",
      companyName: `Smoke Trial ${unique}`,
      email,
      phone: "081234567890",
      city: "Pontianak",
      requestedSubdomain,
      notes: "Automated smoke test trial flow",
    },
  });

  const control = new Client({ connectionString: env.controlDbUrl });
  await control.connect();

  try {
    const initial = (
      await control.query(
        `
          SELECT tr.status AS trial_status, ai.status AS instance_status, ai.subdomain
          FROM trial_requests tr
          JOIN app_instances ai ON ai.trial_request_id = tr.id
          WHERE tr.email = $1
          ORDER BY tr.created_at DESC
          LIMIT 1
        `,
        [email],
      )
    ).rows[0];

    await execFileAsync("npm.cmd", ["run", "worker:provision:once"], {
      cwd: "D:/Besawit",
      env: process.env,
      shell: true,
    });

    const ready = (
      await control.query(
        `
          SELECT
            tr.status AS trial_status,
            ai.id AS instance_id,
            ai.status AS instance_status,
            ai.subdomain,
            pn.status AS notification_status,
            pn.payload
          FROM trial_requests tr
          JOIN app_instances ai ON ai.trial_request_id = tr.id
          LEFT JOIN LATERAL (
            SELECT status, payload
            FROM platform_notifications
            WHERE instance_id = ai.id
            ORDER BY created_at DESC
            LIMIT 1
          ) pn ON true
          WHERE tr.email = $1
          ORDER BY tr.created_at DESC
          LIMIT 1
        `,
        [email],
      )
    ).rows[0];

    const host = `${ready.subdomain}.localhost:6001`;
    const setupUrl = ready.payload.setupUrl as string;
    const setupToken = new URL(setupUrl).searchParams.get("token");

    const setup = await jsonRequest({
      method: "POST",
      url: `${env.appUrl}/api/auth/setup-account`,
      host,
      body: {
        token: setupToken,
        password: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      },
    });

    const login = await jsonRequest({
      method: "POST",
      url: `${env.appUrl}/api/auth/login`,
      host,
      body: {
        email,
        password: "NewPassword123!",
      },
    });

    const reuse = await jsonRequest({
      method: "POST",
      url: `${env.appUrl}/api/auth/setup-account`,
      host,
      body: {
        token: setupToken,
        password: "AnotherPassword123!",
        confirmPassword: "AnotherPassword123!",
      },
    });

    return {
      create,
      initial: {
        trialStatus: initial.trial_status,
        instanceStatus: initial.instance_status,
      },
      ready: {
        trialStatus: ready.trial_status,
        instanceStatus: ready.instance_status,
        notification: {
          status: ready.notification_status,
          hasSetupUrl: Boolean(ready.payload?.setupUrl),
          hasLoginUrl: Boolean(ready.payload?.loginUrl),
        },
      },
      setup,
      login,
      reuse,
    };
  } finally {
    await control.end();
  }
}
```

- [ ] **Step 4: Add the CLI wrapper**

```ts
// D:\Besawit\scripts\smoke-trial-flow.ts
import { runTrialFlowSmoke } from "@/testing/smoke/trial-flow";

runTrialFlowSmoke()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
```

- [ ] **Step 5: Run the test and script**

Run:

```bash
npx tsx --test tests/smoke/trial-flow-smoke.test.ts
npm run smoke:trial-flow
```

Expected:
- test PASS
- script JSON shows `setupUrl: null` at creation
- later JSON shows `trialStatus: "ready"`, `instanceStatus: "ready"`
- final JSON shows setup `200`, login `200`, token reuse `400`

- [ ] **Step 6: Commit**

```bash
git add src/testing/smoke/trial-flow.ts scripts/smoke-trial-flow.ts tests/smoke/trial-flow-smoke.test.ts package.json
git commit -m "test: automate trial flow smoke coverage"
```

### Task 4: Release Gate Documentation

**Files:**
- Create: `D:\Besawit\docs\release-readiness.md`
- Modify: `D:\Besawit\README.md`
- Test: `D:\Besawit\scripts\smoke-core-api.ts`

- [ ] **Step 1: Write the failing doc reference check**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

test("release readiness doc lists the new smoke commands", () => {
  const content = fs.readFileSync("docs/release-readiness.md", "utf8");
  assert.match(content, /npm run smoke:core-api/);
  assert.match(content, /npm run smoke:trial-flow/);
  assert.match(content, /npm run verify:release/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test tests/smoke/release-readiness-doc.test.ts
```

Expected: FAIL because the document does not exist yet.

- [ ] **Step 3: Write the release gate document**

```md
# Release Readiness

## Fresh Database Bootstrap

1. Copy `.env.example` to `.env`.
2. Ensure `DATABASE_URL` points to a fresh app database.
3. Ensure `CONTROL_DATABASE_URL` points to a separate fresh control database.
4. Run `npm run db:migrate`.
5. Run `npm run db:migrate:platform`.
6. Run `npm run db:seed`.

## Mandatory Verification

Run:

```bash
npm run check
npm run test
npm run smoke:core-api
npm run smoke:trial-flow
```

Expected:
- `check` finishes with no errors
- `test` passes
- core API smoke returns `401`, `200`, `201`, `201`, `201`
- trial smoke returns queued creation, ready provisioning, successful setup, successful login, and failed token reuse

## Manual Review Before Commit

1. Confirm no local `.env` secrets are staged.
2. Confirm `drizzle/meta/_journal.json` matches the migration files on disk.
3. Confirm `middleware.ts` exclusions are intentional and all mutating routes still use backend guards.
4. Confirm `temporaryPassword` does not exist under `src/`.
```

- [ ] **Step 4: Link the release doc from README**

```md
Panduan tambahan:
- [docs/release-readiness.md](/d:/Besawit/docs/release-readiness.md)
```

- [ ] **Step 5: Run the doc test and full verification**

Run:

```bash
npx tsx --test tests/smoke/release-readiness-doc.test.ts
npm run verify:release
```

Expected:
- doc test PASS
- release verification finishes successfully on a fresh local environment

- [ ] **Step 6: Commit**

```bash
git add docs/release-readiness.md README.md tests/smoke/release-readiness-doc.test.ts package.json
git commit -m "docs: add release readiness gate"
```

## Self-Review

- Spec coverage: this plan covers the natural next phase after the completed fixes: repeatable app smoke tests, repeatable trial/control-plane smoke tests, and a documented release gate.
- Placeholder scan: no `TODO`, `TBD`, or unspecified “add tests later” steps remain.
- Type consistency: the helper names are consistent across tasks: `jsonRequest`, `readJsonEnv`, `runCoreApiSmoke`, and `runTrialFlowSmoke`.

Plan complete and saved to `docs/superpowers/plans/2026-05-05-post-remediation-release-readiness.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
