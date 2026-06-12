import { headers } from "next/headers";

import { env } from "@/lib/env";
import { controlDb } from "@/lib/platform/control-client";
import { appInstances } from "@/lib/platform/schema";
import { eq } from "drizzle-orm";

export type TenantContext =
  | {
      kind: "base";
      host: string | null;
      hostname: string | null;
    }
  | {
      kind: "tenant";
      host: string;
      hostname: string;
      subdomain: string;
      instance:
        | {
            id: string;
            companyName: string;
            status: typeof appInstances.$inferSelect.status;
            databaseUrl: string | null;
            trialEndsAt: Date | null;
            instanceType: typeof appInstances.$inferSelect.instanceType;
            adminEmail: string | null;
            metadata: typeof appInstances.$inferSelect.metadata;
          }
        | null;
    };

function stripPort(host: string) {
  return host.replace(/:\d+$/, "").toLowerCase();
}

function normalizeBaseDomain(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
}

function parseSubdomain(hostname: string) {
  const baseDomain = normalizeBaseDomain(env.APP_BASE_DOMAIN);
  const appHostname = normalizeBaseDomain(new URL(env.APP_URL).hostname);

  if (hostname === "localhost") {
    return null;
  }

  if (hostname.endsWith(".localhost")) {
    return hostname.slice(0, -".localhost".length) || null;
  }

  if (hostname === baseDomain || hostname === appHostname) {
    return null;
  }

  if (hostname === `www.${baseDomain}` || hostname === `www.${appHostname}`) {
    return null;
  }

  if (hostname.endsWith(`.${baseDomain}`)) {
    return hostname.slice(0, -1 * (`.${baseDomain}`.length));
  }

  if (hostname.endsWith(`.${appHostname}`)) {
    return hostname.slice(0, -1 * (`.${appHostname}`.length));
  }

  return null;
}

export async function resolveTenantContextByHost(
  host: string | null | undefined,
): Promise<TenantContext> {
  if (!host) {
    return {
      kind: "base",
      host: null,
      hostname: null,
    } satisfies TenantContext;
  }

  const hostname = stripPort(host);
  const subdomain = parseSubdomain(hostname);

  if (!subdomain) {
    return {
      kind: "base",
      host,
      hostname,
    } satisfies TenantContext;
  }

  const [instance] = await controlDb
    .select({
      id: appInstances.id,
      companyName: appInstances.companyName,
      status: appInstances.status,
      databaseUrl: appInstances.databaseUrl,
      trialEndsAt: appInstances.trialEndsAt,
      instanceType: appInstances.instanceType,
      adminEmail: appInstances.adminEmail,
      metadata: appInstances.metadata,
    })
    .from(appInstances)
    .where(eq(appInstances.subdomain, subdomain))
    .limit(1);

  return {
    kind: "tenant",
    host,
    hostname,
    subdomain,
    instance: instance ?? null,
  } satisfies TenantContext;
}

export async function resolveTenantContextFromRequest(): Promise<TenantContext> {
  try {
    const headerStore = await headers();
    return resolveTenantContextByHost(headerStore.get("host"));
  } catch {
    return {
      kind: "base",
      host: null,
      hostname: null,
    } satisfies TenantContext;
  }
}

export async function getReadyTenantContextFromRequest() {
  const context = await resolveTenantContextFromRequest();

  if (context.kind !== "tenant") {
    return null;
  }

  if (!context.instance || context.instance.status !== "ready") {
    return context;
  }

  if (!context.instance.databaseUrl) {
    return context;
  }

  return context;
}
