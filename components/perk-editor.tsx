"use client";
import { useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import type { PerkDetail } from "@/lib/dashboard";

export function PerkEditor({
  perk,
  onSaved,
}: {
  perk: PerkDetail;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/perks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: perk.id,
          maxValue: Number(form.get("maxValue")),
          periodValue:
            form.get("periodValue") === ""
              ? null
              : Number(form.get("periodValue")),
          decemberBonus: Number(form.get("decemberBonus")),
          periodType: form.get("periodType"),
          valueKind: form.get("valueKind"),
          startDate: form.get("startDate") || null,
          endDate: form.get("endDate") || null,
          notes: form.get("notes"),
          enrollmentRequired: form.get("enrollmentRequired") === "on",
        }),
      });
      if (!response.ok)
        throw new Error((await response.json()).error || "Save failed.");
      onSaved();
      setOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  if (!open)
    return (
      <button
        title="Edit benefit"
        aria-label={`Edit ${perk.name}`}
        onClick={() => setOpen(true)}
        className="rounded p-2 text-muted hover:bg-background"
      >
        <Pencil className="h-4 w-4" />
      </button>
    );
  const fieldClass =
    "mt-1 w-full rounded border border-line bg-panel p-2 text-foreground";
  return (
    <form
      onSubmit={submit}
      className="my-3 grid grid-cols-1 gap-3 border-t border-line pt-3 text-sm sm:grid-cols-2"
    >
      <label>
        Annual / one-time value
        <input
          name="maxValue"
          type="number"
          min="0"
          step="0.01"
          defaultValue={perk.faceValue ?? perk.annualValue}
          required
          className={fieldClass}
        />
      </label>
      <label>
        Per-period limit
        <input
          name="periodValue"
          type="number"
          min="0"
          step="0.01"
          defaultValue={perk.periodValue ?? ""}
          className={fieldClass}
        />
      </label>
      <label>
        Period
        <select
          name="periodType"
          defaultValue={perk.periodType}
          className={fieldClass}
        >
          {["monthly", "quarterly", "semi-annual", "annual", "one-time"].map(
            (value) => (
              <option key={value}>{value}</option>
            ),
          )}
        </select>
      </label>
      <label>
        Value type
        <select
          name="valueKind"
          defaultValue={perk.valueKind}
          className={fieldClass}
        >
          {["credit", "membership", "coverage", "estimate"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label>
        Start date
        <input
          name="startDate"
          type="date"
          defaultValue={perk.startDate?.slice(0, 10) ?? ""}
          className={fieldClass}
        />
      </label>
      <label>
        End date
        <input
          name="endDate"
          type="date"
          defaultValue={perk.endDate?.slice(0, 10) ?? ""}
          className={fieldClass}
        />
      </label>
      <label>
        December bonus
        <input
          name="decemberBonus"
          type="number"
          min="0"
          step="0.01"
          defaultValue={perk.decemberBonus ?? 0}
          className={fieldClass}
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          name="enrollmentRequired"
          type="checkbox"
          defaultChecked={perk.enrollmentRequired}
        />
        Enrollment required
      </label>
      <label className="sm:col-span-2">
        Notes
        <textarea
          name="notes"
          maxLength={4000}
          defaultValue={perk.notes ?? ""}
          className={fieldClass}
        />
      </label>
      {error && (
        <p role="alert" className="text-red-700 sm:col-span-2">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          disabled={busy}
          title="Save benefit"
          className="flex items-center gap-2 rounded bg-accent px-3 py-2 text-foreground"
        >
          <Save className="h-4 w-4" />
          Save
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(false)}
          title="Cancel edit"
          className="rounded p-2 text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
