"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { Controller } from "react-hook-form";
import { type FieldPath, type FieldValues } from "react-hook-form";
import { useFormState } from "react-hook-form";
import { type UseFormReturn } from "react-hook-form";

export function useFormHook<T extends FieldValues>(opts?: Parameters<typeof useForm<T>>[0]) {
  return useForm<T>(opts);
}

export { Controller };

type FormProps<T extends FieldValues> = {
  form: UseFormReturn<T>;
  children: React.ReactNode;
};

export function Form<T extends FieldValues>({ form, children }: FormProps<T>) {
  return (
    <form
      className="space-y-8"
      {...(children as any)}
    >
      {children}
    </form>
  );
}

// Re-export useful types
export type { FieldPath };
