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

async function makeNameForConversation(conversation: ConversationData<any>) {
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

export async function getAllConversationsWithMetadata(ctx: Context) {
  const conversations = await ctx.conversations.list();
  const all = await Promise.all(
    conversations.map(async (id) => {
      const data = (await ctx.conversations.store.get(
        id
      )) as ConversationData<any>;
      if (!data) {
        console.error("Could not find conversation", id);
        return null;
      }

      return ctx.conversationLock.acquire(id, async () => {
        const metadata = await ctx.conversationMetadataStore.get(id);

        if (metadata) {
          return {
            id,
            name: metadata.name,
            createdAt: metadata.createdAt,
          };
        }

        const generatedName = await makeNameForConversation(data);
        const createdAt = new Date().toISOString();
        if (generatedName) {
          await ctx.conversationMetadataStore.set(id, {
            name: generatedName,
            createdAt,
          });
        } else {
          return null;
        }

        return {
          id,
          name: generatedName,
          createdAt,
        };
      });
    })
  );

  return all.filter((a) => !!a);
}
