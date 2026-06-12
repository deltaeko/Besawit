import { eq } from "drizzle-orm";

import { controlDb } from "@/lib/platform/control-client";
import { appInstances, platformAdminEvents } from "@/lib/platform/schema";
import { logAudit } from "@/services/audit-service";

export async function logSupportWhatsappClick(input: {
  actorId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  href: string;
  label: string;
  message: string;
  phone: string;
  source?: string | null;
  pathname?: string | null;
  host?: string | null;
}) {
  const hostname = input.host?.replace(/:\d+$/, "").toLowerCase() ?? null;
  const subdomain =
    hostname && hostname.endsWith(".localhost")
      ? hostname.slice(0, -".localhost".length) || null
      : null;
  const [instance] = subdomain
    ? await controlDb
        .select({
          id: appInstances.id,
          trialRequestId: appInstances.trialRequestId,
        })
        .from(appInstances)
        .where(eq(appInstances.subdomain, subdomain))
        .limit(1)
    : [];

  await logAudit({
    entityType: "support_contact",
    action: "whatsapp_click",
    actorId: input.actorId ?? null,
    metadata: {
      channel: "whatsapp",
      href: input.href,
      label: input.label,
      phone: input.phone,
      message: input.message,
      source: input.source ?? null,
      pathname: input.pathname ?? null,
      host: input.host ?? null,
    },
  });

  await controlDb.insert(platformAdminEvents).values({
    trialRequestId: instance?.trialRequestId ?? null,
    instanceId: instance?.id ?? null,
    action: "support_whatsapp_click",
    actorUserId: input.actorId ?? null,
    actorName: input.actorName ?? "Guest",
    actorEmail: input.actorEmail ?? "guest@support.local",
    payload: {
      channel: "whatsapp",
      href: input.href,
      label: input.label,
      phone: input.phone,
      message: input.message,
      source: input.source ?? null,
      pathname: input.pathname ?? null,
      host: input.host ?? null,
      subdomain,
    },
  });
}
