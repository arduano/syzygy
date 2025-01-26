import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { ai } from "./context";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  isAIMessageChunk,
  type AIMessageChunk,
} from "@langchain/core/messages";
import { CallbackHandler } from "langfuse-langchain";
import { nanoid } from "nanoid";
import { Debouncer } from "./debouncer";
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessage,
} from "openai/resources/index.mjs";
import { ChatDeepSeek } from "./chatDeepseek";

const deepseek = new ChatDeepSeek({
  openAIApiKey: process.env.DEEPSEEK_API_KEY,
  modelName: "deepseek-reasoner",
  configuration: {
    baseURL: "https://api.deepseek.com",
  },
});

const progressSchema = z.object({
  prompts: z.array(
    z.object({
      id: z.string(),
      reasoningText: z.string(),
      responseText: z.string(),
      startTime: z.string(),
      endTime: z.string().optional(),
      complete: z.boolean(),
    })
  ),
});

type ResponseStatus = {
  message?: AIMessageChunk;
  startTime: Date;
  endTime?: Date;
  complete: boolean;
};

type ResponseData = {
  message: AIMessageChunk;
  startTime: Date;
  endTime: Date;
};

const askExperts = ai.tool({
  name: "ask-experts",
  schema: z.object({
    questionAndContext: z
      .string()
      .describe("The question and context to ask the experts."),
    attachedPastExpertsResponses: z
      .string()
      .optional()
      .describe(
        "The comma-separated IDs of the responses of the past experts to attach to the question. Please use this to reference past expert responses instead of just re-writing them yourself. This forwards the thinking of the expert as well."
      ),
    includeLastUserMessage: z
      .boolean()
      .default(true)
      .describe(
        "Whether to automatically include the last user message as context."
      ),
    numberOfExperts: z
      .number()
      .default(1)
      .describe(
        "The number of experts to ask. By default this is 1, but you can do up to 5."
      ),
  }),
  toolProgressSchema: progressSchema,
  description:
    "Ask one or more experts a question. The experts will all provide their responses and reasoning. You can attach past experts' responses to the question.",
  run: async ({
    input: {
      questionAndContext,
      includeLastUserMessage,
      attachedPastExpertsResponses,
      numberOfExperts,
    },
    sendProgress,
    lastUserMessage,
    ctx,
    conversationId,
    signal,
  }) => {
    if (numberOfExperts > 5) {
      throw new Error("You can only ask up to 5 experts at once.");
    }

    const pastMessagesStore = await ctx.getExpertAnswersStore(conversationId);

    const pastExpertsResponsesData = await Promise.all(
      (attachedPastExpertsResponses?.split(",") ?? []).map(async (id) => {
        const data = await pastMessagesStore.get(id);
        if (data === undefined) {
          throw new Error(`Expert response with id ${id} not found`);
        }
        return { id, data };
      })
    );

    const pastExpertResponsesStrings = pastExpertsResponsesData
      .map(({ id, data }) => {
        return `
<expert id="${id}">
${data}
</expert>
        `;
      })
      .join("\n\n");

    const pastUserMessageStr = !includeLastUserMessage
      ? ""
      : `
<pastUserMessage>
${lastUserMessage.content}
</pastUserMessage>
    `;

    const requestStr = `
<request>
${questionAndContext}
</request>
    `;

    const fullPrompt = `
${pastExpertResponsesStrings.trim()}

${pastUserMessageStr.trim()}

${requestStr.trim()}
    `.trim();

    const responseProgress: Record<string, ResponseStatus> = {};
    const dummyIds = Array.from({ length: numberOfExperts }, () => nanoid());

    const sendProgressCallback = () => {
      sendProgress({
        prompts: Object.entries(responseProgress).map(([id, status]) => ({
          id,
          reasoningText:
            (status.message?.additional_kwargs?.reasoning_content as string) ??
            "",
          responseText: (status.message?.content as string) ?? "",
          startTime: status.startTime.toString(),
          endTime: status.endTime?.toString(),
          complete: status.complete,
        })),
      });
    };

    for (const id of dummyIds) {
      responseProgress[id] = {
        complete: false,
        startTime: new Date(),
      };
    }

    sendProgressCallback();
    const sendProgressDedupe = new Debouncer<void>(2000, sendProgressCallback);

    const makeUpdateCallbackForId =
      (id: string) => (message: AIMessageChunk) => {
        responseProgress[id] = {
          message,
          complete: false,
          startTime: responseProgress[id].startTime,
        };
        sendProgressDedupe.debounce();
      };

    const makeCompleteCallbackForId =
      (id: string) => (message: AIMessageChunk) => {
        responseProgress[id] = {
          message,
          complete: true,
          startTime: responseProgress[id].startTime,
          endTime: new Date(),
        };
        sendProgressDedupe.debounce();
      };

    // Spawn chats in parallel
    const responsePromises = dummyIds.map(async (id) => {
      const response = await invokePrompt(fullPrompt, signal, {
        onProgress: makeUpdateCallbackForId(id),
        onComplete: makeCompleteCallbackForId(id),
      });

      const reasoningText =
        (response.message.additional_kwargs?.reasoning_content as string) ?? "";
      const responseText = response.message.content as string;
      const fullText = `<thinking>\n${reasoningText}\n</thinking>\n\n${responseText}`;

      return {
        id,
        responseText,
        reasoningText,
        startTime: response.startTime,
        endTime: response.endTime,
        fullText,
      };
    });

    const responses = await Promise.all(responsePromises);

    const asText = responses
      .map(({ id, fullText }) =>
        `
<expert id="${id}">
${fullText}
</expert>
`.trim()
      )
      .join("\n\n");

    const allResponsesText = `
<experts>
${asText}
</experts>
`.trim();

    const clientResult: z.infer<typeof progressSchema> = {
      prompts: responses.map(
        ({ id, responseText, reasoningText, startTime, endTime }) => ({
          id,
          reasoningText,
          responseText,
          complete: true,
          startTime: startTime.toString(),
          endTime: endTime?.toString(),
        })
      ),
    };

    await Promise.all(
      responses.map(({ id, fullText }) => pastMessagesStore.set(id, fullText))
    );

    return {
      response: allResponsesText,
      clientResult,
    };
  },
  mapArgsForClient: (args) => args,
  mapErrorForAI: (error) => `An error occurred: ${error}`,
});

