"use client";
import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useRouter } from "next/navigation";
import { Check, Link2, RefreshCw, Unplug, X, Undo2, Pause } from "lucide-react";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

type LinkSession = { sessionId: string; token: string };
type Credit = {
  id: string;
  description: string;
  date: string;
  amountCents: number;
  status: string;
  candidatePerkIds: string[];
  usageId: string | null;
  repeatEnabledAt: string | null;
  autoApproved: boolean;
  account: { name: string; mask: string | null; cardId: string | null };
};
type BankData = {
  configured: boolean;
  environment: string;
  connections: {
    id: string;
    name: string;
    environment: string;
    lastSyncedAt: string | null;
    lastError: string | null;
    accounts: {
      id: string;
      name: string;
      mask: string | null;
      cardId: string | null;
    }[];
  }[];
  suggestions: Credit[];
  repeatRules: { id: string; description: string; amountCents: number }[];
  cards: {
    id: string;
    name: string;
    issuer: string;
    perks: { id: string; name: string; periodType: string }[];
  }[];
};
export async function bankRequest(input: Record<string, unknown>) {
  const response = await fetch("/api/bank-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Bank connection unavailable.");
  return data;
}
export function BankLink({
  session,
  receivedRedirectUri,
  onDone,
  onError,
}: {
  session: LinkSession;
  receivedRedirectUri?: string;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const onSuccess = useCallback(
    async (publicToken: string | null) => {
      try {
        if (!publicToken)
          throw new Error(
            "No bank connection token was returned. Please start again.",
          );
        await bankRequest({
          action: "exchange",
          sessionId: session.sessionId,
          publicToken,
        });
        sessionStorage.removeItem("maxpoints-bank-link");
        onDone();
      } catch (error) {
        onError(error instanceof Error ? error.message : "Connection failed.");
      }
    },
    [session.sessionId, onDone, onError],
  );
  const { open, ready, error } = usePlaidLink({
    token: session.token,
    receivedRedirectUri,
    onSuccess,
    onExit: () => {
      sessionStorage.removeItem("maxpoints-bank-link");
      onError("Bank connection closed.");
    },
  });
  useEffect(() => {
    if (ready) open();
  }, [ready, open]);
  useEffect(() => {
    if (error) onError("Plaid could not open. Please try again.");
  }, [error, onError]);
  return (
    <p role="status" className="text-sm text-muted">
      Opening secure bank sign-in...
    </p>
  );
}

function CreditReview({
  credit,
  data,
  busy,
  run,
}: {
  credit: Credit;
  data: BankData;
  busy: boolean;
  run: (input: Record<string, unknown>) => Promise<void>;
}) {
  const [perkId, setPerkId] = useState(credit.candidatePerkIds[0] || "");
  const [date, setDate] = useState(credit.date);
  const [amount, setAmount] = useState(String(-credit.amountCents / 100));
  const [duplicate, setDuplicate] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const card = data.cards.find((card) => card.id === credit.account.cardId);
  const repeatEligible = card?.id === 'amex-platinum' && credit.candidatePerkIds.length === 1 && card.perks.some(perk => perk.id === credit.candidatePerkIds[0] && perk.periodType === 'monthly' && ['Digital Entertainment Credit', 'Walmart+ Membership'].includes(perk.name));
  return (
    <article className="border-b border-line py-4 space-y-3">
      <div className="flex flex-wrap justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-semibold break-words">{credit.description}</h4>
          <p className="text-sm text-muted">
            {card?.name || credit.account.name}
            {credit.account.mask ? ` ending ${credit.account.mask}` : ""}
          </p>
        </div>
        <strong>{formatCurrency(-credit.amountCents / 100)}</strong>
      </div>
      <p className="text-sm text-muted">Posted {formatDateOnly(credit.date)}</p>
      {credit.autoApproved && <p className="text-sm font-medium text-action">{credit.status === 'undone' ? 'Automatic approval undone' : 'Automatically approved repeat'}</p>}
      {repeatEligible && !credit.autoApproved && ['approved', 'pending'].includes(credit.status) && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" disabled={busy} checked={!!credit.repeatEnabledAt} onChange={event => void run({ action: 'repeat', id: credit.id, enabled: event.target.checked })} />
          {credit.status === 'pending' ? 'Already recorded in Activity: match this credit and enable future exact repeats' : 'Auto-approve future exact repeats'}
        </label>
      )}
      {credit.autoApproved && credit.status !== 'undone' && (
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={busy} type="button" className="inline-flex items-center gap-2 text-action" onClick={() => { if (confirmUndo) void run({ action: 'undo', id: credit.id }); else setConfirmUndo(true); }}><Undo2 size={16} />{confirmUndo ? 'Confirm undo & pause' : 'Undo approval & pause repeats'}</button>
          {confirmUndo && <button type="button" disabled={busy} className="text-sm text-muted" onClick={() => setConfirmUndo(false)}>Cancel</button>}
        </div>
      )}
      {credit.status === "pending" ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run({
              action: "approve",
              id: credit.id,
              perkId,
              date,
              amount: Number(amount),
              acknowledgeDuplicate: duplicate,
            });
          }}
        >
          <label className="block text-sm">
            Benefit
            <select
              aria-label={`Benefit for ${credit.description}`}
              className="block w-full mt-1 border border-line rounded p-2 bg-panel"
              value={perkId}
              onChange={(event) => setPerkId(event.target.value)}
              required
            >
              {card?.perks
                .filter((perk) => credit.candidatePerkIds.includes(perk.id))
                .map((perk) => (
                  <option key={perk.id} value={perk.id}>
                    {perk.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm">
              Purchase / benefit usage date
              <input
                className="block w-full mt-1 border border-line rounded p-2 bg-panel"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </label>
            <label className="text-sm">
              Amount to record
              <input
                className="block w-full mt-1 border border-line rounded p-2 bg-panel"
                type="number"
                min="0.01"
                max={-credit.amountCents / 100}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </label>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              className="mt-1"
              type="checkbox"
              checked={duplicate}
              onChange={(event) => setDuplicate(event.target.checked)}
            />
            I checked history; any matching amount is a different use.
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              disabled={busy}
              type="submit"
              className="primary-button"
            >
              <Check size={16} />
              Approve usage
            </button>
            <button
              disabled={busy}
              type="button"
              onClick={() =>
                void run({ action: "dismiss", id: credit.id, dismissed: true })
              }
              className="inline-flex items-center gap-2 text-action"
            >
              <X size={16} />
              Dismiss
            </button>
          </div>
        </form>
      ) : credit.status === "dismissed" ? (
        <button
          disabled={busy}
          className="inline-flex gap-2 text-action"
          onClick={() =>
            void run({ action: "dismiss", id: credit.id, dismissed: false })
          }
        >
          <Undo2 size={16} />
          Restore suggestion
        </button>
      ) : (
        <p
          className={
            credit.status === "review"
              ? "text-amber-800 text-sm"
              : "text-sm text-muted"
          }
        >
          {credit.status === "review"
            ? "The bank changed or removed this credit after approval. Check its recorded usage in Activity before making a correction."
            : credit.status === 'undone' ? "Usage removed. Repeat approval is paused. This credit will not be re-approved by sync." : "Usage approved. You can edit or remove it from Activity."}
        </p>
      )}
    </article>
  );
}

export function BankConnections({
  onSaved,
  reviewOnly = false,
}: {
  onSaved?: () => Promise<void>;
  reviewOnly?: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState<BankData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/bank-connections");
      if (!response.ok) throw new Error("Bank connections unavailable.");
      setData(await response.json());
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Bank connections unavailable.",
      );
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const run = useCallback(
    async (input: Record<string, unknown>) => {
      setBusy(true);
      setError("");
      try {
        await bankRequest(input);
        await load();
        if (["approve", "undo", "sync", "repeat"].includes(String(input.action))) await onSaved?.();
      } catch (error) {
        setError(error instanceof Error ? error.message : "Please retry.");
      } finally {
        setBusy(false);
      }
    },
    [load, onSaved],
  );
  const linkError = useCallback((message: string) => {
    setBusy(false);
    setError(message);
  }, []);
  const credits =
    data?.suggestions.filter((item) =>
      history
        ? ["approved", "dismissed", "undone"].includes(item.status)
        : ["pending", "review"].includes(item.status),
    ) || [];
  return (
    <section className="space-y-4 border-t border-line pt-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">
          {reviewOnly ? "Bank credit review" : "Banks & credits"}
        </h3>
        <button
          disabled={busy}
          className="text-action"
          title="Refresh bank credit list"
          aria-label="Refresh bank credit list"
          onClick={() => void load()}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700 break-words">
          {error}
        </p>
      )}
      {!data ? (
        <p role="status" className="text-sm text-muted">
          Loading bank connections...
        </p>
      ) : (
        <>
          {!reviewOnly && (
            <>
              <p className="text-sm text-muted">
                Read-only transaction access. Exact repeats can be approved automatically when enabled; other credits need review.{" "}
                {data.environment === "sandbox" ? "Test environment." : ""}
              </p>
              {!data.configured ? (
                <p className="text-sm text-muted">
                  Bank linking is awaiting Plaid account setup.
                </p>
              ) : (
                <button
                  disabled={busy}
                  className="primary-button"
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      const next = await bankRequest({ action: "link" });
                      sessionStorage.setItem(
                        "maxpoints-bank-link",
                        JSON.stringify(next),
                      );
                      // Plaid must open outside Radix's modal focus trap.
                      router.push("/bank-link");
                    } catch (error) {
                      linkError(
                        error instanceof Error
                          ? error.message
                          : "Connection failed.",
                      );
                    }
                  }}
                >
                  <Link2 size={16} />
                  Connect Amex or Chase
                </button>
              )}
              {data.connections.map((connection) => (
                <div
                  key={connection.id}
                  className="border-b border-line pb-4 space-y-3"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <strong>{connection.name}</strong>
                    <div className="flex gap-3">
                      <button
                        disabled={busy || !data.configured}
                        className="inline-flex gap-1 items-center text-action"
                        onClick={() =>
                          void run({ action: "sync", id: connection.id })
                        }
                      >
                        <RefreshCw size={15} />
                        Sync
                      </button>
                      <button
                        disabled={busy || !data.configured}
                        className="inline-flex gap-1 items-center text-action"
                        onClick={() =>
                          void run({ action: "disconnect", id: connection.id })
                        }
                      >
                        <Unplug size={15} />
                        Disconnect
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-muted">
                    {connection.lastSyncedAt
                      ? `Last synced ${new Date(connection.lastSyncedAt).toLocaleString()}`
                      : "Choose the matching cards, then sync."}
                  </p>
                  {connection.lastError && (
                    <p role="alert" className="text-sm text-amber-800">
                      {connection.lastError}
                    </p>
                  )}
                  {connection.accounts.map((account) => (
                    <label className="block text-sm" key={account.id}>
                      {account.name}
                      {account.mask ? ` ending ${account.mask}` : ""}
                      <select
                        className="block w-full mt-1 border border-line rounded p-2 bg-panel"
                        aria-label={`Match ${account.name} ${account.mask || ""} to a card`}
                        disabled={busy}
                        value={account.cardId || ""}
                        onChange={(event) =>
                          void run({
                            action: "map",
                            id: account.id,
                            cardId: event.target.value || null,
                          })
                        }
                      >
                        <option value="">Not tracked</option>
                        {data.cards
                          .filter(
                            (card) =>
                              /american express/i.test(connection.name) ===
                              /american express|amex/i.test(
                                card.issuer + " " + card.name,
                              ),
                          )
                          .map((card) => (
                            <option key={card.id} value={card.id}>
                              {card.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  ))}
                </div>
              ))}
            </>
          )}
          {!!data.repeatRules.length && (
            <div className="border-y border-line py-3 space-y-3">
              <h4 className="text-sm font-semibold">Automatic repeats</h4>
              {data.repeatRules.map(rule => (
                <div key={rule.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0 break-words">{rule.description}<span className="block text-muted">{formatCurrency(-rule.amountCents / 100)} · exact monthly match</span></span>
                  <button type="button" disabled={busy} title={`Pause repeats for ${rule.description}`} aria-label={`Pause repeats for ${rule.description}`} className="p-2 text-action shrink-0" onClick={() => void run({ action: 'repeat', id: rule.id, enabled: false })}><Pause size={16} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="segment-control">
            <button aria-pressed={!history} onClick={() => setHistory(false)}>
              To review
            </button>
            <button aria-pressed={history} onClick={() => setHistory(true)}>
              History
            </button>
          </div>
          {!credits.length && (
            <p className="text-sm text-muted">
              {history
                ? "No reviewed bank credits yet."
                : "No bank credits waiting for review."}
            </p>
          )}
          {credits.map((credit) => (
            <CreditReview
              key={`${credit.id}:${credit.status}`}
              credit={credit}
              data={data}
              busy={busy}
              run={run}
            />
          ))}
        </>
      )}
    </section>
  );
}
