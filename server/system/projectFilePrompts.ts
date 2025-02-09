import {
  mergeSplitDocFile,
  splitFileDoc,
} from "@/server/system/scriptFileDocs.ts";
import { Context, ConversationBackend } from "@/server/context.ts";

async function convertFileToText(
  importPath: string,
  file: string,
  ctx: ConversationBackend
) {
  const split = splitFileDoc(file);
  const declarations = await ctx.getFileDeclarations(file);
  const joinedAgain = mergeSplitDocFile({
    docComment: split.docComment,
    content: declarations.output,
  });

  return `
<fileDoc importPath="${importPath}">
${joinedAgain}
</fileDoc>
  `.trim();
}

export async function createPromptContextForFiles(data: {
  coreFiles: Record<string, string>;
  projectFiles: Record<string, string>;
  ctx: ConversationBackend;
}) {
  const coreFileDocs = await Promise.all(
    Object.entries(data.coreFiles).map(async ([fileName, file]) =>
      convertFileToText(`@core/${fileName}`, file, data.ctx)
    )
  );

  const projectFileDocs = await Promise.all(
    Object.entries(data.projectFiles).map(async ([fileName, file]) =>
      convertFileToText(`@lib/${fileName}`, file, data.ctx)
    )
  );

  return `
Here are all of the available files that can be imported in scripts.
You can only see the scaffold/functionality of these by default, to reduce the amount of reading. You can always request the raw code from within though.

<availableFiles>
<coreFiles>
${coreFileDocs.join("\n")}
</coreFiles>

<projectLibFiles>
${projectFileDocs.join("\n")}
</projectLibFiles>
</availableFiles>
  `;
}
