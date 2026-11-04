"use client";

import { Toaster as SonnerToaster } from "sonner";
import { cn } from "@/lib/utils";

export function Toaster({ className }: { className?: string } = {}) {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      duration={4000}
      closeButton={true}
      className={cn("fixed top-0 right-0 z-50 p-2 sm:bottom-0 sm:right-0 sm:top-auto", className)}
    />
  );
}
