"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}

const Separator = React.forwardRef<HTMLHRElement, SeparatorProps>(
  ({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
    <hr
      ref={ref}
      className={cn(
        "relative flex w-full shrink-0 [&>hr]:shrink-0 [&>hr]:m-0",
        orientation === "horizontal" ? "h-[1px] w-full shrink-0" : "h-full w-[1px] shrink-0",
        className
      )}
      aria-orientation={orientation}
      aria-hidden={decorative}
      {...props}
    />
  )
);
Separator.displayName = "Separator";

export { Separator };
