import test from "node:test";
import assert from "node:assert/strict";

import { buildTrialReadyEmail } from "@/services/trial-ready-email";
import { buildTrialRequestLeadEmail } from "@/services/trial-request-email";

test("buildTrialReadyEmail includes setup and login links", () => {
  const result = buildTrialReadyEmail({
    companyName: "Sawit Jaya",
    subdomain: "sawit-jaya",
    loginUrl: "http://sawit-jaya.localhost:6001",
    setupUrl: "http://sawit-jaya.localhost:6001/setup-account?token=abc",
    adminEmail: "owner@sawit.test",
    trialEndsAt: new Date("2026-05-20T10:00:00.000Z"),
  });

  assert.match(result.subject, /Sawit Jaya/);
  assert.match(result.text, /setup-account\?token=abc/);
  assert.match(result.text, /owner@sawit\.test/);
  assert.match(result.html, /Buat Password Admin/);
  assert.match(result.html, /sawit-jaya\.localhost:6001/);
});

test("buildTrialRequestLeadEmail includes lead summary", () => {
  const result = buildTrialRequestLeadEmail({
    companyName: "Sawit Jaya",
    fullName: "Budi",
    email: "budi@sawit.test",
    phone: "08123456789",
    city: "Medan",
    requestedSubdomain: "sawit-jaya",
    assignedSubdomain: "sawit-jaya",
    notes: "Butuh demo cepat",
    requestId: "req-123",
    createdAt: new Date("2026-05-20T10:00:00.000Z"),
  });

  assert.match(result.subject, /Trial request baru/);
  assert.match(result.text, /Budi/);
  assert.match(result.text, /req-123/);
  assert.match(result.html, /Lead trial baru masuk/);
});
