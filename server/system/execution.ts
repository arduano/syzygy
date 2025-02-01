import { nanoid } from "nanoid";
import { projectDb } from "./projectDb.ts";
import * as path from "node:path";
import { DenoPermissions, buildDenoPermissionFlags } from "./permissions.ts";

interface ExecutionResult {
  stdout: string;
  stderr: string;
  merged: string;
  exitCode: number;
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
  const scriptsFolder = projectDb.projectScriptFiles(projectName);
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
