import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { env } from "@/lib/env";
import { controlDb } from "@/lib/platform/control-client";
import { buildInstanceLoginUrl } from "@/lib/platform/instance-url";
import {
  generateTrialSetupToken,
  withTrialSetupMetadata,
} from "@/lib/platform/trial-setup";
import { appInstances, provisionJobs, trialRequests } from "@/lib/platform/schema";
import { toSlug } from "@/lib/utils";
import { trialRequestSchema } from "@/lib/validation/trial";
import { sendEmail } from "@/services/email-service";
import {
  getPlatformLeadInboxEmail,
  resolvePlatformSmtpConfigForDelivery,
} from "@/services/platform-smtp-service";
import { buildTrialRequestLeadEmail } from "@/services/trial-request-email";

type CreateTrialRequestInput = z.infer<typeof trialRequestSchema>;

function buildSubdomainBase(input: CreateTrialRequestInput) {
  const requested = toSlug(input.requestedSubdomain ?? "");
  if (requested) return requested;

  const company = toSlug(input.companyName);
  if (company) return company;

  return `trial-${Math.random().toString(36).slice(2, 8)}`;
}

async function findAvailableSubdomain(base: string) {
  let counter = 0;

  while (counter < 25) {
    const suffix = counter === 0 ? "" : `-${counter + 1}`;
    const candidate = `${base}${suffix}`;
    const [existing] = await controlDb
      .select({ id: appInstances.id })
      .from(appInstances)
      .where(eq(appInstances.subdomain, candidate))
      .limit(1);

    if (!existing) {
      return candidate;
    }

    counter += 1;
  }

  return `${base}-${Date.now().toString(36)}`;
}

export async function createTrialRequest(input: CreateTrialRequestInput) {
  const existingCondition = and(
    eq(trialRequests.email, input.email),
    eq(trialRequests.companyName, input.companyName),
  );

  const [existingRequest] = await controlDb
    .select({
      id: trialRequests.id,
      status: trialRequests.status,
      assignedSubdomain: trialRequests.assignedSubdomain,
      trialEndsAt: trialRequests.trialEndsAt,
      metadata: trialRequests.metadata,
    })
    .from(trialRequests)
    .where(existingCondition)
    .limit(1);

  if (
    existingRequest &&
    ["queued", "provisioning", "ready"].includes(existingRequest.status)
  ) {
    return {
      mode: "existing" as const,
      requestId: existingRequest.id,
      subdomain: existingRequest.assignedSubdomain,
      loginUrl: existingRequest.assignedSubdomain
        ? buildInstanceLoginUrl(existingRequest.assignedSubdomain)
        : null,
      setupUrl: null,
      trialEndsAt: existingRequest.trialEndsAt,
    };
  }

  const subdomain = await findAvailableSubdomain(buildSubdomainBase(input));
  const now = new Date();
  const trialEndsAt = new Date(
    now.getTime() + env.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000,
  );
  const setupToken = generateTrialSetupToken(trialEndsAt);

  const [request] = await controlDb
    .insert(trialRequests)
    .values({
      fullName: input.fullName,
      companyName: input.companyName,
      email: input.email,
      phone: input.phone,
      city: input.city || null,
      notes: input.notes || null,
      requestedSubdomain: input.requestedSubdomain || null,
      assignedSubdomain: subdomain,
      trialStartsAt: now,
      trialEndsAt,
      status: "queued",
      metadata: withTrialSetupMetadata(
        {
          source: "website",
          baseDomain: env.APP_BASE_DOMAIN,
        },
        setupToken.metadata,
      ),
    })
    .returning({
      id: trialRequests.id,
    });

  const [instance] = await controlDb
    .insert(appInstances)
    .values({
      trialRequestId: request.id,
      companyName: input.companyName,
      subdomain,
      instanceType: "trial",
      status: "queued",
      adminEmail: input.email,
      trialStartsAt: now,
      trialEndsAt,
      metadata: {
        contactName: input.fullName,
        phone: input.phone,
        city: input.city || null,
        trialSetup: setupToken.metadata,
      },
    })
    .returning({
      id: appInstances.id,
    });

  await controlDb.insert(provisionJobs).values({
    trialRequestId: request.id,
    instanceId: instance.id,
    jobType: "trial_provision",
    status: "queued",
    payload: {
      subdomain,
      companyName: input.companyName,
      fullName: input.fullName,
      adminEmail: input.email,
      adminPhone: input.phone,
      trialDurationDays: env.TRIAL_DURATION_DAYS,
    },
  });

  const leadInboxEmail = await getPlatformLeadInboxEmail();
  const smtpConfig = await resolvePlatformSmtpConfigForDelivery();

  if (leadInboxEmail && smtpConfig) {
    const leadEmail = buildTrialRequestLeadEmail({
      companyName: input.companyName,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      city: input.city || null,
      requestedSubdomain: input.requestedSubdomain || null,
      assignedSubdomain: subdomain,
      notes: input.notes || null,
      requestId: request.id,
      createdAt: now,
    });

    void sendEmail(
      {
        to: leadInboxEmail,
        subject: leadEmail.subject,
        text: leadEmail.text,
        html: leadEmail.html,
        replyTo: input.email,
      },
      smtpConfig,
    ).catch(() => {
      // Lead notification should never block trial request creation.
    });
  }

  return {
    mode: "created" as const,
    requestId: request.id,
    instanceId: instance.id,
    subdomain,
    loginUrl: buildInstanceLoginUrl(subdomain),
    setupUrl: null,
    trialEndsAt,
  };
}
