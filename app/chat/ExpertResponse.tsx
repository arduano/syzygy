"use client";

import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { StyledMarkdown } from "@/components/chat/StyledMarkdown.tsx";
import { useState } from "react";
import { HiOutlineLightBulb, HiOutlinePencil } from "react-icons/hi2";
import { cn } from "@/lib/utils.ts";

interface ExpertResponseProps {
  title: string;
  id: string;
  responseContent?: string;
  reasoningContent?: string;
  complete: boolean;
  index: number;
  startTime?: string;
  endTime?: string;
}

function calculateProgress(reasoningContent?: string, responseContent?: string) {
  const total = (reasoningContent?.length ?? 0) + (responseContent?.length ?? 0);
  return Math.min(Math.sqrt(total) / Math.sqrt(32000), 1) * 100;
}

function formatDuration(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const seconds = Math.floor(diff / 1000);
  return `${seconds}s`;
}

function ExpertProgressIndicator({
  reasoningContent,
  responseContent,
  complete,
  startTime,
  endTime,
}: {
  reasoningContent?: string;
  responseContent?: string;
  complete: boolean;
  startTime?: string;
  endTime?: string;
}) {
  if (complete) {
    if (startTime && endTime) {
      return (
        <div className="ml-auto text-xs text-muted-foreground">
          {formatDuration(startTime, endTime)}
        </div>
      );
    }
    return null;
  }

  const responseLength = responseContent?.length ?? 0;
  const hasResponse = responseLength > 0;
  const progress = calculateProgress(reasoningContent, responseContent);

  return (
    <div className="ml-auto flex items-center gap-3">
      <div className="w-24 h-1 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary/50 transition-all duration-1000 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <HiOutlineLightBulb
          size={14}
          className={cn(
            "transition-opacity duration-1000",
            !hasResponse && "text-amber-400 animate-in fade-in-0 duration-1000",
            hasResponse && "text-amber-400/40"
          )}
        />
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <HiOutlinePencil
          size={14}
          className={cn(
            "transition-opacity duration-1000",
            hasResponse && "text-blue-400 animate-in fade-in-0 duration-1000",
            !hasResponse && "opacity-40"
          )}
        />
      </div>
    </div>
  );
}

export function ExpertResponse({
  title,
  id,
  responseContent,
  reasoningContent,
  complete,
  index,
  startTime,
  endTime,
}: ExpertResponseProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasContent = responseContent || reasoningContent;

  return (
    <>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => hasContent && setIsOpen(true)}
      >
        <div className="flex w-full items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-sm">
            {index}
          </div>
          <div className="font-semibold truncate">{title}</div>
          <ExpertProgressIndicator
            reasoningContent={reasoningContent}
            responseContent={responseContent}
            complete={complete}
            startTime={startTime}
            endTime={endTime}
          />
        </div>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-sm">
                  {index}
                </div>
                <div>{title}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="pr-4">
            <div className="max-h-[60vh]">
              <ExpertResponseContent
                reasoningContent={reasoningContent}
                responseContent={responseContent}
              />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExpertResponseContent({
  reasoningContent,
  responseContent,
}: {
  reasoningContent?: string;
  responseContent?: string;
}) {
  return (
    <>
      {reasoningContent && (
        <div className="mb-4">
          <blockquote className="border-l-4 border-accent pl-4 text-muted-foreground">
            <StyledMarkdown>{reasoningContent}</StyledMarkdown>
          </blockquote>
        </div>
      )}
      {responseContent && <StyledMarkdown>{responseContent}</StyledMarkdown>}
    </>
  );
}
