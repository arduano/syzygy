import * as ts from "typescript";

/**
 * Compiles the provided TypeScript source code to generate declaration files in memory.
 *
 * @param sourceCode - The TypeScript source code to compile.
 * @returns An object whose keys are the output file names and values are the emitted contents.
 * @throws If there are any compilation errors.
 */
export function compileDeclarations(sourceCode: string) {
  // Use a fixed file name for our in-memory source.
  const fileName = "inmemory.ts";

  // Define compiler options to only emit declaration files.
  const options: ts.CompilerOptions = {
    declaration: true,
    emitDeclarationOnly: true,
    outDir: "./", // Affects the naming of output files (virtual names).
  };

  // This object will collect our emitted files in memory.
  const output: Record<string, string> = {};

  // Create a custom compiler host.
  const host = ts.createCompilerHost(options);

  // Override writeFile to capture the output instead of writing to disk.
  host.writeFile = (
    outFileName: string,
    contents: string,
    _writeByteOrderMark: boolean,
    _onError?: (message: string) => void,
    _sourceFiles?: readonly ts.SourceFile[]
  ): void => {
    output[outFileName] = contents;
  };

  // Override getSourceFile to provide our in-memory source code for the specified file.
  host.getSourceFile = (
    requestedFileName: string,
    languageVersion: ts.ScriptTarget,
    onError?: (message: string) => void
  ): ts.SourceFile | undefined => {
    if (requestedFileName === fileName) {
      return ts.createSourceFile(
        requestedFileName,
        sourceCode,
        languageVersion
      );
    }

    // For any other file, use the default behavior (reads from disk).
    // const sourceText = ts.sys.readFile(requestedFileName);
    // return sourceText !== undefined
    //   ? ts.createSourceFile(requestedFileName, sourceText, languageVersion)
    //   : undefined;

    return undefined;
  };

  // Override fileExists so that our custom file is recognized.
  host.fileExists = (requestedFileName: string): boolean => {
    if (requestedFileName === fileName) {
      return true;
    }
    return ts.sys.fileExists(requestedFileName);
  };

  // Create the program with the single in-memory source file.
  const program = ts.createProgram([fileName], options, host);
  const emitResult = program.emit();

  // Gather and report any diagnostics.
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  let diagnosticMessages: string | undefined;
  if (diagnostics.length > 0) {
    diagnosticMessages = diagnostics
      .map((diagnostic) => {
        if (diagnostic.file && diagnostic.start !== undefined) {
          const { line, character } =
            diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
          const message = ts.flattenDiagnosticMessageText(
            diagnostic.messageText,
            "\n"
          );
          return `${diagnostic.file.fileName} (${line + 1},${
            character + 1
          }): ${message}`;
        } else {
          return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        }
      })
      .join("\n");
  }

  return {
    output: output["./inmemory.d.ts"],
    diagnosticMessages,
  };
}
