"use client";

import type { AgentType } from "@/server/agent.ts";
import type { AgentExtraArgs } from "@trpc-chat-agent/core";
import type { UseConversationArgs } from "@trpc-chat-agent/react";
import { Card } from "@/components/ui/card.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { ReadonlySignal, Signal, useSignal } from "@preact/signals-react";
import { RenderMessages, useConversation } from "@trpc-chat-agent/react";
import React, { useEffect, useRef, useState } from "react";
import { RenderTool } from "./RenderTool.tsx";
import { useRouter } from "next/navigation";
import { IoMdAdd } from "react-icons/io";
import { AIMessageShell } from "@/components/chat/AIMessage.tsx";
import { StyledMarkdown } from "@/components/chat/StyledMarkdown.tsx";
import { UserMessage } from "@/components/chat/UserMessage.tsx";
import { trpc, trpcClient } from "@/utils/trpc.ts";

export type ChatComponentProps = Omit<
  UseConversationArgs<AgentType>,
  "initialConversationId" | "router"
> & {
  id?: string;
  projectName: string;
};

export function Chat({ id, ...props }: ChatComponentProps) {
  const [key, setKey] = useState(0);
  const [pastId, setPastId] = useState(id);

  const lastCreatedConversation = useSignal<string | undefined>();

  // Force re-mount the chat component when the id changes.
  useEffect(() => {
    if (id !== pastId) {
      setPastId(id);
      const pastConvoId = lastCreatedConversation.peek();
      if (!pastConvoId || id !== pastConvoId) {
        setKey((k) => k + 1);
        lastCreatedConversation.value = id;
      }
    }
  }, [id]);

  return (
    <ChatComponentWithStaticId
      key={key}
      id={id}
      {...props}
      lastCreatedConversation={lastCreatedConversation}
    />
  );
}

type ChatComponentPropsWithIdSignal = ChatComponentProps & {
  lastCreatedConversation: Signal<string | undefined>;
};

function ChatComponentWithStaticId({
  id,
  lastCreatedConversation,
  projectName,
  onUpdateConversationId,
  ...converationArgs
}: ChatComponentPropsWithIdSignal) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const conversationNames = trpc.listConversations.useQuery({ projectName });

  const {
    messages,
    beginMessage,
    isStreaming,
    isLoadingConversation,
    isMissingConversation,
  } = useConversation<AgentType>({
    initialConversationId: id,
    onUpdateConversationId: (id) => {
      onUpdateConversationId?.(id);
      lastCreatedConversation.value = id;
      conversationNames.refetch();
    },
    router: trpcClient.chat,
    ...converationArgs,
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const invokeArgs = useSignal<AgentExtraArgs<AgentType>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    beginMessage({ userMessage: input, invokeArgs: invokeArgs.peek() });
    setInput("");
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            <div
              className="p-2 rounded cursor-pointer hover:bg-accent flex items-center gap-2"
              onClick={() => router.push("/chat")}
            >
              <IoMdAdd className="w-5 h-5" />
              <span>New Conversation</span>
            </div>
            <div className="h-px bg-border my-2" />
            {conversationNames.data
              ?.toSorted(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )
              .map((convId) => (
                <div
                  key={convId.id}
                  className={`p-2 rounded cursor-pointer hover:bg-accent ${
                    id === convId.id ? "bg-accent" : ""
                  }`}
                  onClick={() => router.push(`/chat/${convId.id}`)}
                >
                  {convId.name}
                </div>
              ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main chat area */}
      <div className="flex-1">
        <div className="flex flex-col h-screen max-h-screen">
          <ScrollArea className="flex-1 h-full">
            <Card className=" border-0 rounded-none shadow-none relative">
              <div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto">
                {isMissingConversation ? (
                  <div className="text-center p-4 text-destructive">
                    This conversation could not be found.
                  </div>
                ) : (
                  <RenderMessages
                    messages={messages}
                    renderAiMessageShell={(message, children) => (
                      <AIMessageShell
                        message={message}
                        children={children}
                        invokeArgs={invokeArgs}
                      />
                    )}
                    renderAiMessagePartContent={(content) => (
                      <StyledMarkdown>{content as string}</StyledMarkdown>
                    )}
                    renderUserMessage={(message) => (
                      <UserMessage message={message} invokeArgs={invokeArgs} />
                    )}
                    renderToolCall={(tool) => <RenderTool tool={tool} />}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>
            </Card>
          </ScrollArea>

          <div className="border-t rounded-none p-4">
            <form
              onSubmit={handleSubmit}
              className="flex gap-4 max-w-4xl mx-auto"
            >
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={
                  isStreaming || isLoadingConversation || isMissingConversation
                }
                placeholder="Type a message..."
                className="resize-none rounded-xl min-h-[44px] max-h-[200px] overflow-y-auto scrollbar scrollbar-thumb-secondary scrollbar-track-transparent"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!isStreaming && input.trim()) {
                      handleSubmit(e as any);
                    }
                  }
                }}
                style={{
                  height: "auto",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
