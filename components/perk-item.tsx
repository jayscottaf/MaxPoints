"use client";

import { useRef, useState } from "react";
import {
  Check,
  Clock,
  DollarSign,
  AlertTriangle,
  Plus,
  History,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  formatCurrency,
  daysUntilDateOnly,
  getPercentageUsed,
  getPerkStatus,
} from "@/lib/utils";
import { calendarDate, cents } from "@/lib/accounting";
import type { PerkDetail } from "@/lib/dashboard";
import { PerkEditor } from "@/components/perk-editor";
import { UsageEditor } from "@/components/usage-editor";
import { getPerkTip } from "@/lib/perk-tips";
import { toast } from "react-hot-toast";

interface PerkItemProps {
  perk: PerkDetail;
  onUsageUpdate: (perkId: string, amount: number) => void;
}

interface UsageEntry {
  id: string;
  amount: number;
  date: string;
  deletedAt?: string | null;
  needsReview?: boolean;
}

export function PerkItem({ perk, onUsageUpdate }: PerkItemProps) {
  const [isLogging, setIsLogging] = useState(false);
  const [amount, setAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<UsageEntry[] | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [date, setDate] = useState(() => perk.today || calendarDate());
  const [confirmRemoval, setConfirmRemoval] = useState<string | null>(null);
  const pending = useRef(false);
  const submission = useRef<{ body: string; key: string } | null>(null);

  const toggleHistory = async () => {
    if (history !== null) {
      setHistory(null);
      return;
    }
    setIsLoadingHistory(true);
    try {
      const response = await fetch(
        `/api/usage?perkId=${encodeURIComponent(perk.id)}&includeDeleted=1`,
      );
      if (!response.ok) throw new Error("Failed to load usage");
      setHistory(await response.json());
    } catch {
      toast.error("Could not load usage history. Please try again.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const deleteUsage = async (entry: UsageEntry) => {
    if (!entry.deletedAt && confirmRemoval !== entry.id) {
      setConfirmRemoval(entry.id);
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/usage?id=${encodeURIComponent(entry.id)}`,
        entry.deletedAt
          ? {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: entry.id, action: "restore" }),
            }
          : { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Failed to delete usage");
      const updated = await response.json();
      setConfirmRemoval(null);
      setHistory(
        (entries) =>
          entries?.map((item) => (item.id === entry.id ? updated : item)) ??
          null,
      );
      const date = new Date(entry.date);
      const inPeriod =
        date >= new Date(perk.periodStart) &&
        (!perk.periodEnd || date <= new Date(perk.periodEnd));
      onUsageUpdate(
        perk.id,
        inPeriod ? (entry.deletedAt ? entry.amount : -entry.amount) : 0,
      );
      toast.success(
        entry.deletedAt
          ? "Usage restored"
          : "Usage removed. Restore it from history.",
      );
    } catch {
      toast.error("Could not delete usage. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentUsage = perk.currentUsage || 0;
  const percentUsed = getPercentageUsed(currentUsage, perk.maxValue);
  const status = getPerkStatus(perk, currentUsage);
  const daysRemaining =
    perk.daysRemaining ??
    (perk.periodEnd ? daysUntilDateOnly(perk.periodEnd) : null);
  const remainingValue =
    perk.claimableValue ?? Math.max(0, cents(perk.maxValue) - cents(currentUsage)) / 100;
  const blocked = perk.retired || perk.needsConfirmation || (perk.periodType === 'four-year' && perk.claimableValue === 0) || ["information", "coverage", "estimate"].includes(perk.valueKind);
  const tip =
    status !== "completed" ? getPerkTip(perk.cardId, perk.name) : null;

  // Core submit shared by the one-tap "Used it" button and the manual entry.
  const submitUsage = async (usageAmount: number) => {
    if (pending.current) return;
    if (!Number.isFinite(usageAmount) || usageAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if ((perk.periodType !== 'per-booking' && currentUsage + usageAmount > perk.maxValue) || (perk.perUseLimit != null && usageAmount > perk.perUseLimit)) {
      toast.error(
        `Amount exceeds maximum value of ${formatCurrency(perk.maxValue)}`,
      );
      return;
    }

    pending.current = true;
    setIsSaving(true);
    try {
      const body = JSON.stringify({
        perkId: perk.id,
        amount: usageAmount,
        date,
      });
      if (submission.current?.body !== body)
        submission.current = { body, key: crypto.randomUUID() };
      const response = await fetch("/api/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perkId: perk.id,
          amount: usageAmount,
          date,
          idempotencyKey: submission.current.key,
        }),
      });

      if (response.ok) {
        toast.success("Usage logged");
        onUsageUpdate(perk.id, usageAmount);
        setAmount("");
        setIsLogging(false);
        setHistory(null);
        submission.current = null;
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to log usage");
      }
    } catch {
      toast.error("Failed to log usage");
    } finally {
      pending.current = false;
      setIsSaving(false);
    }
  };

  const handleLogUsage = () => submitUsage(parseFloat(amount));
  const handleMarkFullyUsed = () => submitUsage(remainingValue);

  const getStatusIcon = () => {
    switch (status) {
      case "completed":
        return <Check className="h-5 w-5 text-accent" />;
      case "expiring":
        return <AlertTriangle className="h-5 w-5 text-amber-700" />;
      case "in-progress":
        return <Clock className="h-5 w-5 text-accent" />;
      default:
        return <DollarSign className="h-5 w-5 text-muted" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 text-accent";
      case "expiring":
        return "bg-amber-50 text-amber-700";
      case "in-progress":
        return "bg-emerald-50 text-accent";
      default:
        return "bg-background text-foreground";
    }
  };

  return (
    <div className="perk-detail">
      <div className="perk-balance">
        <span>
          {perk.retired ? "Retired benefit" : perk.needsConfirmation ? "Details need confirmation" : perk.valueKind === 'information' ? "Informational benefit" : perk.periodType === 'per-booking' ? "Per qualifying booking" : status === "completed"
            ? "Used this period"
            : perk.available
              ? "Available this period"
              : "Period limit"}
        </span>
        <strong>
          {formatCurrency(
            perk.periodType === 'per-booking' ? perk.perUseLimit ?? perk.maxValue : status === "completed"
              ? currentUsage
              : perk.available
                ? perk.availableValue
                : perk.maxValue,
          )}
        </strong>
      </div>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          {getStatusIcon()}
          <div className="flex-1">
            {perk.description && (
              <p className="text-sm text-muted mt-1">{perk.description}</p>
            )}
            {tip && <p className="tip-text">{tip}</p>}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-1 rounded ${getStatusColor()}`}>
                {perk.retired ? 'retired' : perk.needsConfirmation ? 'confirm details' : perk.valueKind === 'information' ? 'information' : status.replace("-", " ")}
              </span>
              {perk.enrollmentRequired && (
                <span className="text-xs px-2 py-1 rounded bg-violet-50 text-violet-700">
                  Enrollment Required
                </span>
              )}
              {perk.category && (
                <span className="text-xs px-2 py-1 rounded bg-background text-muted">
                  {perk.category}
                </span>
              )}
              {!blocked && daysRemaining !== null &&
                daysRemaining >= 0 &&
                daysRemaining <= 30 && (
                  <span className="text-xs px-2 py-1 rounded bg-orange-50 text-orange-700">
                    {daysRemaining} days left
                  </span>
                )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {perk.notes && (
          <p className="text-sm text-muted whitespace-pre-wrap">{perk.notes}</p>
        )}
        {perk.sourceUrl && <a href={perk.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent underline">Official benefit terms</a>}
        {perk.valueKind !== "credit" && (
          <p className="text-xs text-muted">
            {perk.valueKind === "coverage"
              ? "Insurance coverage"
              : perk.valueKind === "estimate"
                ? "Estimated membership value"
                : perk.valueKind === 'information' ? 'Non-cash benefit' : "Membership benefit"}
          </p>
        )}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted">
              {formatCurrency(currentUsage)} / {formatCurrency(perk.maxValue)}
            </span>
            <span className="font-medium text-foreground">{percentUsed}%</span>
          </div>
          <div className="w-full bg-background rounded h-2">
            <div
              className={`h-2 rounded transition-all ${
                percentUsed === 100
                  ? "bg-accent"
                  : percentUsed > 75
                    ? "bg-yellow-500"
                    : "bg-accent"
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
        </div>

        <button
          onClick={toggleHistory}
          disabled={isLoadingHistory || isSaving}
          aria-expanded={history !== null}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground disabled:opacity-60"
        >
          <History className="h-4 w-4" />
          {isLoadingHistory
            ? "Loading..."
            : history !== null
              ? "Hide usage history"
              : "Usage history"}
        </button>
        {history !== null && (
          <ul className="divide-y divide-line text-sm">
            {history.length === 0 && (
              <li className="py-2 text-muted">No usage recorded.</li>
            )}
            {history.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span className="text-foreground">
                  <span className={entry.deletedAt ? "line-through" : ""}>
                    {formatCurrency(entry.amount)}
                  </span>{" "}
                  <span className="text-muted">
                    {new Date(entry.date).toLocaleDateString(undefined, {
                      timeZone: "UTC",
                    })}
                    {entry.deletedAt
                      ? " (removed)"
                      : entry.needsReview
                        ? " (period needs review)"
                        : ""}
                  </span>
                </span>
                {!entry.deletedAt && (
                  <UsageEditor
                    entry={entry}
                    today={perk.today}
                    onSaved={() => {
                      setHistory(null);
                      onUsageUpdate(perk.id, 0);
                    }}
                  />
                )}
                <button
                  onClick={() => deleteUsage(entry)}
                  disabled={isSaving}
                  title={
                    entry.deletedAt
                      ? "Restore usage"
                      : confirmRemoval === entry.id
                        ? "Confirm removal"
                        : "Remove usage"
                  }
                  aria-label={
                    confirmRemoval === entry.id
                      ? "Confirm removal"
                      : `${entry.deletedAt ? "Restore" : "Remove"} ${formatCurrency(entry.amount)} usage`
                  }
                  className="flex min-h-9 min-w-9 shrink-0 items-center justify-center gap-1 rounded px-2 text-muted hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
                >
                  {entry.deletedAt ? (
                    <Undo2 className="h-4 w-4" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {confirmRemoval === entry.id && "Remove"}
                </button>
                {confirmRemoval === entry.id && (
                  <button
                    onClick={() => setConfirmRemoval(null)}
                    className="text-muted"
                  >
                    Cancel
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {perk.needsConfirmation && <p className="text-sm text-amber-700">Confirm your benefit dates, eligibility and any previous usage in Benefit terms before recording new usage.</p>}
        {perk.perUseLimit != null && !blocked && <p className="text-sm text-muted">Up to {formatCurrency(perk.perUseLimit)} per qualifying purchase. Record each purchase separately.</p>}
        {perk.needsReview && !perk.needsConfirmation && (
          <p className="text-sm text-amber-700">
            Historical usage needs period review.
          </p>
        )}
        {!blocked && status !== "completed" && status !== "upcoming" && (
          <div>
            {!isLogging ? (
              <div className="flex flex-wrap items-center gap-2">
                {/* One-tap: most credits are all-or-nothing, so log the full remainder. */}
                {status !== "expired" && (
                  <button
                    onClick={handleMarkFullyUsed}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-600 text-foreground rounded hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Check className="h-4 w-4" />
                    <span>
                      Used it
                      {remainingValue > 0
                        ? ` (${formatCurrency(remainingValue)})`
                        : ""}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => setIsLogging(true)}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-accent hover:text-accent disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  <span>
                    {status === "expired" ? "Log past usage" : "Log partial"}
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  aria-label="Usage date"
                  value={date}
                  max={perk.today || calendarDate()}
                  onChange={(e) => setDate(e.target.value)}
                  className="min-w-0 rounded border border-line bg-background px-2 py-1 text-sm text-foreground"
                />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !isSaving && handleLogUsage()
                  }
                  placeholder="Amount"
                  autoFocus
                  aria-label="Usage amount"
                  className="w-28 min-w-0 px-2 py-1 text-sm bg-background border border-line rounded text-foreground placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                  min="0"
                  max={remainingValue}
                />
                <button
                  onClick={handleLogUsage}
                  disabled={isSaving}
                  className="px-3 py-1 text-sm bg-accent text-foreground rounded hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setIsLogging(false);
                    setAmount("");
                  }}
                  disabled={isSaving}
                  className="px-3 py-1 text-sm text-muted hover:text-foreground disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
        <div className="perk-options">
          <span>Benefit terms</span>
          <PerkEditor perk={perk} onSaved={() => onUsageUpdate(perk.id, 0)} />
        </div>
      </div>
    </div>
  );
}
