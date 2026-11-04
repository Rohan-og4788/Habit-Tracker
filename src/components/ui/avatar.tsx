"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  size?: "sm" | "default" | "lg";
}

const sizes = {
  sm: "h-8 w-8",
  default: "h-10 w-10",
  lg: "h-12 w-12",
};

const Avatar = React.forwardRef<HTMLImageElement, AvatarProps>(
  ({ className, size = "default", src, alt, ...props }, ref) => {
    return (
      // Avatars accept arbitrary external URLs, so next/image optimisation is
      // not applicable here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={cn("rounded-full object-cover", sizes[size], className)}
        {...props}
      />
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
