"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ToggleProps extends React.HTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, active = false, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        active ? "bg-accent text-accent-foreground" : "bg-background text-foreground",
        className
      )}
      aria-pressed={active}
      {...props}
    />
  )
);
Toggle.displayName = "Toggle";

export { Toggle };
