import { ArrowUpRight, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function SummaryOverview({
  totalAnnualFees,
  totalPerksValue,
  totalUsed,
  available,
}: {
  totalAnnualFees: number;
  totalPerksValue: number;
  totalUsed: number;
  available: number;
}) {
  const coverage =
    totalAnnualFees > 0 ? Math.floor((totalUsed / totalAnnualFees) * 100) : 0;
  const net = totalAnnualFees - totalUsed;
  return (
    <section className="portfolio-summary" aria-label="Annual benefit summary">
      <div className="summary-metrics">
        <div className="metric earned">
          <span className="eyebrow">Value recovered</span>
          <strong>{formatCurrency(totalUsed)}</strong>
          <span>
            <ArrowUpRight size={14} />
            of {formatCurrency(totalPerksValue)} in annual benefits
          </span>
        </div>
        <div className="metric">
          <span className="eyebrow">Available now</span>
          <strong>{formatCurrency(available)}</strong>
          <span>Across your active benefits</span>
        </div>
        <div className="metric">
          <span className="eyebrow">Annual card fees</span>
          <strong>{formatCurrency(totalAnnualFees)}</strong>
          <span>Combined membership cost</span>
        </div>
        <div className="metric">
          <span className="eyebrow">
            {net < 0 ? "Net benefit" : "Net cost"}
          </span>
          <strong>{formatCurrency(Math.abs(net))}</strong>
          <span>
            {net <= 0 ? "Your fees are covered" : "Left to break even"}
          </span>
        </div>
      </div>
      <div className="recovery-line">
        <span className="recovery-label">
          {coverage >= 100 ? (
            <Check size={15} />
          ) : (
            <span className="status-dot" />
          )}
          <b>{coverage}%</b> of annual fees recovered
        </span>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Annual fees recovered"
          aria-valuenow={Math.min(100, coverage)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${Math.min(100, coverage)}%` }} />
        </div>
        <span className="recovery-end">
          {formatCurrency(totalUsed)} / {formatCurrency(totalAnnualFees)}
        </span>
      </div>
    </section>
  );
}
