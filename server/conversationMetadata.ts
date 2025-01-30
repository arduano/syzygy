import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import {
  ChatConversationHelper,
  ConversationData,
} from "@trpc-chat-agent/core";
import { zodResponseFormat } from "openai/helpers/zod";
import { Context } from "@/server/context.ts";

const miniLlm = new ChatOpenAI({
  modelName: "gpt-4o-mini",
});

const analysisSchema = z.object({
  name: z.string(),
});

export async function makeNameForConversation(conversation: ConversationData<any>) {
  const helpers = new ChatConversationHelper(conversation);
  const message = helpers.getUserMessageAt([
    { userMessageChildIndex: 0, aiMessageChildIndex: 0 },
  ]);

  if (!message) {
    return null;
  }

  const contents = message?.content;

  const analysis = await miniLlm
    .bind({
      response_format: zodResponseFormat(analysisSchema, "name") as any,
    })
    .invoke([
      {
        role: "system",
        content: `You are helping name a conversation. The user will provide a conversation message, and you'll create a short name for the conversation (5 or less words)`,
      },
      {
        role: "user",
        content: contents,
      },
    ]);

  const result = analysisSchema.parse(JSON.parse(analysis.content as string));
  return result.name;
}

export type ConversationMetadata = {
  name: string;
  createdAt: string;
};
