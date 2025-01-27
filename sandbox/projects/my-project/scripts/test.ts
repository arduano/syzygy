import { gitGetStatus } from "@lib/gitOperations.ts";

(async () => {
  const status = await gitGetStatus();
  console.log(`Current Revision: ${status.revision}`);
})();
