"use client";
import { useCallback, useEffect, useState } from "react";
import { BankLink } from "@/components/bank-connections";
import Link from "next/link";
import { useRouter } from "next/navigation";
export default function BankLinkReturn() {
  const router = useRouter();
  const [session, setSession] = useState<{
    sessionId: string;
    token: string;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const value = JSON.parse(
        sessionStorage.getItem("maxpoints-bank-link") || "null",
      );
      if (!value?.sessionId || !value?.token) throw new Error();
      setSession(value);
    } catch {
      setError(
        "Your connection session expired. Return to MaxPoints and start again.",
      );
    }
  }, []);
  const done = useCallback(() => {
    router.replace("/");
  }, [router]);
  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Connect your bank</h1>
      {error ? (
        <p role="alert">{error}</p>
      ) : session ? (
        <BankLink
          session={session}
          receivedRedirectUri={window.location.href}
          onDone={done}
          onError={setError}
        />
      ) : (
        <p>Resuming bank sign-in...</p>
      )}
      <Link href="/" className="text-accent underline">
        Return to MaxPoints
      </Link>
    </main>
  );
}
