import type { PerkDetail } from "./dashboard";
import { getPerkStatus } from "./utils";
export type BenefitFilter = "all" | "available" | "used" | "review";
export function filterBenefits(
  perks: PerkDetail[],
  query: string,
  filter: BenefitFilter,
  cardId = "",
) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return perks.filter(
    (perk) =>
      (!cardId || perk.cardId === cardId) &&
      words.every((word) =>
        `${perk.name} ${perk.card.name} ${perk.category || ""}`
          .toLowerCase()
          .includes(word),
      ) &&
      (filter === "all" ||
        (filter === "available" && perk.availableValue > 0) ||
        (filter === "used" &&
          getPerkStatus(perk, perk.currentUsage) === "completed") ||
        (filter === "review" && perk.needsReview)),
  );
}
