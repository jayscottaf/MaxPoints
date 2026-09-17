"use client";
import { useState } from "react";
import { Upload } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function ImportUsage({ onSaved }: { onSaved: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [plans, setPlans] = useState<
    { card: string; perk: string; amount: number }[] | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(commit = false) {
    if (!file || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("confirm", String(commit));
      const response = await fetch("/api/import", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPlans(commit ? null : data.plans);
      if (commit) {
        setMessage(
          "Usage imported. Review period allocation in usage history.",
        );
        await onSaved();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-6 border-t border-line pt-5 text-foreground">
      <h3 className="mb-3 font-semibold">Import Usage</h3>
      <input
        type="file"
        aria-label="Usage workbook"
        accept=".xlsx"
        disabled={busy}
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setPlans(null);
          setMessage("");
        }}
        className="block w-full text-sm"
      />
      <button
        disabled={!file || busy}
        onClick={() => submit(false)}
        className="mt-3 flex items-center gap-2 rounded border border-line px-3 py-2 disabled:opacity-50"
      >
        <Upload className="h-4 w-4" />
        Preview
      </button>
      {plans && (
        <>
          <ul className="my-3 space-y-2 text-sm">
            {plans.map((plan, i) => (
              <li key={i}>
                {plan.card}: {plan.perk} +{formatCurrency(plan.amount)}
              </li>
            ))}
          </ul>
          {plans.length ? (
            <button
              disabled={busy}
              onClick={() => submit(true)}
              className="rounded bg-accent px-3 py-2"
            >
              Import {plans.length} entries
            </button>
          ) : (
            <p>No new usage to import.</p>
          )}
        </>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
