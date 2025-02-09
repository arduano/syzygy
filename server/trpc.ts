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
import { projectDb } from "./system/projectDb.ts";
import z from "zod";
import { createDefaultConfig } from "@/server/system/projectConfig.ts";

export const ee = new EventEmitter();

export const t = initTRPC.context<typeof createContext>().create();

type ARgs = AgentExtraArgs<typeof agent>;

export const appRouter = t.router({
  listProjects: t.procedure.query(() => projectDb.listProjects()),

  createProject: t.procedure
    .input(
      z.object({
        name: z.string(),
        workdir: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const projectName = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const config = createDefaultConfig({
        name: input.name,
        workdir: input.workdir,
      });

      await projectDb.createProject(projectName, config);

      return { projectName };
    }),

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

  getProjectDetails: t.procedure
    .input(z.object({ projectName: z.string() }))
    .query(async ({ input }) => {
      const projectConfig = await projectDb.readProjectConfig(
        input.projectName
      );
      if (!projectConfig) {
        throw new Error(`Project ${input.projectName} not found`);
      }
      return { projectConfig };
    }),
});

export type AppRouter = typeof appRouter;
