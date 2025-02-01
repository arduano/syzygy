import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import {
  isAIMessageChunk,
  type AIMessageChunk,
} from "@langchain/core/messages";
import { CallbackHandler } from "langfuse-langchain";
import { ChatDeepSeek } from "./chatDeepseek.ts";
import process from "node:process";
import { projectDb } from "./system/projectDb.ts";
import { createPromptContextForFiles } from "@/server/system/projectFilePrompts.ts";
import { mergeSplitDocFile } from "@/server/system/scriptFileDocs.ts";
import { executeScript } from "@/server/system/execution.ts";
import { createContext } from "node:vm";
import { initAgents } from "@trpc-chat-agent/core";
import { langchainBackend } from "@trpc-chat-agent/langchain";
import { DenoPermissions, mergePermissions } from "./system/permissions.ts";
import { getSystemDnsServers } from "./system/dns.ts";

export const ai = initAgents
  .context<typeof createContext>()
  .backend(langchainBackend.extraArgs(z.object({ projectName: z.string() })))
  .create();

const deepseek = new ChatDeepSeek({
  openAIApiKey: process.env.DEEPSEEK_API_KEY,
  modelName: "deepseek-reasoner",
  configuration: {
    baseURL: "https://api.deepseek.com",
  },
});

const expert = new ChatOpenAI({
  modelName: "o1-mini",
});

const expert2 = new ChatGroq({
  modelName: "deepseek-r1-distill-llama-70b",
});

const writeLibFile = ai.tool({
  name: "write-lib-file",
  description: "Write a file to the lib directory",
  schema: z.object({
    filename: z.string(),
    content: z
      .string()
      .describe(
        "The actual content of the lib file, exporting all the relevant helper functions."
      ),
    exportedDeclarationsWithComments: z
      .string()
      .describe(
        "The high-level detailed description of the file's exports and functionality, including doc comments for each item. You don't need to include code here other than the signatures, unless it helps illustrate the point."
      ),
  }),
  run: async ({
    input: { filename, content, exportedDeclarationsWithComments },
    extraArgs,
  }) => {
    const projectName = extraArgs.projectName;

    if (filename.startsWith("@lib/")) {
      filename = filename.slice("@lib/".length);
    }

    const fullContent = mergeSplitDocFile({
      content,
      docComment: exportedDeclarationsWithComments,
    });
    await projectDb
      .projectFiles(projectName)
      .writeScript(filename, fullContent);

    return {
      response: "File written",
      clientResult: {
        status: "success",
      } as const,
    };
  },
  mapArgsForClient: (args) => args,
  mapErrorForAI: (error) => `An error occurred: ${error}`,
});

function truncateStringLines(
  str: string,
  maxLines: number,
  maxLineLength: number
) {
  let lines = str.split("\n");

  // Remove lines from the middle, inserting a marker saying N lines were truncated
  if (lines.length > maxLines) {
    lines = [
      ...lines.slice(0, maxLines / 2),
      `...`,
      `... ${lines.length - maxLines} lines truncated ...`,
      `...`,
      ...lines.slice(-maxLines / 2),
    ];
  }

  lines = lines.map((line) => {
    if (line.length > maxLineLength) {
      return (
        line.slice(0, maxLineLength) +
        ` ... truncated ${line.length - maxLineLength} characters ...`
      );
    }
    return line;
  });

  return lines.join("\n");
}

const executeScriptTool = ai.tool({
  name: "execute-script",
  description: "Execute a TypeScript script with Deno",
  schema: z.object({
    code: z.string().describe("The TypeScript code to execute"),
  }),
  toolProgressSchema: z.object({
    output: z.string(),
  }),
  run: async ({ input: { code }, sendProgress, extraArgs }) => {
    const projectName = extraArgs.projectName;
    const currentProject = (await projectDb.readProjectConfig(projectName))!;
    const currentWorkdir = currentProject.workdir;

    const basePermissions: DenoPermissions = {
      allowRun: ["git"],
      allowRead: [currentWorkdir, "."],
      allowWrite: [currentWorkdir, "."],
      allowEnv: true,
      allowScripts: ["npm:tree-sitter"],
    };

    const dnsServers = await getSystemDnsServers();
    const dnsPermissions: DenoPermissions = {
      allowNet: dnsServers.map((server) =>
        server.includes(":") ? `[${server}]:53` : `${server}:53`
      ),
    };

    const permissions = mergePermissions(basePermissions, dnsPermissions);

    const result = await executeScript({
      projectName: projectName,
      workdir: currentWorkdir,
      code,
      permissions,
      onProgress: (output) => {
        sendProgress({
          output,
        });
      },
    });

    const stdout = truncateStringLines(result.stdout, 200, 500);
    const stderr = truncateStringLines(result.stderr, 200, 500);

    const aiResponse = `
<output>
<stdout>
${stdout}
</stdout>
<stderr>
${stderr}
</stderr>
<exitCode>
${result.exitCode}
</exitCode>
</output>
    `.trim();

    return {
      response: aiResponse,
      clientResult: {
        ...result,
        stdout,
        stderr,
      },
    };
  },
  mapArgsForClient: (args) => args,
  mapErrorForAI: (error) => `An error occurred: ${error}`,
});

