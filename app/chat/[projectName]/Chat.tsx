"use client";

import { type ThinkingEffort, type AgentType } from "@/server/agent.ts";
import type { UseConversationArgs } from "@trpc-chat-agent/react";
import { Card } from "@/components/ui/card.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Signal, useSignal } from "@preact/signals-react";
import { RenderMessages, useConversation } from "@trpc-chat-agent/react";
import React, { useEffect, useRef, useState } from "react";
import { RenderTool } from "./RenderTool.tsx";
import { useRouter } from "next/navigation";
import { IoMdAdd } from "react-icons/io";
import { IoArrowBack } from "react-icons/io5";
import { AIMessageShell } from "@/components/chat/AIMessage.tsx";
import { StyledMarkdown } from "@/components/chat/StyledMarkdown.tsx";
import { UserMessage } from "@/components/chat/UserMessage.tsx";
import { trpc, trpcClient } from "@/utils/trpc.ts";
import { ThinkingIndicator } from "@/components/chat/ThinkingIndicator.tsx";
import { Button } from "@/components/ui/button.tsx";
import { FaStop } from "react-icons/fa";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

export type ChatComponentProps = Omit<
  UseConversationArgs<AgentType>,
  "initialConversationId" | "router" | "extraArgs"
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const [thinkingEffort, setThinkingEffort] = useState<ThinkingEffort>("low");

  const scrollToBottom = (animated: boolean) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: animated ? "smooth" : "auto",
    });
  };

  const conversationNames = trpc.listConversations.useQuery({ projectName });

  const {
    messages,
    beginMessage,
    cancelStream,
    isStreaming,
    isLoadingConversation,
    isMissingConversation,
    conversationError,
  } = useConversation<AgentType>({
    initialConversationId: id,
    onUpdateConversationId: (id) => {
      onUpdateConversationId?.(id);
      lastCreatedConversation.value = id;
      conversationNames.refetch();
    },
    router: trpcClient.chat,
    extraArgs: {
      projectName,
      thinkingEffort,
    }
  });

  useEffect(() => {
    if (isStreaming) {
      setTimeout(() => {
        scrollToBottom(true);
      }, 0);
    }
  }, [isStreaming]);

  useEffect(() => {
    setTimeout(() => {
      scrollToBottom(true);
    }, 0);
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    beginMessage({ userMessage: input });
    setInput("");
  };

  const adjustTextareaHeight = () => {
    const element = textareaRef.current;
    if (element) {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight + 2}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const conversationErrorString =
    conversationError && (conversationError as any).message;

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
              <IoArrowBack className="w-5 h-5" />
              <span>Back to Projects</span>
            </div>
            <div className="h-px bg-border my-2" />
            <div
              className="p-2 rounded cursor-pointer hover:bg-accent flex items-center gap-2"
              onClick={() => router.push(`/chat/${projectName}`)}
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
                  onClick={() =>
                    router.push(`/chat/${projectName}/${convId.id}`)
                  }
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
          {/* Top bar */}
          <div className="border-b p-2">
            <div className="flex items-center justify-start gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    Thinking Effort: {thinkingEffort}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Thinking Effort</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={thinkingEffort} onValueChange={(v) => setThinkingEffort(v as ThinkingEffort)}>
                    <DropdownMenuRadioItem value="low">Low</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="medium">Medium</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="high">High</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <ScrollArea className="flex-1 h-full">
            <Card className=" border-0 rounded-none shadow-none relative">
              <div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto">
                {isMissingConversation ? (
                  <div className="text-center p-4 text-destructive">
                    This conversation could not be found.
                  </div>
                ) : conversationErrorString ? (
                  <div className="text-center p-4 text-destructive">
                    Error: {conversationErrorString}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pb-4">
                    <RenderMessages
                      messages={messages}
                      isStreaming={isStreaming}
                      renderAiMessageShell={(
                        message,
                        children,
                        { isLastMessage }
                      ) => (
                        <AIMessageShell
                          message={message}
                          children={children}
                          isLastMessage={isLastMessage}
                        />
                      )}
                      renderAiMessagePartContent={(content) => (
                        <StyledMarkdown>{content as string}</StyledMarkdown>
                      )}
                      renderUserMessage={(message) => (
                        <UserMessage message={message} />
                      )}
                      renderToolCall={(tool) => <RenderTool tool={tool} />}
                      renderThinkingIndicator={() => <ThinkingIndicator />}
                    />
                    <div ref={messagesEndRef} />
                  </div>
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
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustTextareaHeight();
                }}
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
                  adjustTextareaHeight();
                }}
                style={{
                  height: "auto",
                }}
                onInput={adjustTextareaHeight}
              />
              {isStreaming && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => cancelStream()}
                >
                  <FaStop size={20} />
                </Button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
