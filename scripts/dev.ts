import { spawn, type ChildProcess } from "node:child_process";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const nextBin = require.resolve("next/dist/bin/next");
const tsxBin = require.resolve("tsx/cli");

const args = process.argv.slice(2);
const skipWorker =
  args.includes("--no-worker") || process.env.BESAWIT_DISABLE_PROVISION_WORKER === "1";
const nextArgs = args.filter((arg) => arg !== "--no-worker");
const hasBundlerFlag = nextArgs.includes("--webpack") || nextArgs.includes("--turbopack");
const resolvedNextArgs =
  process.platform === "win32" && !hasBundlerFlag
    ? ["--webpack", ...nextArgs]
    : nextArgs;

const children = new Set<ChildProcess>();
let shuttingDown = false;

function withNodeOptions(extraOptions: string) {
  const currentOptions = process.env.NODE_OPTIONS?.trim();
  return currentOptions ? `${currentOptions} ${extraOptions}` : extraOptions;
}

function startProcess(
  label: string,
  command: string,
  commandArgs: string[],
  extraEnv?: Record<string, string | undefined>,
) {
  const child = spawn(command, commandArgs, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  children.add(child);

  child.on("exit", (code, signal) => {
    children.delete(child);

    if (shuttingDown) {
      return;
    }

    if (code && code !== 0) {
      console.error(`${label} exited with code ${code}.`);
    } else if (signal) {
      console.error(`${label} exited with signal ${signal}.`);
    }

    shutdown(code ?? 0);
  });

  child.on("error", (error) => {
    console.error(`Failed to start ${label}.`, error);
    shutdown(1);
  });

  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    }
  }, 1500).unref();

  process.exitCode = exitCode;
}

function terminateChildren() {
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("exit", terminateChildren);

startProcess("next dev", process.execPath, [nextBin, "dev", ...resolvedNextArgs], {
  NODE_OPTIONS: withNodeOptions("--max-old-space-size=12288"),
});

if (!skipWorker) {
  startProcess("provision worker", process.execPath, [tsxBin, "scripts/process-provision-jobs.ts"]);
} else {
  console.log("Provision worker disabled for this dev session.");
}
