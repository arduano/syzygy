import { z } from "zod";
import type { DenoPermissions } from "./permissions.ts";

const denoSysPermissionEnum = z.enum([
  "hostname",
  "osRelease",
  "osUptime",
  "loadavg",
  "networkInterfaces",
  "systemMemoryInfo",
  "uid",
  "gid",
]);

const denoPermissionsSchema = z.object({
  allowRead: z.union([z.literal(true), z.array(z.string())]).optional(),
  denyRead: z.array(z.string()).optional(),
  allowWrite: z.union([z.literal(true), z.array(z.string())]).optional(),
  denyWrite: z.array(z.string()).optional(),
  allowNet: z.union([z.literal(true), z.array(z.string())]).optional(),
  denyNet: z.array(z.string()).optional(),
  allowEnv: z.union([z.literal(true), z.array(z.string())]).optional(),
  denyEnv: z.array(z.string()).optional(),
  allowSys: z
    .union([z.literal(true), z.array(denoSysPermissionEnum)])
    .optional(),
  denySys: z.array(denoSysPermissionEnum).optional(),
  allowRun: z.union([z.literal(true), z.array(z.string())]).optional(),
  denyRun: z.array(z.string()).optional(),
  allowFfi: z.union([z.literal(true), z.array(z.string())]).optional(),
  denyFfi: z.array(z.string()).optional(),
  allowImport: z.union([z.literal(true), z.array(z.string())]).optional(),
  allowScripts: z.union([z.literal(true), z.array(z.string())]).optional(),
  denyScripts: z.array(z.string()).optional(),
});

export const projectConfigSchema = z.object({
  name: z.string(),
  createdAt: z.string(),
  workdir: z.string(),
  permissions: denoPermissionsSchema,
});

export type ProjectConfig = z.infer<typeof projectConfigSchema>;

export function createDefaultConfig(args: {
  name: string;
  workdir: string;
}): ProjectConfig {
  return {
    name: args.name,
    createdAt: new Date().toISOString(),
    workdir: args.workdir,
    permissions: {
      allowRead: [],
      allowWrite: [],
      allowNet: [],
      allowRun: [],
      allowEnv: [],
      allowFfi: [],
      allowImport: [],
      allowScripts: [],
    },
  };
}
