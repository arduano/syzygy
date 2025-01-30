import type { createContext } from "./context.ts";
import { EventEmitter } from "node:events";
import {
  AgentExtraArgs,
  makeChatRouterForAgent,
  ServerSideChatConversationHelper,
} from "@trpc-chat-agent/core";
import { initTRPC } from "@trpc/server";
import { nanoid } from "nanoid";
import { agent } from "./agent.ts";
import { scriptDb } from "@/server/system/scriptDb.ts";
import z from "zod";

export const ee = new EventEmitter();

export const t = initTRPC.context<typeof createContext>().create();

type ARgs = AgentExtraArgs<typeof agent>;

export const appRouter = t.router({
  listProjects: t.procedure.query(() => scriptDb.listProjects()),

  chat: makeChatRouterForAgent({
    agent,
    createConversation: async ({ ctx, extraArgs }) => {
      const id = nanoid();
      await ctx.forProject(extraArgs.projectName, async (backend) => {
        await backend.addConversation(id);
      });

      return ServerSideChatConversationHelper.newConversationData<typeof agent>(
        id
      );
    },
    getConversation: async ({ id, ctx, extraArgs }) => {
      try {
        const data = await ctx.forProject(
          extraArgs.projectName,
          async (backend) => {
            return backend.conversations.get(id);
          }
        );
        if (!data) {
          return null;
        }

        return data as any;
      } catch (e) {
        console.error(e);
        return null;
      }
    },
    t,
    saveConversation: async ({ id, conversation, ctx, extraArgs }) => {
      await ctx.forProject(extraArgs.projectName, async (backend) => {
        await backend.conversations.set(id, conversation);
      });
    },
  }),

  listConversations: t.procedure
    .input(z.object({ projectName: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.forProject(input.projectName, async (backend) => {
        return backend.getAllConversationsWithMetadata();
      });
    }),
});

export type AppRouter = typeof appRouter;
