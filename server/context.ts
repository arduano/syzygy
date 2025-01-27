import { kvsLocalStorage } from "@kvs/node-localstorage";
import { AgentsBackend, initAgents } from "@trpc-chat-agent/core";
import { LangChainAgentsBackend } from "@trpc-chat-agent/langchain";
import { initTRPC } from "@trpc/server";
import AsyncLock from "async-lock";
import path from "node:path";
import { findUp } from "find-up";

const projectRoot = path.dirname(await findUp("deno.json") ?? '');
const storePath = path.join(projectRoot, '.cache/kvs');
console.log(storePath);

export async function createContext() {
  const conversationStore = await kvsLocalStorage({
    name: "conversations",
    version: 1,
    storeFilePath: storePath,
  });
  const conversationNamesStore = await kvsLocalStorage({
    name: "conversation-names",
    version: 1,
    storeFilePath: storePath,
  });

  const conversationLock = new AsyncLock();
  const conversationList = await kvsLocalStorage({
    name: "conversation-list",
    version: 1,
    storeFilePath: storePath,
  });

  const addConversation = async (id: string) => {
    await conversationLock.acquire(id, async () => {
      const existing = (await conversationList.get("list")) as string[];
      if (existing) {
        if (existing.includes(id)) {
          return;
        }
        await conversationList.set("list", [...existing, id]);
      } else {
        await conversationList.set("list", [id]);
      }
    });
  };

  const listConversations = async () => {
    return [] as string[];
    // return (await conversationList.get("list")) as string[];
  };

  return {
    conversationNamesStore,
    conversations: {
      store: conversationStore,
      list: listConversations,
      addConversation,
    },
  };
}

export const t = initTRPC.context<typeof createContext>().create();
export const ai = initAgents
  .context<typeof createContext>()
  .backend(new LangChainAgentsBackend())
  .create();
