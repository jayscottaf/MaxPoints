"use client";

import { useState } from "react";
import type { CardDetail } from "@/lib/dashboard";
import { CreditCard, Save } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ImportUsage } from "@/components/import-usage";
import { NotificationSettings } from "@/components/notification-settings";
import { Suggestions } from "@/components/suggestions";

type CardSettingsValues = {
  expirationMonth: string;
  renewalDate: string;
  last4: string;
  error: string | null;
  saved: boolean;
  saving: boolean;
};

interface CardSettingsModalProps {
  cards: CardDetail[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

function toMonthInputValue(value: string | Date | null | undefined) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.slice(0, 7);
  }

  return value.toISOString().slice(0, 7);
}

function createInitialValues(cards: CardDetail[]) {
  return cards.reduce<Record<string, CardSettingsValues>>((values, card) => {
    const userCard = card.userCards?.[0];
    if (!userCard) {
      return values;
    }

    values[userCard.id] = {
      expirationMonth: toMonthInputValue(userCard.expirationDate),
      renewalDate: userCard.renewalDate?.slice(0, 10) || "",
      last4: userCard.last4 || "",
      error: null,
      saved: false,
      saving: false,
    };

    return values;
  }, {});
}

export function CardSettingsModal({
  cards,
  onClose,
  onSaved,
}: CardSettingsModalProps) {
  const [values, setValues] = useState<Record<string, CardSettingsValues>>(() =>
    createInitialValues(cards),
  );
  const [tab, setTab] = useState("cards");

  const updateValue = (
    userCardId: string,
    field: "expirationMonth" | "last4" | "renewalDate",
    value: string,
  ) => {
    setValues((current) => ({
      ...current,
      [userCardId]: {
        ...current[userCardId],
        [field]: value,
        error: null,
        saved: false,
      },
    }));
  };

  const saveCard = async (userCardId: string) => {
    const current = values[userCardId];
    if (!current) {
      return;
    }

    if (current.last4 && !/^\d{4}$/.test(current.last4)) {
      setValues((state) => ({
        ...state,
        [userCardId]: {
          ...state[userCardId],
          error: "Last 4 must be exactly 4 digits.",
        },
      }));
      return;
    }

    setValues((state) => ({
      ...state,
      [userCardId]: {
        ...state[userCardId],
        error: null,
        saved: false,
        saving: true,
      },
    }));

    try {
      const response = await fetch(`/api/user-cards/${userCardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expirationMonth: current.expirationMonth || null,
          last4: current.last4 || null,
          renewalDate: current.renewalDate || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save card settings");
      }

      await onSaved();
      setValues((state) => ({
        ...state,
        [userCardId]: {
          ...state[userCardId],
          error: null,
          saved: true,
          saving: false,
        },
      }));
    } catch (error) {
      setValues((state) => ({
        ...state,
        [userCardId]: {
          ...state[userCardId],
          error:
            error instanceof Error
              ? error.message
              : "Failed to save card settings",
          saved: false,
          saving: false,
        },
      }));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title="Settings" onClose={onClose} className="max-w-3xl">
        <div
          className="settings-tabs"
          role="tablist"
          aria-label="Settings sections"
        >
          {[
            { id: "cards", label: "Card details" },
            { id: "notifications", label: "Notifications" },
            { id: "import", label: "Import" },
            { id: "automation", label: "Automation" },
          ].map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              tabIndex={tab === item.id ? 0 : -1}
              aria-controls={`settings-${item.id}`}
              id={`tab-${item.id}`}
              onClick={() => setTab(item.id)}
              onKeyDown={(event) => {
                const ids = ["cards", "notifications", "import", "automation"];
                const index = ids.indexOf(tab);
                const next =
                  event.key === "ArrowRight"
                    ? (index + 1) % ids.length
                    : event.key === "ArrowLeft"
                      ? (index + ids.length - 1) % ids.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? ids.length - 1
                          : -1;
                if (next < 0) return;
                event.preventDefault();
                setTab(ids[next]);
                document.getElementById(`tab-${ids[next]}`)?.focus();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id={`settings-${tab}`}
          aria-labelledby={`tab-${tab}`}
        >
          <div className="space-y-4">
            {tab === "cards" &&
              cards.map((card) => {
                const userCard = card.userCards?.[0];
                if (!userCard) {
                  return null;
                }

                const cardValues = values[userCard.id] || {
                  expirationMonth: "",
                  renewalDate: "",
                  last4: "",
                  error: null,
                  saved: false,
                  saving: false,
                };

                return (
                  <section
                    key={userCard.id}
                    className="border-b border-line pb-5"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-3">
                        <CreditCard className="h-6 w-6 text-accent mt-1" />
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {card.name}
                          </h3>
                          <p className="text-sm text-muted">{card.issuer}</p>
                        </div>
                      </div>
                      {cardValues.saved && (
                        <span className="text-xs text-accent">Saved</span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                      <label className="block">
                        <span className="text-sm text-muted">
                          Annual renewal date
                        </span>
                        <input
                          type="date"
                          value={cardValues.renewalDate}
                          onChange={(e) =>
                            updateValue(
                              userCard.id,
                              "renewalDate",
                              e.target.value,
                            )
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-foreground"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm text-muted">
                          Expiration month
                        </span>
                        <input
                          type="month"
                          value={cardValues.expirationMonth}
                          onChange={(event) =>
                            updateValue(
                              userCard.id,
                              "expirationMonth",
                              event.target.value,
                            )
                          }
                          className="mt-1 w-full px-3 py-2 bg-panel border border-line rounded text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm text-muted">Last 4</span>
                        <input
                          inputMode="numeric"
                          pattern="[0-9]{4}"
                          value={cardValues.last4}
                          onChange={(event) =>
                            updateValue(
                              userCard.id,
                              "last4",
                              event.target.value,
                            )
                          }
                          placeholder="1234"
                          className="mt-1 w-full px-3 py-2 bg-panel border border-line rounded text-foreground placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </label>

                      <button
                        onClick={() => saveCard(userCard.id)}
                        disabled={cardValues.saving}
                        className="h-10 px-4 bg-accent text-foreground rounded hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        <span>{cardValues.saving ? "Saving" : "Save"}</span>
                      </button>
                    </div>

                    {cardValues.error && (
                      <p className="mt-3 text-sm text-red-700">
                        {cardValues.error}
                      </p>
                    )}
                  </section>
                );
              })}
            {tab === "import" && <ImportUsage onSaved={onSaved} />}
            {tab === "notifications" && <NotificationSettings />}
            {tab === "automation" && <Suggestions />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
