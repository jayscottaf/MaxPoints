import { ArrowUpRight, Check } from "lucide-react";
import {
  formatCurrency,
  formatExpirationMonth,
  isPastDateOnly,
} from "@/lib/utils";
import { sumMoney } from "@/lib/accounting";
import type { CardDetail } from "@/lib/dashboard";
import { CardArt } from "./card-art";

export function CardSummary({
  card,
  onSelect,
}: {
  card: CardDetail;
  onSelect: (card: CardDetail) => void;
}) {
  const valued = card.perks.filter(
    (perk) => !["coverage", "estimate"].includes(perk.valueKind),
  );
  const used = sumMoney(valued.map((perk) => perk.annualUsage));
  const available = sumMoney(valued.map((perk) => perk.availableValue));
  const coverage =
    card.annualFee > 0 ? Math.floor((used / card.annualFee) * 100) : 0;
  const userCard = card.userCards[0];
  return (
    <button
      className="wallet-card"
      onClick={() => onSelect(card)}
      aria-label={`View ${card.name} benefits`}
    >
      <div className="wallet-card-top">
        <CardArt name={card.name} />
        <ArrowUpRight className="wallet-arrow" size={18} />
      </div>
      <div className="wallet-card-name">
        <h3>{card.name}</h3>
        <span>
          {userCard?.last4 ? `Ending ${userCard.last4}` : card.issuer}
        </span>
      </div>
      <div className="wallet-values">
        <div>
          <span>Recovered</span>
          <strong>{formatCurrency(used)}</strong>
        </div>
        <div>
          <span>Available</span>
          <strong>{formatCurrency(available)}</strong>
        </div>
      </div>
      <div className="wallet-card-footer">
        <span className={coverage >= 100 ? "positive" : ""}>
          {coverage >= 100 && <Check size={13} />}
          {coverage >= 100 ? "Fee covered" : `${coverage}% of fee covered`}
        </span>
        <span>{formatCurrency(card.annualFee)} / yr</span>
      </div>
      <div className="progress-track">
        <span style={{ width: `${Math.min(100, coverage)}%` }} />
      </div>
      {userCard?.expirationDate && isPastDateOnly(userCard.expirationDate) && (
        <span className="expired-note">
          Card expired {formatExpirationMonth(userCard.expirationDate)}
        </span>
      )}
    </button>
  );
}
