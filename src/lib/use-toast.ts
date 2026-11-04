"use client";

import { toast } from "sonner";

type ToastOpts = {
  variant?: "default" | "destructive" | "success";
  description?: string;
};

export function useToast() {
  const show = (
    messageOrOpts: string | { variant?: ToastOpts["variant"]; message?: string; description?: string },
    maybeOpts?: ToastOpts
  ) => {
    let message: string;
    let variant: ToastOpts["variant"] = "default";
    let description: string | undefined;

    if (typeof messageOrOpts === "string") {
      message = messageOrOpts;
      variant = maybeOpts?.variant ?? "default";
      description = maybeOpts?.description;
    } else {
      message = messageOrOpts.message ?? "";
      variant = messageOrOpts.variant ?? "default";
      description = messageOrOpts.description;
    }

    if (variant === "success") {
      return toast.success(description ?? message);
    }
    if (variant === "destructive") {
      return toast.error(description ?? message);
    }
    return toast(message, { description });
  };

  return { toast: show };
}
