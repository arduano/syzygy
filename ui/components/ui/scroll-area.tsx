"use client";

import { cn } from "@/ui/lib/utils.ts";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as React from "react";

const ScrollArea = ({
  ref,
  viewportRef,
  className,
  children,
  orientation = "vertical",
  onScroll,
  ...props
}: React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
  ref?: React.Ref<React.ElementRef<typeof ScrollAreaPrimitive.Root>>;
  viewportRef?: React.Ref<HTMLDivElement>;
  orientation?: "vertical" | "horizontal" | "both";
}) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden min-h-0 flex flex-col", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport
      ref={viewportRef}
      className="flex-1 w-full min-h-0 min-w-0 rounded-[inherit]"
      onScroll={onScroll}
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
    {(orientation === "vertical" || orientation === "both") && (
      <ScrollBar orientation="vertical" />
    )}
    {(orientation === "horizontal" || orientation === "both") && (
      <ScrollBar orientation="horizontal" />
    )}
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
);
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = ({
  ref,
  className,
  orientation = "vertical",
  ...props
}: React.ComponentPropsWithoutRef<
  typeof ScrollAreaPrimitive.ScrollAreaScrollbar
> & {
  ref?: React.RefObject<
    React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
  >;
}) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
);
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
