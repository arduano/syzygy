import type { SyzygyConfig } from "@/server/config/syzygyConfig.ts";
import path from "node:path";

const specifiedSandboxDir = Deno.env.get("SANDBOX_DIR");
const guessedSandboxDir = Deno.env.get("DEV") ? "./sandbox" : "./";

const dir = specifiedSandboxDir ?? guessedSandboxDir;

if (!dir) {
  throw new Error(
    "SANDBOX_DIR not set. Set it to the directory where the sandbox is located."
  );
}

const configPath = path.join(dir, "syzygy.ts");
let importedConfigRaw: { default: SyzygyConfig } | undefined;
try {
  importedConfigRaw = await import(configPath);
} catch (e) {
  console.error(e);
  console.error();
  console.error("Failed to import config from", configPath);
  console.error(
    "Make sure you have a correct syzygy.ts config file in your sandbox directory."
  );
  Deno.exit(1);
}

if (!importedConfigRaw || !importedConfigRaw.default) {
  console.error(
    "Failed to import config from",
    configPath,
    "- expected a default export"
  );
  console.error(importedConfigRaw);
  Deno.exit(1);
}

export const sandboxDir = dir;
export const syzygyConfig = importedConfigRaw!.default;
