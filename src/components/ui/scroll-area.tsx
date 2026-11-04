"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      {...props}
    />
  )
);
ScrollArea.displayName = "ScrollArea";

const ScrollBar = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("absolute flex bottom-1 right-1 gap-1", className)}
      {...props}
    />
  )
);
ScrollBar.displayName = "ScrollBar";

const ScrollBarButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button">
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "shrink-0 rounded-md border border-input bg-secondary p-2",
      className
    )}
    {...props}
  />
));
ScrollBarButton.displayName = "ScrollBarButton";

const Track = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("w-1.5", className)}
      {...props}
    />
  )
);
Track.displayName = "Track";

const Thumb = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-full bg-accent", className)}
      {...props}
    />
  )
);
Thumb.displayName = "Thumb";

export { ScrollArea, ScrollBar, ScrollBarButton, Track, Thumb };
