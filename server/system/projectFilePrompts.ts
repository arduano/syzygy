import { splitFileDoc } from "@/server/system/scriptFileDocs.ts";

function convertFileToText(importPath: string, file: string) {
  const split = splitFileDoc(file);

  return `
<fileDoc importPath="${importPath}">
${split.docComment}
</fileDoc>
  `.trim();
}

export function createPromptContextForFiles(data: {
  coreFiles: Record<string, string>;
  projectFiles: Record<string, string>;
}) {
  const coreFileDocs = Object.entries(data.coreFiles)
    .map(([fileName, file]) => convertFileToText(`@core/${fileName}`, file))
    .join("\n");

  const projectFileDocs = Object.entries(data.projectFiles)
    .map(([fileName, file]) => convertFileToText(`@lib/${fileName}`, file))
    .join("\n");

  return `
Here are all of the available files that can be imported in scripts.
You can only see the scaffold/functionality of these by default, to reduce the amount of reading. You can always request the raw code from within though.

<availableFiles>
<coreFiles>
${coreFileDocs}
</coreFiles>

<projectLibFiles>
${projectFileDocs}
</projectLibFiles>
</availableFiles>
  `;
}
