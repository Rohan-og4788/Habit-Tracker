"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/lib/use-toast";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const success = searchParams.get("success") === "1";
  const error = searchParams.get("error");

  useEffect(() => {
    if (success) {
      toast({ variant: "success", message: "Email verified successfully!" });
    } else if (error) {
      toast({
        variant: "destructive",
        message: "Verification failed. Please request a new link.",
      });
    }
  }, [success, error, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        {success ? (
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
        ) : (
          <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        )}
        <h1 className="text-2xl font-bold mb-2">
          {success ? "Email verified" : "Verification link invalid"}
        </h1>
        <p className="text-muted-foreground mb-6">
          {success
            ? "Your email address has been confirmed. You can now sign in."
            : "This verification link is invalid or has expired. Sign in and request a new verification email from your profile."}
        </p>
        <Button asChild className="w-full">
          <Link href="/auth/login">Continue to sign in</Link>
        </Button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <p className="text-muted-foreground">Verifying your email…</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
