import "dotenv/config";

import { controlPool } from "../src/lib/platform/control-client";
import { runProvisionWorker } from "../src/services/provisioning-service";

const once = process.argv.includes("--once");

async function main() {
  await runProvisionWorker({ once });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await controlPool.end();
  });
