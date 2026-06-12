import "dotenv/config";

import { runCoreApiSmoke } from "@/testing/smoke/core-api";

runCoreApiSmoke()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
