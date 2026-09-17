"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, History, RefreshCw } from "lucide-react";
import { z } from "zod";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
const entriesSchema = z.array(
  z.object({
    id: z.string(),
    perkId: z.string(),
    amount: z.number(),
    date: z.string(),
    deletedAt: z.string().nullable(),
    needsReview: z.boolean(),
    perk: z.object({ name: z.string(), cardId: z.string() }),
  }),
);
export function ActivityView({
  year,
  onSelect,
}: {
  year: number;
  onSelect: (id: string) => void;
}) {
  const [entries, setEntries] = useState<z.infer<typeof entriesSchema>>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [removed, setRemoved] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/usage?includeDeleted=1", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setEntries(entriesSchema.parse(await response.json()));
        setError("");
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Activity could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  const visible = entries.filter(
    (entry) =>
      Number(entry.date.slice(0, 4)) === year &&
      Boolean(entry.deletedAt) === removed,
  );
  return (
    <section className="activity-view">
      <div className="section-heading">
        <div className="segment-control">
          <button aria-pressed={!removed} onClick={() => setRemoved(false)}>
            Recorded
          </button>
          <button aria-pressed={removed} onClick={() => setRemoved(true)}>
            Removed
          </button>
        </div>
        <span className="result-count">Recent 200 entries</span>
      </div>
      {error && (
        <div role="alert" className="error-banner">
          {error}
          <button
            className="text-action"
            onClick={() => {
              setLoading(true);
              setRetry((value) => value + 1);
            }}
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      )}
      {loading ? (
        <div className="loading-lines" aria-label="Loading activity" />
      ) : !visible.length ? (
        <div className="empty-state">
          <History size={28} />
          <h3>
            No {removed ? "removed" : "recorded"} usage in {year}
          </h3>
        </div>
      ) : (
        visible.map((entry) => (
          <button
            key={entry.id}
            className="activity-row"
            onClick={() => onSelect(entry.perkId)}
            aria-label={`View ${entry.perk.name} usage`}
          >
            <span className="activity-date">{formatDateOnly(entry.date)}</span>
            <span className="activity-name">
              <strong>{entry.perk.name}</strong>
              <small>
                {removed
                  ? "Removed"
                  : entry.needsReview
                    ? "Needs period review"
                    : "Usage recorded"}
              </small>
            </span>
            <strong className={removed ? "muted line-through" : "positive"}>
              {formatCurrency(entry.amount)}
            </strong>
            <ArrowUpRight size={16} />
          </button>
        ))
      )}
    </section>
  );
}
