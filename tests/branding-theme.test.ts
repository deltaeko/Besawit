import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBrandTheme,
  hexToRgbChannels,
  withHexAlpha,
} from "@/lib/branding-theme";

test("hex helpers normalize branding colors", () => {
  assert.equal(hexToRgbChannels("#22543d"), "34 84 61");
  assert.equal(withHexAlpha("#22543d", 0.08), "#22543d14");
  assert.equal(withHexAlpha("#f6e05e", 0.22), "#f6e05e38");
});

test("buildBrandTheme maps branding colors into css variables", () => {
  const theme = buildBrandTheme({
    primaryColor: "#22543d",
    accentColor: "#f6e05e",
  });

  assert.equal(theme["--brand-primary"], "#22543d");
  assert.equal(theme["--brand-primary-rgb"], "34 84 61");
  assert.equal(theme["--brand-accent"], "#f6e05e");
  assert.equal(theme["--brand-accent-rgb"], "246 224 94");
  assert.equal(theme["--primary"], "#22543d");
  assert.equal(theme["--ring"], "#22543d");
  assert.equal(theme["--secondary"], "#22543d14");
  assert.equal(theme["--accent"], "#f6e05e38");
});
