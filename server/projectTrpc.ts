import type { createContext } from "./context.ts";
import { EventEmitter } from "node:events";
import {
  makeChatRouterForAgent,
  ServerSideChatConversationHelper,
} from "@trpc-chat-agent/core";
import { initTRPC } from "@trpc/server";
import { nanoid } from "nanoid";
import { agent } from "./agent.ts";
import { getAllConversationsWithMetadata } from "@/server/conversationMetadata.ts";

export const ee = new EventEmitter();

export const t = initTRPC.context<typeof createContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

export const appRouter = router({

});

export type ProjectAppRouter = typeof appRouter;
