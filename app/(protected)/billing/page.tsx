"use client";

import { useState } from "react";

type BillingCycle = "monthly" | "annually";

interface Tier {
  id: string;
  name: string;
  monthlyPrice: number | null;
  description: string;
  cta: string;
  highlighted: boolean;
}

interface Feature {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  business: string | boolean;
}

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    description: "Track your portfolio with correct math. No credit card needed.",
    cta: "Get started",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 12,
    description: "Weekly intelligence on what actually happened to your portfolio.",
    cta: "Start Pro",
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: null,
    description: "For advisors, educators, and finance teams.",
    cta: "Talk to us",
    highlighted: false,
  },
];

const FEATURES: Feature[] = [
  { label: "Portfolio tracking", free: true, pro: true, business: true },
  { label: "Holdings & cost basis (FIFO)", free: true, pro: true, business: true },
  { label: "TWR & MWR / XIRR", free: true, pro: true, business: true },
  { label: "Watchlist", free: true, pro: true, business: true },
  { label: "Price alerts", free: "3 alerts", pro: "Unlimited", business: "Unlimited" },
  { label: "Transaction history", free: "100 rows", pro: "Unlimited", business: "Unlimited" },
  { label: "Basic risk metrics", free: true, pro: true, business: true },
  { label: "Weekly AI portfolio debrief", free: false, pro: true, business: true },
  { label: "Performance attribution", free: false, pro: true, business: true },
  { label: "Concentration & correlation analysis", free: false, pro: true, business: true },
  { label: "Historical risk evolution", free: false, pro: true, business: true },
  { label: "Custom benchmarks", free: false, pro: true, business: true },
  { label: "CSV import", free: true, pro: true, business: true },
  { label: "Team portfolios", free: false, pro: false, business: true },
  { label: "Advisor dashboard", free: false, pro: false, business: true },
  { label: "Priority support", free: false, pro: false, business: true },
];

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8L6.5 11.5L13 4.5"
        stroke="#2dd4bf"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M5 5L11 11M11 5L5 11"
        stroke="#334155"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true) return <CheckIcon />;
  if (value === false) return <CrossIcon />;
  return <span className="text-sm text-slate-300 tabular-nums">{value}</span>;
}

export default function BillingPage() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  function getPrice(tier: Tier): string {
    if (tier.monthlyPrice === null) return "Custom";
    if (tier.monthlyPrice === 0) return "$0";
    const price =
      cycle === "annually"
        ? Math.round(tier.monthlyPrice * 0.8)
        : tier.monthlyPrice;
    return `$${price}`;
  }

  return (
    <div
      className="min-h-screen bg-[#0a0f0d] text-white"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <div className="max-w-xl">
          <p className="text-teal-400 text-sm font-medium mb-3 tracking-wide">
            Pricing
          </p>
          <h1 className="text-3xl font-semibold text-white leading-tight mb-4">
            Free to track.
            <br />
            Pro to understand.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Every plan uses the same ledger and correct return math.
            Pro unlocks the intelligence layer — weekly attribution, risk
            evolution, and AI-generated portfolio debriefs grounded in your
            actual data.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center gap-3 mt-8">
          <button
            onClick={() => setCycle("monthly")}
            className={`text-sm px-4 py-1.5 rounded-full transition-colors ${
              cycle === "monthly"
                ? "bg-[#1a2420] text-white border border-teal-400/30"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle("annually")}
            className={`text-sm px-4 py-1.5 rounded-full transition-colors flex items-center gap-2 ${
              cycle === "annually"
                ? "bg-[#1a2420] text-white border border-teal-400/30"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Annually
            <span className="text-xs text-teal-400 font-medium">–20%</span>
          </button>
        </div>
      </div>

      {/* Tier cards */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-xl p-6 flex flex-col ${
                tier.highlighted
                  ? "border border-teal-400/50 bg-[#0e1a17]"
                  : "border border-slate-800 bg-[#0d1411]"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-teal-400/60 to-transparent" />
              )}

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`text-sm font-medium ${
                      tier.highlighted ? "text-teal-400" : "text-slate-400"
                    }`}
                  >
                    {tier.name}
                  </span>
                  {tier.highlighted && (
                    <span className="text-xs bg-teal-400/10 text-teal-400 border border-teal-400/20 px-2 py-0.5 rounded-full">
                      Most popular
                    </span>
                  )}
                </div>

                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-semibold tabular-nums text-white">
                    {getPrice(tier)}
                  </span>
                  {tier.monthlyPrice !== null && tier.monthlyPrice > 0 && (
                    <span className="text-slate-500 text-sm mb-1.5">/mo</span>
                  )}
                </div>

                {tier.monthlyPrice !== null && tier.monthlyPrice > 0 && cycle === "annually" && (
                  <p className="text-xs text-slate-500 mb-3">
                    Billed ${tier.monthlyPrice * 0.8 * 12}/year
                  </p>
                )}

                <p className="text-sm text-slate-400 leading-relaxed mt-3">
                  {tier.description}
                </p>
              </div>

              <div className="mt-auto">
                <button
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    tier.highlighted
                      ? "bg-teal-400 text-[#0a0f0d] hover:bg-teal-300"
                      : tier.id === "business"
                      ? "border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
                      : "border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="max-w-6xl mx-auto px-6 mt-16 pb-24">
        <h2 className="text-sm font-medium text-slate-400 mb-6 uppercase tracking-widest">
          Compare plans
        </h2>

        <div className="border border-slate-800 rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-4 border-b border-slate-800">
            <div className="px-5 py-4 text-xs text-slate-500 font-medium">
              Feature
            </div>
            {TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`px-5 py-4 text-xs font-medium text-center ${
                  tier.highlighted ? "text-teal-400" : "text-slate-400"
                }`}
              >
                {tier.name}
              </div>
            ))}
          </div>

          {/* Table rows */}
          {FEATURES.map((feature, i) => (
            <div
              key={feature.label}
              className={`grid grid-cols-4 border-b border-slate-800/60 last:border-b-0 ${
                i % 2 === 0 ? "bg-transparent" : "bg-slate-900/20"
              }`}
            >
              <div className="px-5 py-3.5 text-sm text-slate-300">
                {feature.label}
              </div>
              {(["free", "pro", "business"] as const).map((tierId) => (
                <div
                  key={tierId}
                  className="px-5 py-3.5 flex items-center justify-center"
                >
                  <FeatureValue value={feature[tierId]} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-xs text-slate-600 mt-6 text-center">
          All plans use the same append-only ledger, Decimal128 precision, and FIFO lot accounting.
          The math is never a paid feature.
        </p>
      </div>
    </div>
  );
}