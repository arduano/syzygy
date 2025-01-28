import { nanoid } from "nanoid";
import { scriptDb } from "./scriptDb.ts";
import * as path from "node:path";

interface ExecutionResult {
  stdout: string;
  stderr: string;
  merged: string;
  exitCode: number;
}

export interface DenoPermissions {
  // File system permissions
  allowRead?: true | string[];
  denyRead?: string[];
  allowWrite?: true | string[];
  denyWrite?: string[];

  // Network permissions
  allowNet?: true | string[];
  denyNet?: string[];

  // Environment permissions
  allowEnv?: true | string[];
  denyEnv?: string[];

  // System information permissions
  allowSys?: true | Array<
    | "hostname"
    | "osRelease"
    | "osUptime"
    | "loadavg"
    | "networkInterfaces"
    | "systemMemoryInfo"
    | "uid"
    | "gid"
  >;
  denySys?: Array<
    | "hostname"
    | "osRelease"
    | "osUptime"
    | "loadavg"
    | "networkInterfaces"
    | "systemMemoryInfo"
    | "uid"
    | "gid"
  >;

  // Subprocess permissions
  allowRun?: true | string[];
  denyRun?: string[];

  // FFI permissions
  allowFfi?: true | string[];
  denyFfi?: string[];

  // Import permissions
  allowImport?: true | string[];

  // Script permissions
  allowScripts?: true | string[];
  denyScripts?: string[];
}

function buildDenoPermissionFlags(permissions: DenoPermissions): string[] {
  const flags: string[] = [];

  // Helper function to add permission flags
  const addPermissionFlag = (
    flag: string,
    allowed?: true | string[],
    denied?: string[]
  ) => {
    if (allowed === true) {
      flags.push(`--allow-${flag}`);
    } else if (Array.isArray(allowed) && allowed.length) {
      flags.push(`--allow-${flag}=${allowed.join(",")}`);
    }
    if (denied?.length) {
      flags.push(`--deny-${flag}=${denied.join(",")}`);
    }
  };

  // Add all permission flags
  addPermissionFlag("read", permissions.allowRead, permissions.denyRead);
  addPermissionFlag("write", permissions.allowWrite, permissions.denyWrite);
  addPermissionFlag("net", permissions.allowNet, permissions.denyNet);
  addPermissionFlag("env", permissions.allowEnv, permissions.denyEnv);
  addPermissionFlag("sys", permissions.allowSys, permissions.denySys);
  addPermissionFlag("run", permissions.allowRun, permissions.denyRun);
  addPermissionFlag("ffi", permissions.allowFfi, permissions.denyFfi);
  addPermissionFlag("scripts", permissions.allowScripts, permissions.denyScripts);

  if (permissions.allowImport === true) {
    flags.push(`--import`);
  } else if (Array.isArray(permissions.allowImport) && permissions.allowImport.length) {
    flags.push(`--import=${permissions.allowImport.join(",")}`);
  }

  return flags;
}

export async function executeScript(args: {
  projectName: string;
  code: string;
  permissions: DenoPermissions;
  onProgress?: (data: string) => void;
  workdir?: string;
}): Promise<ExecutionResult> {
  const { projectName, code, permissions, onProgress, workdir } = args;

  const filename = `temp_${nanoid()}.ts`;
  const scriptsFolder = scriptDb.projectScriptFiles(projectName);
  const scriptPath = path.join(scriptsFolder.path, filename);

  // Create temporary script file
  await Deno.writeTextFile(scriptPath, code);

  try {
    const permissionFlags = buildDenoPermissionFlags(permissions);
    const process = new Deno.Command("deno", {
      args: ["run", ...permissionFlags, scriptPath],
      stdout: "piped",
      stderr: "piped",
      cwd: workdir,
      env: {
        ...Deno.env.toObject(),
        LD_LIBRARY_PATH: "", // Requires unsetting this for the security sandbox
      },
    });

    const child = process.spawn();

    let stdoutContent = "";
    let stderrContent = "";
    let mergedContent = "";

    // Handle stdout
    const stdoutReader = child.stdout.getReader();
    (async () => {
      while (true) {
        const { done, value } = await stdoutReader.read();
        if (done) break;
        const text = new TextDecoder().decode(value);
        stdoutContent += text;
        mergedContent += text;
        onProgress?.(mergedContent);
      }
    })();

    // Handle stderr
    const stderrReader = child.stderr.getReader();
    (async () => {
      while (true) {
        const { done, value } = await stderrReader.read();
        if (done) break;
        const text = new TextDecoder().decode(value);
        stderrContent += text;
        mergedContent += text;
        onProgress?.(mergedContent);
      }
    })();

    const { code: exitCode } = await child.status;

    return {
      stdout: stdoutContent,
      stderr: stderrContent,
      merged: mergedContent,
      exitCode,
    };
  } finally {
    // Cleanup temporary file
    try {
      await Deno.remove(scriptPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}
