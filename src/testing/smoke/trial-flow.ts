import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { Client } from "pg";

import { ensureLocalAppServer, releaseLocalAppServer } from "@/testing/smoke/app-server";
import { jsonRequest, readJsonEnv } from "@/testing/smoke/http";

const execFileAsync = promisify(execFile);

type TrialCreateResponse = {
  ok: boolean;
  mode: "created" | "existing";
  requestId: string;
  subdomain: string;
  loginUrl: string | null;
  setupUrl: string | null;
  contactWhatsapp: string | null;
};

type TrialSetupResponse = {
  ok?: boolean;
  email?: string;
  error?: string;
};

type TrialLoginResponse = {
  ok?: boolean;
  firstLogin?: boolean;
  error?: string;
};

type TrialFlowSmokeResult = {
  create: {
    status: number;
    body: TrialCreateResponse;
  };
  initial: {
    trialStatus: string;
    instanceStatus: string;
  };
  ready: {
    trialStatus: string;
    instanceStatus: string;
    notification: {
      status: string | null;
      hasSetupUrl: boolean;
      hasLoginUrl: boolean;
    };
  };
  setup: {
    status: number;
    body: TrialSetupResponse;
  };
  login: {
    status: number;
    body: TrialLoginResponse;
  };
  reuse: {
    status: number;
    body: TrialSetupResponse;
  };
};

type InitialTrialRow = {
  trial_status: string;
  instance_status: string;
};

type ReadyTrialRow = {
  trial_status: string;
  instance_status: string;
  subdomain: string;
  notification_status: string | null;
  payload: {
    loginUrl?: string;
    setupUrl?: string;
  } | null;
};

function buildTenantHost(appUrl: string, subdomain: string) {
  const target = new URL(appUrl);
  const port = target.port ? `:${target.port}` : "";
  return `${subdomain}.${target.hostname}${port}`;
}

async function runProvisionWorkerOnce(cwd: string) {
  await execFileAsync(
    process.execPath,
    [
      "D:\\Besawit\\node_modules\\tsx\\dist\\cli.mjs",
      "scripts/process-provision-jobs.ts",
      "--once",
    ],
    {
    cwd,
    env: process.env,
    windowsHide: true,
    },
  );
}

async function fetchInitialState(
  control: Client,
  email: string,
): Promise<InitialTrialRow> {
  const result = await control.query<InitialTrialRow>(
    `
      SELECT
        tr.status AS trial_status,
        ai.status AS instance_status
      FROM trial_requests tr
      JOIN app_instances ai ON ai.trial_request_id = tr.id
      WHERE tr.email = $1
      ORDER BY tr.created_at DESC
      LIMIT 1
    `,
    [email],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Smoke trial request was not persisted in control DB.");
  }

  return row;
}

async function fetchReadyState(
  control: Client,
  email: string,
): Promise<ReadyTrialRow> {
  const result = await control.query<ReadyTrialRow>(
    `
      SELECT
        tr.status AS trial_status,
        ai.status AS instance_status,
        ai.subdomain,
        pn.status AS notification_status,
        pn.payload
      FROM trial_requests tr
      JOIN app_instances ai ON ai.trial_request_id = tr.id
      LEFT JOIN LATERAL (
        SELECT status, payload
        FROM platform_notifications
        WHERE instance_id = ai.id
        ORDER BY created_at DESC
        LIMIT 1
      ) pn ON true
      WHERE tr.email = $1
      ORDER BY tr.created_at DESC
      LIMIT 1
    `,
    [email],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Smoke trial instance was not found after provisioning.");
  }

  return row;
}

async function waitForReadyState(
  control: Client,
  email: string,
  options?: { attempts?: number },
): Promise<ReadyTrialRow> {
  const attempts = options?.attempts ?? 8;
  let latest: ReadyTrialRow | null = null;

  for (let index = 0; index < attempts; index += 1) {
    await runProvisionWorkerOnce("D:\\Besawit");
    latest = await fetchReadyState(control, email);

    if (
      latest.trial_status === "ready" &&
      latest.instance_status === "ready" &&
      latest.payload?.setupUrl
    ) {
      return latest;
    }
  }

  throw new Error(
    latest
      ? `Trial instance did not become ready after ${attempts} worker runs. Latest state: ${latest.trial_status}/${latest.instance_status}.`
      : `Trial instance did not become ready after ${attempts} worker runs.`,
  );
}

export async function runTrialFlowSmoke(): Promise<TrialFlowSmokeResult> {
  const env = readJsonEnv({
    appUrl: "APP_URL",
    controlDbUrl: "CONTROL_DATABASE_URL",
  });

  await ensureLocalAppServer(env.appUrl);

  const unique = Date.now();
  const email = `smoke-trial-${unique}@example.com`;
  const requestedSubdomain = `smoke${unique}`;
  const control = new Client({ connectionString: env.controlDbUrl });

  const create = await jsonRequest<TrialCreateResponse>({
    method: "POST",
    url: `${env.appUrl}/api/trial-requests`,
    body: {
      fullName: "Smoke Trial User",
      companyName: `Smoke Trial ${unique}`,
      email,
      phone: "081234567890",
      city: "Pontianak",
      requestedSubdomain,
      notes: "Automated smoke test trial flow",
    },
  });

  await control.connect();

  try {
    const initial = await fetchInitialState(control, email);
    const ready = await waitForReadyState(control, email);
    const setupUrl = ready.payload?.setupUrl;

    if (!setupUrl) {
      throw new Error("Trial ready notification did not contain a setup URL.");
    }

    const setupToken = new URL(setupUrl).searchParams.get("token");
    if (!setupToken) {
      throw new Error("Trial setup URL did not include a token.");
    }

    const host = buildTenantHost(env.appUrl, ready.subdomain);

    const setup = await jsonRequest<TrialSetupResponse>({
      method: "POST",
      url: `${env.appUrl}/api/auth/setup-account`,
      host,
      body: {
        token: setupToken,
        password: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      },
    });

    const login = await jsonRequest<TrialLoginResponse>({
      method: "POST",
      url: `${env.appUrl}/api/auth/login`,
      host,
      body: {
        email,
        password: "NewPassword123!",
      },
    });

    const reuse = await jsonRequest<TrialSetupResponse>({
      method: "POST",
      url: `${env.appUrl}/api/auth/setup-account`,
      host,
      body: {
        token: setupToken,
        password: "AnotherPassword123!",
        confirmPassword: "AnotherPassword123!",
      },
    });

    return {
      create: {
        status: create.status,
        body: create.body,
      },
      initial: {
        trialStatus: initial.trial_status,
        instanceStatus: initial.instance_status,
      },
      ready: {
        trialStatus: ready.trial_status,
        instanceStatus: ready.instance_status,
        notification: {
          status: ready.notification_status,
          hasSetupUrl: Boolean(ready.payload?.setupUrl),
          hasLoginUrl: Boolean(ready.payload?.loginUrl),
        },
      },
      setup: {
        status: setup.status,
        body: setup.body,
      },
      login: {
        status: login.status,
        body: login.body,
      },
      reuse: {
        status: reuse.status,
        body: reuse.body,
      },
    };
  } finally {
    await control.end();
    await releaseLocalAppServer(env.appUrl);
  }
}
