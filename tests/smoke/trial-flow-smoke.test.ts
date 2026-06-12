import assert from "node:assert/strict";
import test from "node:test";

import { runTrialFlowSmoke } from "@/testing/smoke/trial-flow";

test("trial flow smoke proves queued request, ready provisioning, setup completion, and single-use token", async () => {
  const originalAppUrl = process.env.APP_URL;
  const originalControlDbUrl = process.env.CONTROL_DATABASE_URL;

  process.env.APP_URL = "http://localhost:6001";
  process.env.CONTROL_DATABASE_URL =
    "postgresql://postgres:postgres@localhost:7000/besawit_control";

  try {
    const result = await runTrialFlowSmoke();

    assert.equal(result.create.status, 200);
    assert.equal(result.create.body.setupUrl, null);
    assert.equal(result.initial.trialStatus, "queued");
    assert.equal(result.ready.trialStatus, "ready");
    assert.equal(result.ready.instanceStatus, "ready");
    assert.equal(result.ready.notification.hasSetupUrl, true);
    assert.equal(result.ready.notification.hasLoginUrl, true);
    assert.equal(result.setup.status, 200);
    assert.equal(result.login.status, 200);
    assert.equal(result.reuse.status, 400);
  } finally {
    if (originalAppUrl === undefined) {
      delete process.env.APP_URL;
    } else {
      process.env.APP_URL = originalAppUrl;
    }

    if (originalControlDbUrl === undefined) {
      delete process.env.CONTROL_DATABASE_URL;
    } else {
      process.env.CONTROL_DATABASE_URL = originalControlDbUrl;
    }
  }
});
