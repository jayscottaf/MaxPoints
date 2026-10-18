import {
  confirmationNeeded,
  eligibilityRange,
  type PerkTerms,
} from "./accounting";

type MatchPerk = PerkTerms & { id: string; name: string };
export type MatchTransaction = {
  description: string;
  amountCents: number;
  date: string;
  pending: boolean;
  removed?: boolean;
  currency: string | null;
};
const rules: [RegExp, RegExp][] = [
  [/\bresy\b/i, /^Resy Dining Credit/],
  [/\blululemon\b/i, /^Lululemon Credit/],
  [/\bsaks\b/i, /^Saks Fifth Avenue Credit/],
  [/\bclear\b/i, /^CLEAR Plus Credit/],
  [/digital ent(?:ertainment)?\b/i, /^Digital Entertainment Credit/],
  [/\boura\b/i, /^Oura Ring Credit/],
  [/\bequinox\b/i, /^Equinox Credit/],
  [/walmart\s*\+|walmart plus/i, /^Walmart\+ Membership/],
  [/uber one/i, /^Uber One Membership/],
  [/global entry|tsa precheck|nexus/i, /^Global Entry\/TSA PreCheck/],
  [/hilton (?:resort|.*credit)/i, /^Hilton Resort Credit/],
  [/flight credit|airline credit/i, /^Flight Credit/],
  [/airline (?:fee|incidental|credit)/i, /^Airline Incidental Fee Credit/],
  [/the edit/i, /^The Edit Hotel Credit/],
  [/annual travel|travel credit/i, /^Annual Travel Credit/],
  [/stubhub|viagogo/i, /^Entertainment Credit/],
  [/dining credit|exclusive tables/i, /^Dining Credit/],
  [/peloton/i, /^Peloton Credit/],
  [/hotel credit|fhr|fine hotels/i, /^Hotel Credit \(FHR\/THC\)/],
];

export function matchBankCredit(
  transaction: MatchTransaction,
  perks: MatchPerk[],
) {
  if (
    transaction.pending ||
    transaction.removed ||
    transaction.currency !== "USD" ||
    transaction.amountCents >= 0
  )
    return [];
  if (
    !/credit|benefit|reimburse|cash\s*back/i.test(transaction.description) ||
    /payment|autopay|refund|reversal|returned/i.test(transaction.description)
  )
    return [];
  const date = new Date(transaction.date + "T12:00:00Z");
  if (!Number.isFinite(+date)) return [];
  return perks
    .filter((perk) => {
      if (
        perk.retired ||
        confirmationNeeded(perk) ||
        (perk.valueKind && perk.valueKind !== "credit")
      )
        return false;
      const range = eligibilityRange(
        perk,
        [],
        date.getUTCFullYear(),
        date,
        "UTC",
      );
      // Credits can post after the purchase's benefit period has ended.
      const earliestPurchase = new Date(+date - 45 * 86400000);
      if (date < range.start || earliestPurchase > range.end) return false;
      return rules.some(
        ([description, name]) =>
          description.test(transaction.description) && name.test(perk.name),
      );
    })
    .map((perk) => perk.id);
}
