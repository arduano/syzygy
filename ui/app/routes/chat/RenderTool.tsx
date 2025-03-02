import type { AgentType } from "@/server/agent.ts";
import type { AgentTools, ChatAIMessageToolCall } from "@trpc-chat-agent/core";
import { ToolCallWrapper } from "@/ui/components/chat/ToolCallWrapper.tsx";
import type { ToolResultWrapper } from "@/ui/components/chat/ToolResultWrapper.tsx";
import type { HiOutlineChatBubbleOvalLeft } from "react-icons/hi2";
import { useState, useRef, useEffect } from "react";
import { StyledMarkdown } from "@/ui/components/chat/StyledMarkdown.tsx";
import { Button } from "@/ui/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/ui/dialog.tsx";
import { ScrollArea } from "@/ui/components/ui/scroll-area.tsx";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Card } from "@/ui/components/ui/card.tsx";
import { ThinkingIndicator } from "@/ui/components/chat/ThinkingIndicator.tsx";

const CodeBlock = ({
  content: blockContent,
  language,
  autoScroll = false,
}: {
  content: string;
  language?: string;
  autoScroll?: boolean;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);

  useEffect(() => {
    if (autoScroll && !userScrolled && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [blockContent, autoScroll, userScrolled]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;

      setUserScrolled(!isAtBottom);
  };

  const inner = language ? (
    <SyntaxHighlighter
      language={language}
      style={atomDark}
      PreTag="div"
      className="p-0"
      customStyle={{ margin: 0 }}
    >
      {blockContent}
    </SyntaxHighlighter>
  ) : (
    <Card className="p-4 border border-accent-foreground/20 w-full block rounded-lg">
      <pre className="font-mono whitespace-pre-wrap">{blockContent}</pre>
    </Card>
  );

  return (
    <ScrollArea
      className="max-w-full max-h-full"
      orientation="both"
      viewportRef={scrollRef}
      onScroll={handleScroll}
    >
      {inner}
    </ScrollArea>
  );
};

function CodeContent({
  content,
  language,
  autoScroll = false,
}: {
  content: string;
  language?: string;
  autoScroll?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const truncated =
    content.length > 500 ? content.slice(0, 500) + "..." : content;

  return (
    <>
      <CodeBlock content={truncated} language={language} />
      {content.length > 500 && (
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
          View Full Content
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-screen w-auto">
          <DialogHeader>
            <DialogTitle>Full Content</DialogTitle>
          </DialogHeader>
          <div className="p-4 max-w-2xl max-h-[80vh]">
            <CodeBlock
              content={content}
              language={language}
              autoScroll={autoScroll}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RenderTool({
  tool,
}: {
  tool: ChatAIMessageToolCall<AgentTools<AgentType>>;
}) {
  switch (tool.name) {
    case "write-lib-file": {
      const data = tool.result;
      return (
        <ToolCallWrapper tool={tool} title="Write Library File">
          <div className="space-y-2">
            <div>
              <span className="font-semibold">Path: </span>
              <code>{tool.args?.filename}</code>
            </div>
            <div>
              <span className="font-semibold">Content:</span>
              <div className="mt-1">
                <CodeContent
                  content={tool.args?.content ?? ""}
                  language="typescript"
                />
              </div>
            </div>
          </div>
        </ToolCallWrapper>
      );
    }

    case "execute-script": {
      const data = tool.result;
      const progress = tool.progressStatus?.output ?? "";

      return (
        <ToolCallWrapper tool={tool} title="Execute Script">
          <div className="space-y-2">
            <div>
              <span className="font-semibold">Code:</span>
              <div className="mt-1">
                <CodeContent
                  content={tool.args?.code ?? ""}
                  language="typescript"
                />
              </div>
            </div>
            {!data && progress && (
              <div>
                <span className="font-semibold">Output:</span>
                <div className="mt-1">
                  <CodeContent content={progress} autoScroll />
                </div>
              </div>
            )}
            {data && (
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">Exit Code: </span>
                  <code>{data.exitCode}</code>
                </div>
                {data.stdout && (
                  <div>
                    <span className="font-semibold">Stdout:</span>
                    <div className="mt-1">
                      <CodeContent content={data.stdout} autoScroll />
                    </div>
                  </div>
                )}
                {data.stderr && (
                  <div>
                    <span className="font-semibold">Stderr:</span>
                    <div className="mt-1">
                      <CodeContent content={data.stderr} autoScroll />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ToolCallWrapper>
      );
    }

    case "get-advice": {
      const data = tool.result;
      return (
        <ToolCallWrapper tool={tool} title="AI Advice">
          <div className="space-y-2">
            <div>
              <span className="font-semibold">Question:</span>
              <div className="mt-1">
                <StyledMarkdown>{tool.args?.question ?? ""}</StyledMarkdown>
              </div>
            </div>
            {data ? (
              <div>
                <span className="font-semibold">Answer:</span>
                <div className="mt-1">
                  <StyledMarkdown>{data.answer}</StyledMarkdown>
                </div>
              </div>
            ) : (
              <ThinkingIndicator />
            )}
          </div>
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
