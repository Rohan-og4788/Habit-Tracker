"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { twMerge as tailwindMerge } from "tailwind-merge";
import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return tailwindMerge(clsx(inputs));
}

type SlotProps = React.ComponentPropsWithRef<typeof Slot>;

export interface Props extends SlotProps {}
