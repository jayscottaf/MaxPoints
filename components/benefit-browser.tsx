"use client";
import { useState } from "react";
import {
  Search,
  ArrowUpRight,
  Check,
  Clock,
  Utensils,
  Plane,
  ShoppingBag,
  Heart,
  Play,
  Gift,
  X,
} from "lucide-react";
import type { PerkDetail } from "@/lib/dashboard";
import { filterBenefits, type BenefitFilter } from "@/lib/benefit-view";
import { formatCurrency, formatDateOnly, getPerkStatus } from "@/lib/utils";

export function BenefitIcon({ category }: { category?: string | null }) {
  const Icon =
    category === "dining"
      ? Utensils
      : category === "travel"
        ? Plane
        : category === "shopping"
          ? ShoppingBag
          : category === "wellness"
            ? Heart
            : category === "entertainment"
              ? Play
              : Gift;
  return (
    <span className={`benefit-icon category-${category || "other"}`}>
      <Icon size={18} strokeWidth={1.7} />
    </span>
  );
}
export function BenefitRow({
  perk,
  onSelect,
  due = false,
}: {
  perk: PerkDetail;
  onSelect: (id: string) => void;
  due?: boolean;
}) {
  const status = getPerkStatus(perk, perk.currentUsage);
  const completed = status === "completed";
  const days = perk.daysRemaining;
  return (
    <button
      className="benefit-row"
      onClick={() => onSelect(perk.id)}
      aria-label={`Open ${perk.name}, ${perk.card.name}`}
    >
      <BenefitIcon category={perk.category} />
      <span className="benefit-row-name">
        <strong>{perk.name}</strong>
        <span>{perk.card.name}</span>
      </span>
      <span className="benefit-row-period">
        {perk.periodEnd ? formatDateOnly(perk.periodEnd) : "No fixed expiry"}
        <small>{perk.periodType}</small>
      </span>
      <span
        className={`benefit-status ${perk.needsReview ? "review" : completed ? "complete" : due && days !== undefined && days !== null && days <= 14 ? "urgent" : ""}`}
      >
        {perk.needsReview ? (
          "Review usage"
        ) : completed ? (
          <>
            <Check size={12} />
            Used
          </>
        ) : due ? (
          <>
            <Clock size={12} />
            {days === 0 ? "Today" : `${days ?? "?"} days left`}
          </>
        ) : (
          status.replace("-", " ")
        )}
      </span>
      <span className="benefit-row-value">
        <strong>
          {formatCurrency(completed ? perk.currentUsage : perk.availableValue)}
        </strong>
        <small>{completed ? "used" : "available"}</small>
      </span>
      <ArrowUpRight className="row-arrow" size={17} />
    </button>
  );
}
export function BenefitBrowser({
  perks,
  onSelect,
  initialFilter = "all",
}: {
  perks: PerkDetail[];
  onSelect: (id: string) => void;
  initialFilter?: BenefitFilter;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<BenefitFilter>(initialFilter);
  const [cardId, setCardId] = useState("");
  const cards = [
    ...new Map(perks.map((perk) => [perk.cardId, perk.card.name])).entries(),
  ];
  const results = filterBenefits(perks, query, filter, cardId);
  return (
    <div className="benefit-browser">
      <div className="benefit-tools">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Search benefits"
            placeholder="Search benefits or cards"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>
        {cards.length > 1 && (
          <select
            aria-label="Filter by card"
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
          >
            <option value="">All cards</option>
            {cards.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="benefit-filter-line">
        <div className="segment-control" aria-label="Benefit status">
          {(["all", "available", "used", "review"] as const).map((value) => (
            <button
              key={value}
              aria-pressed={value === filter}
              onClick={() => setFilter(value)}
            >
              {value === "all"
                ? "All benefits"
                : value === "review"
                  ? "Needs review"
                  : value[0].toUpperCase() + value.slice(1)}
              <span>{filterBenefits(perks, "", value, cardId).length}</span>
            </button>
          ))}
        </div>
        <span className="result-count">{results.length} benefits</span>
      </div>
      <div className="benefit-list">
        {results.map((perk) => (
          <BenefitRow key={perk.id} perk={perk} onSelect={onSelect} />
        ))}
        {!results.length && (
          <div className="empty-state">
            <Search size={24} />
            <h3>No matching benefits</h3>
            <button
              className="text-action"
              onClick={() => {
                setQuery("");
                setFilter("all");
                setCardId("");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
