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

  // Process comment lines
  const docComment = commentContent
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      return trimmed.replace(/^\*\s?/, "").trim();
    })
    .join("\n")
    .trim();

  return {
    docComment,
    content: input.slice(fullMatch.length).trimStart(),
  };
}

export function mergeSplitDocFile({ docComment, content }: SplitFile): string {
  let merged = "";

  if (docComment) {
    const commentBody = docComment
      .split("\n")
      .map((line) => ` * ${line}`)
      .join("\n");

    merged = `/**\n${commentBody}\n */\n`;
  }

  return merged + content;
}
