import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { ai } from "./context.ts";
import {
  isAIMessageChunk,
  type AIMessageChunk,
} from "@langchain/core/messages";
import { CallbackHandler } from "langfuse-langchain";
import { ChatDeepSeek } from "./chatDeepseek.ts";
import process from "node:process";
import { currentProject, currentWorkdir } from "./system/systemEnv.ts";
import { scriptDb } from "@/server/system/scriptDb.ts";
import { createPromptContextForFiles } from "@/server/system/projectFilePrompts.ts";
import { mergeSplitDocFile } from "@/server/system/scriptFileDocs.ts";
import { DenoPermissions, executeScript } from "@/server/system/execution.ts";

const deepseek = new ChatDeepSeek({
  openAIApiKey: process.env.DEEPSEEK_API_KEY,
  modelName: "deepseek-reasoner",
  configuration: {
    baseURL: "https://api.deepseek.com",
  },
});

const writeLibFile = ai.tool({
  name: "write-lib-file",
  description: "Write a file to the lib directory",
  schema: z.object({
    path: z.string(),
    content: z
      .string()
      .describe(
        "The actual content of the lib file, exporting all the relevant helper functions."
      ),
    declarationsWithComments: z
      .string()
      .describe(
        "The high-level detailed description of the file's exports and functionality, including doc comments for each item. You don't need to include code here other than the signatures, unless it helps illustrate the point."
      ),
  }),
  run: async ({ input: { path, content, declarationsWithComments } }) => {
    const projectName = currentProject;

    const fullContent = mergeSplitDocFile({
      content,
      docComment: declarationsWithComments,
    });
    await scriptDb.projectFiles(projectName).writeScript(path, fullContent);

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

const executeScriptTool = ai.tool({
  name: "execute-script",
  description: "Execute a TypeScript script with Deno",
  schema: z.object({
    code: z.string().describe("The TypeScript code to execute"),
  }),
  toolProgressSchema: z.object({
    output: z.string(),
  }),
  run: async ({ input: { code }, sendProgress }) => {
    const permissions: DenoPermissions = {
      allowRun: ["git"],
    };

    const result = await executeScript(
      currentProject,
      code,
      permissions,
      (output) => {
        sendProgress({
          output,
        });
      }
    );

    const aiResponse = `
<output>
<stdout>
${result.stdout}
</stdout>
<stderr>
${result.stderr}
</stderr>
<exitCode>
${result.exitCode}
</exitCode>
</output>
    `.trim();

    return {
      response: aiResponse,
      clientResult: result,
    };
  },
  mapArgsForClient: (args) => args,
  mapErrorForAI: (error) => `An error occurred: ${error}`,
});

const allTools = [writeLibFile, executeScriptTool] as const;

const langfuseHandler = new CallbackHandler({
  publicKey: "pk-lf-a52f8e79-f42c-430b-be4c-c3b78da4a0c4",
  secretKey: "sk-lf-3379fff6-97c4-48ae-95f3-817c0a65d2c8",
  baseUrl: "http://192.168.1.51:3000",
});

export const agent = ai.agent({
  llm: new ChatOpenAI({ model: "gpt-4o" }),
  // llm: new ChatAnthropic({ model: "claude-3-5-sonnet-20241022" }),
  tools: allTools,
  langchainCallbacks: [langfuseHandler],
  systemMessage: async (ctx) => {
    const projectName = currentProject;

    const projectFiles = await scriptDb
      .projectFiles(projectName)
      .listScriptsWithContents();
    const internalFiles = await scriptDb
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

# Library files

${filesPromptPart}

# Environment

WORKDIR=${currentWorkdir}
TIME=${new Date().toISOString()}
`;
  },
});

export type AgentType = typeof agent;
