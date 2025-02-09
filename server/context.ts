import { kvsLocalStorage } from "@kvs/node-localstorage";
import {
  AgentsBackend,
  ConversationData,
  initAgents,
} from "@trpc-chat-agent/core";
import { initTRPC } from "@trpc/server";
import AsyncLock from "async-lock";
import path from "node:path";
import { findUp } from "find-up";
import {
  ConversationMetadata,
  makeNameForConversation,
} from "@/server/conversationMetadata.ts";
import { sandboxDir } from "@/server/system/systemEnv.ts";
import { withCache } from "@/server/system/cache.ts";
import { compileDeclarations } from "@/server/system/compileDeclarations.ts";

async function makeProjectConversationsBackend(args: { projectName: string }) {
  const storePath = path.join(
    sandboxDir,
    "projects",
    args.projectName,
    ".cache/kvs"
  );

  const conversationStore = await kvsLocalStorage({
    name: "conversations",
    version: 1,
    storeFilePath: storePath,
  });
  const conversationMetadataStore = await kvsLocalStorage<
    Record<string, ConversationMetadata>
  >({
    name: "conversation-metadata",
    version: 1,
    storeFilePath: storePath,
  });

  const conversationList = await kvsLocalStorage({
    name: "conversation-list",
    version: 1,
    storeFilePath: storePath,
  });

  const listConversations = async () => {
    return ((await conversationList.get("list")) as string[]) ?? [];
  };
  const addConversation = async (conversationId: string) => {
    const list = await listConversations();
    await conversationList.set("list", [...new Set([...list, conversationId])]);
  };

  const getFileDeclarations = withCache(
    compileDeclarations,
    "fileDeclarations",
    storePath
  );

  async function getAllConversationsWithMetadata() {
    const conversations = await listConversations();
    const all = await Promise.all(
      conversations.map(async (id) => {
        const data = (await conversationStore.get(id)) as ConversationData<any>;
        if (!data) {
          console.error("Could not find conversation", id);
          return null;
        }

        const metadata = await conversationMetadataStore.get(id);

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
          await conversationMetadataStore.set(id, {
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
      })
    );

    return all.filter((a) => !!a);
  }

  return {
    metadata: conversationMetadataStore,
    conversations: conversationStore,
    listConversations,
    addConversation,
    getFileDeclarations,
    getAllConversationsWithMetadata,
  };
}

export type ConversationBackend = Awaited<
  ReturnType<typeof makeProjectConversationsBackend>
>;

export async function createContext() {
  const conversationLock = new AsyncLock();

  return {
    forProject: <T>(
      projectName: string,
      callback: (conversationBackend: ConversationBackend) => Promise<T>
    ): Promise<T> =>
      conversationLock.acquire(projectName, async () =>
        callback(await makeProjectConversationsBackend({ projectName }))
      ),
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
