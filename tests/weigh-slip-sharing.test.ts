import test from "node:test";
import assert from "node:assert/strict";

import {
  buildShareReadyPrintHref,
  buildWeighSlipPaymentSummary,
} from "@/modules/palm/weigh-slip-sharing";

test("buildShareReadyPrintHref appends margin and shared flag", () => {
  assert.equal(
    buildShareReadyPrintHref("/print/palm-purchases/abc/weigh-slip", "wide"),
    "/print/palm-purchases/abc/weigh-slip?margin=wide&shared=1",
  );
});

test("buildWeighSlipPaymentSummary uses latest payment date when payments exist", () => {
  const summary = buildWeighSlipPaymentSummary({
    payable: {
      code: "PAY-001",
      status: "partial",
      amount: "1500000",
      paidAmount: "500000",
      outstandingAmount: "1000000",
    },
    paymentHistory: [
      {
        paymentDate: "2026-05-05T10:00:00.000Z",
        method: "cash",
      },
      {
        paymentDate: "2026-05-06T09:30:00.000Z",
        method: "bank_transfer",
      },
    ],
  });

  assert.equal(summary.payableCode, "PAY-001");
  assert.equal(summary.paymentStatus, "partial");
  assert.equal(summary.totalAmount, 1500000);
  assert.equal(summary.paidAmount, 500000);
  assert.equal(summary.outstandingAmount, 1000000);
  assert.equal(summary.latestPaymentDate, "2026-05-06T09:30:00.000Z");
  assert.equal(summary.latestPaymentMethod, "bank_transfer");
});

test("buildWeighSlipPaymentSummary falls back cleanly when no payment history exists", () => {
  const summary = buildWeighSlipPaymentSummary({
    payable: {
      code: "PAY-002",
      status: "unpaid",
      amount: "900000",
      paidAmount: "0",
      outstandingAmount: "900000",
    },
    paymentHistory: [],
  });

  assert.equal(summary.latestPaymentDate, null);
  assert.equal(summary.latestPaymentMethod, null);
  assert.equal(summary.paymentStatus, "unpaid");
});
