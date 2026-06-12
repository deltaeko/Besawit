import assert from "node:assert/strict";
import test from "node:test";

import { decryptPlatformSecret, encryptPlatformSecret } from "@/lib/platform/smtp-crypto";

test("platform SMTP secret round-trips through encryption", () => {
  const encrypted = encryptPlatformSecret("smtp-password-123");
  const decrypted = decryptPlatformSecret(encrypted);

  assert.equal(decrypted, "smtp-password-123");
  assert.notEqual(encrypted, "smtp-password-123");
});

test("platform SMTP secret rejects malformed payload", () => {
  assert.throws(() => decryptPlatformSecret("invalid-payload"));
});
