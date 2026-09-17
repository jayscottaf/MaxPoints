"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Command, ArrowRight, ShieldCheck } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...(sent ? { code } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.signedIn) {
        router.replace("/");
        router.refresh();
      } else setSent(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <form onSubmit={submit} className="login-form">
        <div className="login-brand">
          <span className="brand-mark">
            <Command size={22} />
          </span>
          MaxPoints.
        </div>
        <p className="eyebrow">YOUR PRIVATE WALLET</p>
        <h1>{sent ? "Check your inbox." : "Welcome back."}</h1>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            disabled={sent || busy}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        {sent && (
          <label>
            Sign-in code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{8}"
              maxLength={8}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="8-digit code"
            />
          </label>
        )}
        {error && (
          <p role="alert" className="error-banner">
            {error}
          </p>
        )}
        <button disabled={busy} className="primary-button">
          {busy ? "Please wait..." : sent ? "Sign in" : "Email me a code"}
          <ArrowRight size={16} />
        </button>
        {sent && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setSent(false);
              setCode("");
              setError("");
            }}
            className="text-action"
          >
            Request another code
          </button>
        )}
        <p className="login-note">
          <ShieldCheck size={13} />
          Owner-only access
        </p>
      </form>
    </main>
  );
}
