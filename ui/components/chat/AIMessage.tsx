import type { AnyChatAgent, ChatAIMessage } from "@trpc-chat-agent/core";
import { cn } from "@/ui/lib/utils.ts";
import { CgRedo } from "react-icons/cg";
import { LuCopy, LuCheck } from "react-icons/lu";
import { Button } from "../ui/button.tsx";
import { MessageVariants } from "./MessageVariants.tsx";
import { useState } from "react";

export function AIMessageShell<Agent extends AnyChatAgent>({
  message,
  children,
  isLastMessage,
}: {
  message: ChatAIMessage<Agent>;
  children: React.ReactNode;
  isLastMessage: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const content = message.parts.map((part) => part.content).join("\n");
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "group flex items-start max-w-full gap-2 pr-12 lg:pr-48",
        isLastMessage && "min-h-[calc(100vh-240px)]"
      )}
    >
      <div className="flex-1 max-w-full">
        {message.path.count > 1 && <MessageVariants path={message.path} />}
        <div className="space-y-4">{children}</div>
      </div>
      <div className="flex flex-col gap-1">
        <Button
          onClick={() => message.regenerate()}
          variant="ghost"
          size="sm"
          className={cn(
            "mt-2 p-2 text-muted-foreground rounded-full hover:text-foreground opacity-0 group-hover:opacity-100",
            message.path.count > 1 && "mt-7"
          )}
        >
          <CgRedo size={14} />
        </Button>
        <Button
          onClick={handleCopy}
          variant="ghost"
          size="sm"
          className="p-2 text-muted-foreground rounded-full hover:text-foreground opacity-0 group-hover:opacity-100"
          onBlur={() => setCopied(false)}
        >
          {copied ? <LuCheck size={14} /> : <LuCopy size={14} />}
        </Button>
      </div>
    </div>
  );
}
