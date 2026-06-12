import { spawn, type ChildProcess } from "node:child_process";
import http from "node:http";
import https from "node:https";
import { setTimeout as delay } from "node:timers/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tsxBin = require.resolve("tsx/cli");

type ServerState = {
  child: ChildProcess | null;
  readyPromise: Promise<void> | null;
  refCount: number;
  external: boolean;
};

const serverStateByUrl = new Map<string, ServerState>();

function getState(appUrl: string) {
  let state = serverStateByUrl.get(appUrl);
  if (!state) {
    state = {
      child: null,
      readyPromise: null,
      refCount: 0,
      external: false,
    };
    serverStateByUrl.set(appUrl, state);
  }

  return state;
}

async function isServerReachable(appUrl: string) {
  const target = new URL(appUrl);
  const transport = target.protocol === "https:" ? https : http;

  return new Promise<boolean>((resolve) => {
    const req = transport.request(
      {
        hostname: target.hostname,
        port: target.port || (target.protocol === "https:" ? 443 : 80),
        path: "/",
        method: "GET",
      },
      (res) => {
        res.resume();
        resolve((res.statusCode ?? 0) > 0);
      },
    );

    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function waitForServer(appUrl: string, timeoutMs = 60_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReachable(appUrl)) {
      return;
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for app server at ${appUrl}.`);
}

function startServerProcess(appUrl: string) {
  const target = new URL(appUrl);
  const port = target.port || "3000";

  return spawn(
    process.execPath,
    [tsxBin, "scripts/dev.ts", "--no-worker", "--port", port],
    {
      cwd: "D:/Besawit",
      env: {
        ...process.env,
        BESAWIT_DISABLE_PROVISION_WORKER: "1",
      },
      stdio: "ignore",
      windowsHide: true,
    },
  );
}

export async function ensureLocalAppServer(appUrl: string) {
  const state = getState(appUrl);
  state.refCount += 1;

  if (state.child || state.external) {
    if (state.readyPromise) {
      await state.readyPromise;
    }
    return;
  }

  if (await isServerReachable(appUrl)) {
    state.external = true;
    return;
  }

  state.child = startServerProcess(appUrl);
  state.readyPromise = waitForServer(appUrl).catch((error) => {
    state.child?.kill("SIGTERM");
    state.child = null;
    state.readyPromise = null;
    state.refCount = Math.max(0, state.refCount - 1);
    throw error;
  });

  state.child.once("exit", () => {
    state.child = null;
    state.readyPromise = null;
    state.external = false;
  });

  await state.readyPromise;
}

export async function releaseLocalAppServer(appUrl: string) {
  const state = getState(appUrl);

  if (state.refCount > 0) {
    state.refCount -= 1;
  }

  if (state.external || state.refCount > 0 || !state.child) {
    return;
  }

  const child = state.child;
  state.child = null;
  state.readyPromise = null;
  state.external = false;

  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
    setTimeout(() => {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
      resolve();
    }, 3_000).unref();
  });
}