async function invokePrompt(
  userMessage: string,
  signal: AbortSignal,
  callbacks?: {
    onProgress?: (message: AIMessageChunk) => void;
    onComplete?: (message: AIMessageChunk) => void;
  }
) {
  const prompt = [
    {
      role: "system",
      content:
        "You are an expert answering a question provided by another person.",
    },
    {
      role: "user",
      content: userMessage,
    },
  ];

  const stream = await deepseek.streamEvents(prompt, {
    version: "v2",
    signal,
  });

  const startTime = new Date();

  return new Promise<ResponseData>(async (resolve) => {
    let aggregateChunk: AIMessageChunk | undefined;
    for await (const chunk of stream) {
      if (chunk.event === "on_chat_model_stream") {
        const data = chunk.data.chunk;
        if (isAIMessageChunk(data)) {
          if (!aggregateChunk) {
            aggregateChunk = data;
          } else {
            aggregateChunk = aggregateChunk.concat(data);
          }
          callbacks?.onProgress?.(aggregateChunk);
        }
      }

      if (chunk.event === "on_chat_model_end") {
        const data = chunk.data.output;
        if (isAIMessageChunk(data)) {
          aggregateChunk = data;
          callbacks?.onComplete?.(aggregateChunk);
          resolve({
            message: aggregateChunk,
            startTime,
            endTime: new Date(),
          });
          break;
        }
      }
    }
  });
}

const allTools = [askExperts] as const;

const langfuseHandler = new CallbackHandler({
  publicKey: "pk-lf-a52f8e79-f42c-430b-be4c-c3b78da4a0c4",
  secretKey: "sk-lf-3379fff6-97c4-48ae-95f3-817c0a65d2c8",
  baseUrl: "http://192.168.1.51:3000",
});

export const agent = ai.agent({
  llm: new ChatAnthropic({ model: "claude-3-5-sonnet-20241022" }),
  tools: allTools,
  langchainCallbacks: [langfuseHandler],
});

export type AgentType = typeof agent;
