"use client";

import type { AgentType } from "@/server/agent.ts";
import type { AgentTools, ChatAIMessageToolCall } from "@trpc-chat-agent/core";
import { ToolCallWrapper } from "@/components/chat/ToolCallWrapper.tsx";
import { ToolResultWrapper } from "@/components/chat/ToolResultWrapper.tsx";
import { HiOutlineChatBubbleOvalLeft } from "react-icons/hi2";
import { ExpertResponse } from "./ExpertResponse.tsx";
import { useState } from "react";
import { StyledMarkdown } from "@/components/chat/StyledMarkdown.tsx";

export function RenderTool({
  tool,
}: {
  tool: ChatAIMessageToolCall<AgentTools<AgentType>>;
}) {
  switch (tool.name) {
    case "ask-experts": {
      const data = tool.result ?? tool.progressStatus;

      return (
        <ToolCallWrapper tool={tool} title="Expert Consultation">
          <div className="flex gap-2">
            <span className="font-semibold">Question:</span>
            <StyledMarkdown>
              {tool.args?.questionAndContext ?? ""}
            </StyledMarkdown>
          </div>
          <ToolResultWrapper
            icon={
              <HiOutlineChatBubbleOvalLeft
                size={24}
                className="text-indigo-400"
              />
            }
            subtitle={
              !data?.prompts.length
                ? "Requesting..."
                : `${data?.prompts.length} Expert${
                    data?.prompts.length === 1 ? "" : "s"
                  } Consulted`
            }
          >
            <div className="space-y-2">
              {data?.prompts.map((prompt, i) => (
                <ExpertResponse
                  key={prompt.id}
                  id={prompt.id}
                  title={`Expert ${i + 1}`}
                  responseContent={prompt.responseText}
                  reasoningContent={prompt.reasoningText}
                  complete={prompt.complete}
                  index={i + 1}
                  startTime={prompt.startTime}
                  endTime={prompt.endTime}
                />
              ))}
            </div>
          </ToolResultWrapper>
        </ToolCallWrapper>
      );
    }

    default:
      return (
        <ToolCallWrapper tool={tool} title="Unknown Tool">
          <div className="text-muted-foreground">
            Unknown tool: {(tool as any).name}
          </div>
        </ToolCallWrapper>
      );
  }
}
