import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const repoRoot = "D:/Besawit";

function read(filePath: string) {
  return fs.readFileSync(path.join(repoRoot, filePath), "utf8");
}

test("mutating API routes use backend auth or permission guards", () => {
  const guardedRoutes = [
    "src/app/api/palm/purchases/route.ts",
    "src/app/api/palm/sales/route.ts",
    "src/app/api/store/purchases/route.ts",
    "src/app/api/store/sales/route.ts",
    "src/app/api/documents/route.ts",
    "src/app/api/whatsapp/send/route.ts",
    "src/app/api/master/[entity]/route.ts",
    "src/app/api/master/[entity]/[id]/route.ts",
    "src/app/api/master/[entity]/[id]/status/route.ts",
  ];

  const guardPattern =
    /requireActionPermission|requirePermission|requireMasterEntityPermission|requireReferenceTypePermission|requireDocumentPermission|canAccessPermission/;

  for (const filePath of guardedRoutes) {
    assert.match(read(filePath), guardPattern, `${filePath} should enforce auth/RBAC.`);
  }
});

test("plaintext temporary password exposure is removed", () => {
  const srcRoot = path.join(repoRoot, "src");
  const files: string[] = [];

  function walk(currentPath: string) {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const nextPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(nextPath);
        continue;
      }

      if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        files.push(nextPath);
      }
    }
  }

  walk(srcRoot);

  const matches = files.filter((filePath) =>
    fs.readFileSync(filePath, "utf8").includes("temporaryPassword"),
  );

  assert.deepEqual(matches, []);
});

test("core business flows are wrapped in transaction boundaries", () => {
  const transactionalFiles = [
    "src/services/palm-service.ts",
    "src/services/store-service.ts",
    "src/services/finance-service.ts",
    "src/services/inventory-service.ts",
  ];

  for (const filePath of transactionalFiles) {
    assert.match(read(filePath), /runInDbTransaction/, `${filePath} should use runInDbTransaction.`);
  }
});

test("inventory mutation uses row locking", () => {
  assert.match(read("src/services/inventory-service.ts"), /for update/i);
});

test("cash store sales flow posts payment through finance service", () => {
  const content = read("src/services/store-service.ts");
  assert.match(content, /const receivable = await createReceivableEntry/);
  assert.match(content, /await postPayment\(/);
  assert.match(content, /const finalSale = await getStoreSaleById\(sale\.id\)/);
  assert.match(content, /return finalSale \?\? sale/);
});

test("tenant db pools are cached through a shared registry", () => {
  const content = read("src/lib/db/client.ts");
  assert.match(content, /poolsByConnectionString \?\? new Map<string, Pool>\(\)/);
  assert.match(content, /poolsByConnectionString\.set\(connectionString, tenantPool\)/);
});

test("manual document and whatsapp logging no longer rely on dashboard permission", () => {
  const guardContent = read("src/lib/auth/api-guard.ts");
  assert.doesNotMatch(guardContent, /manual:\s*"dashboard\.view"/);
  assert.match(guardContent, /payable_statement:\s*"finance\.payables\.view"/);
  assert.match(guardContent, /receivable_statement:\s*"finance\.receivables\.view"/);
  assert.match(read("src/app/api/documents/route.ts"), /requireDocumentPermission/);
  assert.match(read("src/app/api/whatsapp/send/route.ts"), /documentType wajib diisi untuk referensi manual/);
});
