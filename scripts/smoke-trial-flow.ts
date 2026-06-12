import "dotenv/config";

import { runTrialFlowSmoke } from "@/testing/smoke/trial-flow";

runTrialFlowSmoke()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
