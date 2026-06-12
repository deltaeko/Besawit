import { createHash, randomBytes } from "node:crypto";

import { buildInstanceLoginUrl } from "@/lib/platform/instance-url";

const TRIAL_SETUP_TOKEN_TTL_MS = 72 * 60 * 60 * 1000;

export type TrialSetupMetadata = {
  tokenHash: string;
  issuedAt: string;
  expiresAt: string;
  usedAt?: string | null;
};

function readMetadataRecord(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return metadata as Record<string, unknown>;
}

export function hashTrialSetupToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateTrialSetupToken(expiresAt?: Date) {
  const token = randomBytes(32).toString("hex");
  const issuedAt = new Date();

  return {
    token,
    metadata: {
      tokenHash: hashTrialSetupToken(token),
      issuedAt: issuedAt.toISOString(),
      expiresAt: (expiresAt ?? new Date(issuedAt.getTime() + TRIAL_SETUP_TOKEN_TTL_MS)).toISOString(),
      usedAt: null,
    } satisfies TrialSetupMetadata,
  };
}

export function readTrialSetupMetadata(metadata: unknown): TrialSetupMetadata | null {
  const value = readMetadataRecord(metadata).trialSetup;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const tokenHash = typeof record.tokenHash === "string" ? record.tokenHash : null;
  const issuedAt = typeof record.issuedAt === "string" ? record.issuedAt : null;
  const expiresAt = typeof record.expiresAt === "string" ? record.expiresAt : null;
  const usedAt =
    typeof record.usedAt === "string" || record.usedAt === null ? record.usedAt ?? null : null;

  if (!tokenHash || !issuedAt || !expiresAt) {
    return null;
  }

  return {
    tokenHash,
    issuedAt,
    expiresAt,
    usedAt,
  };
}

export function withTrialSetupMetadata(metadata: unknown, trialSetup: TrialSetupMetadata) {
  return {
    ...readMetadataRecord(metadata),
    trialSetup,
  };
}

export function markTrialSetupUsed(metadata: unknown, usedAt = new Date()) {
  const existing = readTrialSetupMetadata(metadata);
  if (!existing) {
    return metadata;
  }

  return withTrialSetupMetadata(metadata, {
    ...existing,
    usedAt: usedAt.toISOString(),
  });
}

export function buildTrialSetupUrl(subdomain: string, token: string) {
  const url = new URL("/setup-account", buildInstanceLoginUrl(subdomain));
  url.searchParams.set("token", token);
  return url.toString();
}
