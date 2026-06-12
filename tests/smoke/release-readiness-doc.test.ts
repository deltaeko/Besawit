import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("release readiness doc lists separated DB setup and release gate commands", () => {
  const content = fs.readFileSync("docs/release-readiness.md", "utf8");

  assert.match(content, /DATABASE_URL/);
  assert.match(content, /CONTROL_DATABASE_URL/);
  assert.match(content, /npm run db:migrate/);
  assert.match(content, /npm run db:migrate:platform/);
  assert.match(content, /npm run smoke:core-api/);
  assert.match(content, /npm run smoke:trial-flow/);
  assert.match(content, /npm run verify:release/);
});