const getAdvice = ai.tool({
  name: "get-advice",
  description:
    "Get advice or answers to questions from an expert programmer. The expert programmer can see the full chat history.",
  schema: z.object({
    question: z
      .string()
      .describe(
        "The question or topic to get advice about. Be specific and thorough with your question. Make sure all details are covered, and always include extra context where possible."
      ),
  }),
  run: async ({ input: { question }, conversation, conversationPath }) => {
    const chatHistory = conversation.asMessagesArray(conversationPath);

    const chatHistoryMessages = chatHistory
      .map((message) => {
        if (message.kind === "ai") {
          return `
<ai>
${message.parts.map((part) => part.content).join("\n\n")}
</ai>
          `.trim();
        } else {
          return `
<user>
${message.content}
</user>
          `.trim();
        }
      })
      .join("\n\n");

    const response = await expert2.invoke([
      {
        role: "user",
        content: `
You are a helpful assistant that can provide advice or answers to programming questions. You deeply think about the implementation of code and come up with the perfect solutions to problems.

When giving advice about implementation of code, ALWAYS:
- Include example implementations
- Keep in mind that the code will be run in Deno, so you can import any npm packages via \`npm:packagename\`
`,
      },
      {
        role: "user",
        content: chatHistoryMessages,
      },
      {
        role: "user",
        content: question,
      },
    ]);

    return {
      response: response.content,
      clientResult: {
        answer: response.content as string,
      },
    };
  },
  mapArgsForClient: (args) => args,
  mapErrorForAI: (error) => `An error occurred: ${error}`,
});

const allTools = [writeLibFile, executeScriptTool, getAdvice] as const;

const langfuseHandler = new CallbackHandler({
  publicKey: "pk-lf-a52f8e79-f42c-430b-be4c-c3b78da4a0c4",
  secretKey: "sk-lf-3379fff6-97c4-48ae-95f3-817c0a65d2c8",
  baseUrl: "http://192.168.1.51:3000",
});

export const agent = ai.agent({
  llm: new ChatOpenAI({ model: "o3-mini" }),
  tools: allTools,
  langchainCallbacks: [langfuseHandler],
  systemMessage: async ({ ctx, extraArgs }) => {
    const currentProject = (await projectDb.readProjectConfig(
      extraArgs.projectName
    ))!;
    const currentWorkdir = currentProject.workdir;

    const projectFiles = await projectDb
      .projectFiles(extraArgs.projectName)
      .listScriptsWithContents();
    const internalFiles = await projectDb
      .internalFiles()
      .listScriptsWithContents();

    const filesPromptPart = createPromptContextForFiles({
      coreFiles: internalFiles,
      projectFiles: projectFiles,
    });

    return `
You are a flexible programmer that's helping me automatically perform complex repetitive tasks with script-assisted automation.

- A lot of repetitive work can be broken down into simple scriptable steps
- 90% of the work can be taken care of fully with scripts
- The remaining 10% might need manual intervention, but a lot of time was still saved
- You must help think of intuitive and creative ways to automate the work

You have access to a library of deno script files. The two import paths are:
- @core/ - The core library of scripts that are available to call. These files have special permissions outside the sandboxed environment.
- @lib/ - The main collection of helpers for you to use. You can always create new helpers as you see fit.

The execution environment is sandboxed via deno permissions, with whitelisted permissions for all the relevant functionality you'll need.
You can use the deno filesystem API, but only within the WORKDIR directory.

# Deno basics

Here is a rundown of the Deno basics you must know:
- You can import lib files you wrote with the @lib/ prefix. \`./\` will never work in this environment.
- Core libraries can be imported with the @core/ prefix.
- You can import any npm packages with \`npm:packagename\` (e.g. \`npm:axios\`)
- Node core libraries can be imported with \`node:packagename\` (e.g. \`node:fs\`)
- ALWAYS use .ts extensions when importing. Deno doesn't implicitly assume import extensions.
- You can use the deno filesystem API:
  - \`Deno.readTextFile\` for reading files
  - \`Deno.writeTextFile\` for writing files
  - \`Deno.remove\` for deleting files
  - \`Deno.mkdir\` for creating directories
  - \`Deno.stat\` for getting file stats

# Library files

${filesPromptPart}

# Environment

WORKDIR=${currentWorkdir}
TIME=${new Date().toISOString()}
`;
  },
});

export type AgentType = typeof agent;
