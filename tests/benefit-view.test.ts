import test from "node:test";
import assert from "node:assert/strict";
import { filterBenefits } from "../lib/benefit-view";
import type { PerkDetail } from "../lib/dashboard";
const base: PerkDetail = {
  id: "1",
  cardId: "a",
  name: "Hotel Credit",
  maxValue: 300,
  annualValue: 600,
  currentUsage: 100,
  annualUsage: 100,
  periodType: "semi-annual",
  periodStart: "2026-07-01",
  periodEnd: "2026-12-31",
  available: true,
  availableValue: 200,
  needsReview: false,
  valueKind: "credit",
  enrollmentRequired: false,
  card: { id: "a", name: "Amex Platinum", issuer: "Amex" },
  category: "travel",
};
const perks = [
  base,
  {
    ...base,
    id: "2",
    name: "Dining Credit",
    currentUsage: 300,
    availableValue: 0,
  },
  {
    ...base,
    id: "3",
    cardId: "b",
    needsReview: true,
    name: "Travel Credit",
    card: { id: "b", name: "Chase Reserve", issuer: "Chase" },
  },
];
test("benefit search combines words, card and status filters", () => {
  assert.deepEqual(
    filterBenefits(perks, "hotel platinum", "all").map((p) => p.id),
    ["1"],
  );
  assert.deepEqual(
    filterBenefits(perks, "", "used").map((p) => p.id),
    ["2"],
  );
  assert.deepEqual(
    filterBenefits(perks, "", "review").map((p) => p.id),
    ["3"],
  );
  assert.deepEqual(
    filterBenefits(perks, "travel", "available", "a").map((p) => p.id),
    ["1"],
  );
  assert.equal(filterBenefits(perks, "missing", "all").length, 0);
});
