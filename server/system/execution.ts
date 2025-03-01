import { nanoid } from "nanoid";
import { projectDb } from "./projectDb.ts";
import * as path from "node:path";
import { type DenoPermissions, buildDenoPermissionFlags } from "./permissions.ts";
import * as xterm from "@xterm/xterm";
import type { Terminal } from "@xterm/xterm";
import { Debouncer } from "@/server/debouncer.ts";

// Hack
const TerminalClass = (xterm as any).default.Terminal as typeof Terminal;

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
  signal: AbortSignal;
}): Promise<ExecutionResult> {
  const { projectName, code, permissions, onProgress, workdir, signal } = args;

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
      signal,
    });

    const term = new TerminalClass({
      cols: 80,
      rows: 1,
      scrollback: 100000,
      convertEol: true,
    });
    const termStdout = new TerminalClass({
      cols: 80,
      rows: 1,
      scrollback: 100000,
      convertEol: true,
    });
    const termStderr = new TerminalClass({
      cols: 80,
      rows: 1,
      scrollback: 100000,
      convertEol: true,
    });

    const progressDebouncer = new Debouncer<void>(500, () => {
      onProgress?.(readTerminalLines(term));
    });

    const child = process.spawn();

    // signal.addEventListener("abort", () => {
    //   console.log("Aborting child Deno process");
    //   child.kill("SIGTERM");
    // });

    let stdoutHandlerResolve: (() => void) | undefined;
    let stderrHandlerResolve: (() => void) | undefined;
    const stdoutHandlerPromise = new Promise<void>((resolve) => {
      stdoutHandlerResolve = resolve;
    });
    const stderrHandlerPromise = new Promise<void>((resolve) => {
      stderrHandlerResolve = resolve;
    });

    // Handle stdout
    const stdoutReader = child.stdout.getReader();
    (async () => {
      while (true) {
        const { done, value } = await stdoutReader.read();
        if (done) break;

        await Promise.all([
          Deno.stdout.write(value),
          new Promise<void>((resolve) => term.write(value, resolve)),
          new Promise<void>((resolve) => termStdout.write(value, resolve)),
        ]);

        progressDebouncer.debounce();
      }

      stdoutHandlerResolve?.();
    })();

    // Handle stderr
    const stderrReader = child.stderr.getReader();
    (async () => {
      while (true) {
        const { done, value } = await stderrReader.read();
        if (done) break;

        await Promise.all([
          Deno.stderr.write(value),
          new Promise<void>((resolve) => term.write(value, resolve)),
          new Promise<void>((resolve) => termStderr.write(value, resolve)),
        ]);

        progressDebouncer.debounce();
      }

      stderrHandlerResolve?.();
    })();

    const { code: exitCode } = await child.status;

    await stdoutHandlerPromise;
    await stderrHandlerPromise;

    progressDebouncer.flush();

    return {
      stdout: readTerminalLines(termStdout),
      stderr: readTerminalLines(termStderr),
      merged: readTerminalLines(term),
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

const defaultMaxLines = 200;
const defaultMaxLineLength = 500;

function truncateSingleLine(line: string) {
  if (line.length > defaultMaxLineLength) {
    return (
      line.slice(0, defaultMaxLineLength) +
      ` ... truncated ${line.length - defaultMaxLineLength} characters ...`
    );
  }
  return line;
}

function readTerminalLines(term: Terminal) {
  const length = term.buffer.active.length;

  const readLines: string[] = [];

  if (length <= defaultMaxLines) {
    for (let i = 0; i < length; i++) {
      readLines.push(
        truncateSingleLine(
          term.buffer.active.getLine(i)?.translateToString() ?? ""
        )
      );
    }
  } else {
    const chunkSize = Math.ceil(defaultMaxLines / 2);
    for (let i = 0; i < chunkSize; i++) {
      readLines.push(
        truncateSingleLine(
          term.buffer.active.getLine(i)?.translateToString() ?? ""
        )
      );
    }

    const skippedLines = length - chunkSize;
    if (skippedLines > 0) {
      readLines.push(`...`);
      readLines.push(`... ${skippedLines} lines skipped ...`);
      readLines.push(`...`);
    }

    for (let i = length - chunkSize; i < length; i++) {
      readLines.push(
        truncateSingleLine(
          term.buffer.active.getLine(i)?.translateToString() ?? ""
        )
      );
    }
  }

  return readLines.join("\n");
}
