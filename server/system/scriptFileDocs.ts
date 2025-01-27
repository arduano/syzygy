export type SplitFile = {
  docComment: string;
  content: string;
};

export function splitFileDoc(input: string): SplitFile {
  const docCommentRegex = /^\s*\/\*\*([\s\S]*?)\*\//;
  const match = input.match(docCommentRegex);

  if (!match) {
    return { docComment: "", content: input };
  }

  const [fullMatch, commentContent] = match;

  // Process comment lines and restore */ sequences
  const docComment = commentContent
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      return trimmed.replace(/^\*\s?/, "").trim();
    })
    .join("\n")
    .trim()
    .replace(/\/\*/g, "*/");  // Restore */ sequences

  return {
    docComment,
    content: input.slice(fullMatch.length).trimStart(),
  };
}

export function mergeSplitDocFile({ docComment, content }: SplitFile): string {
  let merged = "";

  if (docComment) {
    // Replace */ with /* in the doc comment to prevent early termination
    const safeComment = docComment.replace(/\*\//g, "/\\*");
    
    const commentBody = safeComment
      .split("\n")
      .map((line) => ` * ${line}`)
      .join("\n");

    merged = `/**\n${commentBody}\n */\n`;
  }

  return merged + content;
}
