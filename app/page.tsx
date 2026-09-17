"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Wallet,
  Gift,
  History,
  Settings2,
  LogOut,
  Plus,
  ArrowUpRight,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  Check,
  Command,
  AlertCircle,
} from "lucide-react";
import { Toaster } from "react-hot-toast";
import { CardSummary } from "@/components/card-summary";
import { CardSettingsModal } from "@/components/card-settings-modal";
import { PerkItem } from "@/components/perk-item";
import { SummaryOverview } from "@/components/summary-overview";
import { BenefitBrowser, BenefitRow } from "@/components/benefit-browser";
import { ActivityView } from "@/components/activity-view";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { calendarYear, sumMoney } from "@/lib/accounting";
import { cardsSchema, upcomingPerks, type CardDetail } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/utils";

const views = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "benefits", label: "Benefits", icon: Gift },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "activity", label: "Activity", icon: History },
] as const;
type View = (typeof views)[number]["id"];

export default function Dashboard() {
  const router = useRouter();
  const [cards, setCards] = useState<CardDetail[]>([]);
  const [view, setView] = useState<View>("overview");
  const [benefitFilter, setBenefitFilter] = useState<"all" | "review">("all");
  const [year, setYear] = useState(calendarYear);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedPerkId, setSelectedPerkId] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [logPicker, setLogPicker] = useState(false);
  const [allDue, setAllDue] = useState(false);
  const [activityVersion, setActivityVersion] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);
  const fetchDashboardData = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setRefreshing(true);
    try {
      const response = await fetch(`/api/cards?year=${year}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (response.status === 401) {
        router.replace("/login");
        router.refresh();
        return;
      }
      if (!response.ok)
        throw new Error("Could not load your wallet. Please retry.");
      const parsed = cardsSchema.safeParse(await response.json());
      if (!parsed.success)
        throw new Error("Your wallet data is incomplete. Please retry.");
      if (!controller.signal.aborted) {
        setCards(parsed.data);
        setActivityVersion((value) => value + 1);
        setError("");
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : "Could not load your wallet.",
        );
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [year, router]);
  useEffect(() => {
    void fetchDashboardData();
    return () => controllerRef.current?.abort();
  }, [fetchDashboardData]);
  const perks = cards.flatMap((card) => card.perks);
  const selectedPerk = perks.find((perk) => perk.id === selectedPerkId);
  const selectedCard = cards.find((card) => card.id === selectedCardId);
  const valued = perks.filter(
    (perk) => !["coverage", "estimate"].includes(perk.valueKind),
  );
  const totalUsed = sumMoney(valued.map((perk) => perk.annualUsage));
  const annualFees = sumMoney(cards.map((card) => card.annualFee));
  const due = upcomingPerks(perks);
  const soon = due.filter((perk) => perk.daysLeft <= 30);
  const reviewCount = perks.filter((perk) => perk.needsReview).length;
  function selectPerk(id: string) {
    setSelectedCardId(null);
    setLogPicker(false);
    setSelectedPerkId(id);
  }
  function updateUsage() {
    void fetchDashboardData();
  }
  function navigate(next: View) {
    setView(next);
    setBenefitFilter("all");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  const navigation = (
    <>
      {views.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          aria-current={view === id ? "page" : undefined}
          onClick={() => navigate(id)}
        >
          <Icon size={19} strokeWidth={1.7} />
          <span>{label}</span>
          {id === "benefits" && perks.length > 0 && (
            <small>{perks.length}</small>
          )}
        </button>
      ))}
    </>
  );
  return (
    <div className="app-shell">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#182d24",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "14px",
          },
        }}
      />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand" onClick={() => navigate("overview")}>
          <span className="brand-mark">
            <Command size={21} />
          </span>
          MaxPoints<span className="brand-period">.</span>
        </Link>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">{navigation}</nav>
        <div className="sidebar-bottom">
          <button onClick={() => setSettings(true)}>
            <Settings2 size={18} />
            Settings
          </button>
          <div className="owner-badge">
            <span className="owner-avatar">M</span>
            <div>
              <strong>Personal wallet</strong>
              <span>Owner account</span>
            </div>
            <ShieldCheck size={16} />
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Link href="/" className="mobile-brand" onClick={() => navigate("overview")}>
            <Command size={21} />
            MaxPoints.
          </Link>
          <span className="breadcrumb">
            Workspace <span>/</span>{" "}
            <b>{views.find((item) => item.id === view)?.label}</b>
          </span>
          <div className="topbar-actions">
            <span className="private-label">
              <ShieldCheck size={14} />
              Private workspace
            </span>
            <button
              className="icon-button"
              title="Settings"
              aria-label="Settings"
              onClick={() => setSettings(true)}
            >
              <Settings2 size={18} />
            </button>
            <button
              className="icon-button"
              title="Sign out"
              aria-label="Sign out"
              onClick={async () => {
                try {
                  const response = await fetch("/api/auth", {
                    method: "DELETE",
                  });
                  if (!response.ok) throw new Error();
                  router.replace("/login");
                  router.refresh();
                } catch {
                  setError("Could not sign out. Please retry.");
                }
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main id="main" className="main-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">YOUR PERSONAL ADVANTAGE</p>
              <h1>
                {view === "overview"
                  ? "Overview"
                  : view === "benefits"
                    ? "Benefits"
                    : view === "wallet"
                      ? "Wallet"
                      : "Activity"}
              </h1>
            </div>
            <div className="page-actions">
              <select
                aria-label="Reporting year"
                value={year}
                onChange={(e) => {
                  setLoading(true);
                  setYear(Number(e.target.value));
                  setSelectedPerkId(null);
                  setSelectedCardId(null);
                }}
              >
                {Array.from(
                  { length: 8 },
                  (_, i) => calendarYear() + 1 - i,
                ).map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <button
                className="primary-button"
                onClick={() => setLogPicker(true)}
                disabled={loading || !perks.length}
              >
                <Plus size={17} />
                <span>Log usage</span>
              </button>
            </div>
          </div>
          {error && (
            <div role="alert" className="error-banner">
              <AlertCircle size={18} />
              <span>
                {error}
                {cards.length > 0 ? " Showing last loaded data." : ""}
              </span>
              <button className="text-action" onClick={fetchDashboardData}>
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          )}
          {loading ? (
            <div
              className="dashboard-loading"
              role="status"
              aria-label="Loading wallet"
            >
              <div />
              <div />
              <div />
            </div>
          ) : (
            <>
              {view === "overview" && (
                <>
                  <SummaryOverview
                    totalAnnualFees={annualFees}
                    totalPerksValue={sumMoney(
                      valued.map((perk) => perk.annualValue),
                    )}
                    totalUsed={totalUsed}
                    available={sumMoney(
                      valued.map((perk) => perk.availableValue),
                    )}
                  />
                  <section className="wallet-section">
                    <div className="section-heading">
                      <h2>
                        Your wallet <span>{cards.length}</span>
                      </h2>
                      <button
                        className="text-action"
                        onClick={() => navigate("wallet")}
                      >
                        View wallet
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                    <div className="wallet-grid">
                      {cards.map((card) => (
                        <CardSummary
                          key={card.id}
                          card={card}
                          onSelect={(card) => setSelectedCardId(card.id)}
                        />
                      ))}
                    </div>
                  </section>
                  <section className="due-section" data-expanded={allDue}>
                    <div className="section-heading">
                      <div>
                        <p className="eyebrow">DON&apos;T LEAVE IT BEHIND</p>
                        <h2>Up next</h2>
                      </div>
                      <span className="due-total">
                        {formatCurrency(
                          sumMoney(soon.map((perk) => perk.availableValue)),
                        )}{" "}
                        <span>expires in 30 days</span>
                      </span>
                    </div>
                    <div className="list-heading">
                      <span>BENEFIT</span>
                      <span>EXPIRES</span>
                      <span>STATUS</span>
                      <span>REMAINING</span>
                    </div>
                    <div className="benefit-list">
                      {(allDue ? due : due.slice(0, 6)).map((perk) => (
                        <BenefitRow
                          key={perk.id}
                          perk={perk}
                          onSelect={selectPerk}
                          due
                        />
                      ))}
                      {!due.length && (
                        <div className="empty-state">
                          <Check size={26} />
                          <h3>You&apos;re all caught up</h3>
                          <p>No unused benefits with an upcoming expiry.</p>
                        </div>
                      )}
                    </div>
                    {due.length > 3 && (
                      <button
                        className="show-more"
                        data-short={due.length <= 6}
                        onClick={() => setAllDue((value) => !value)}
                      >
                        {allDue
                          ? "Show fewer benefits"
                          : `View all ${due.length} upcoming benefits`}
                        <ArrowRight size={15} />
                      </button>
                    )}
                  </section>
                  {reviewCount > 0 && (
                    <div className="review-note">
                      <AlertCircle size={17} />
                      <span>
                        {reviewCount}{" "}
                        {reviewCount === 1 ? "benefit has" : "benefits have"}{" "}
                        details or historical usage to review.
                      </span>
                      <button
                        className="text-action"
                        onClick={() => {
                          navigate("benefits");
                          setBenefitFilter("review");
                        }}
                      >
                        Review benefits
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                </>
              )}
              {view === "wallet" && (
                <>
                  <div className="section-heading">
                    <span className="muted">{cards.length} active cards</span>
                    <button
                      className="text-action"
                      onClick={() => setSettings(true)}
                    >
                      <Settings2 size={16} />
                      Card details
                    </button>
                  </div>
                  <div className="wallet-grid">
                    {cards.map((card) => (
                      <CardSummary
                        key={card.id}
                        card={card}
                        onSelect={(card) => setSelectedCardId(card.id)}
                      />
                    ))}
                  </div>
                </>
              )}
              {view === "benefits" && (
                <BenefitBrowser
                  perks={perks}
                  onSelect={selectPerk}
                  initialFilter={benefitFilter}
                />
              )}
              {view === "activity" && (
                <ActivityView
                  key={activityVersion}
                  year={year}
                  onSelect={selectPerk}
                />
              )}
              {!cards.length && (
                <div className="empty-state">
                  <Wallet size={30} />
                  <h2>No active cards</h2>
                  <p>Your connected cards will appear here.</p>
                </div>
              )}
              <footer className="workspace-footer">
                <span>
                  <span
                    className={`status-dot ${refreshing ? "syncing" : ""}`}
                  />
                  {refreshing ? "Updating wallet" : "Wallet up to date"}
                </span>
                <button
                  className="text-action"
                  onClick={fetchDashboardData}
                  disabled={refreshing}
                  title="Refresh wallet"
                >
                  <RefreshCw size={13} />
                  Refresh
                </button>
                <span>MaxPoints / {year}</span>
              </footer>
            </>
          )}
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation}
      </nav>
      <Dialog
        open={!!selectedPerk}
        onOpenChange={(open) => !open && setSelectedPerkId(null)}
      >
        {selectedPerk && (
          <DialogContent
            title={selectedPerk.name}
            description={selectedPerk.card.name}
            className="max-w-2xl"
            onClose={() => setSelectedPerkId(null)}
          >
            <PerkItem
              key={selectedPerk.id}
              perk={selectedPerk}
              onUsageUpdate={updateUsage}
            />
          </DialogContent>
        )}
      </Dialog>
      <Dialog
        open={!!selectedCard}
        onOpenChange={(open) => !open && setSelectedCardId(null)}
      >
        {selectedCard && (
          <DialogContent
            title={selectedCard.name}
            description={`${selectedCard.perks.length} benefits`}
            className="max-w-4xl"
            onClose={() => setSelectedCardId(null)}
          >
            <BenefitBrowser perks={selectedCard.perks} onSelect={selectPerk} />
          </DialogContent>
        )}
      </Dialog>
      <Dialog open={logPicker} onOpenChange={setLogPicker}>
        <DialogContent
          title="Log usage"
          description="Select a benefit"
          className="max-w-4xl"
          onClose={() => setLogPicker(false)}
        >
          <BenefitBrowser
            perks={perks}
            onSelect={selectPerk}
            initialFilter="available"
          />
        </DialogContent>
      </Dialog>
      {settings && (
        <CardSettingsModal
          cards={cards}
          onClose={() => setSettings(false)}
          onSaved={fetchDashboardData}
        />
      )}
    </div>
  );
}
