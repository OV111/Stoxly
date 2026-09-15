"use client";

import { useState } from "react";
import { SectionLabel } from "./SectionLabel";

export function TransactionEntrySection() {
  const [input, setInput] = useState("");

  const parsed = {
    type: "BUY",
    symbol: "NVDA",
    quantity: 10,
    price: 127.4,
    fees: 2.0,
    date: "Mar 3, 2026",
    total: 1276.0,
  };

  return (
    <section>
      <SectionLabel>Add a transaction</SectionLabel>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="mt-4 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Bought 10 shares of NVDA at $127.40 on March 3, paid $2 commission"
          className="flex-1 rounded-md border border-slate-800 bg-[#0d1411] px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-teal-400/50 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md border border-slate-700 px-4 py-2.5 text-sm text-slate-200 transition-colors hover:border-teal-400/50 hover:text-teal-400"
        >
          Parse transaction
        </button>
      </form>

      <div className="mt-5 rounded-md border border-teal-400/50 bg-[#0e1a17] p-6">
        <div className="text-xs text-slate-500">
          Parsed transaction — confirm before saving
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Type" value={parsed.type} />
          <Row label="Symbol" value={parsed.symbol} />
          <Row label="Quantity" value={String(parsed.quantity)} />
          <Row label="Price/unit" value={`$${parsed.price.toFixed(2)}`} />
          <Row label="Fees" value={`$${parsed.fees.toFixed(2)}`} />
          <Row label="Date" value={parsed.date} />
          <Row
            label="Total cost"
            value={`$${parsed.total.toFixed(2)}`}
            emphasis
          />
        </dl>

        <div className="mt-6 flex gap-3">
          <button className="rounded-md bg-teal-400 px-4 py-2 text-sm font-medium text-[#0a0f0d] transition-colors hover:bg-teal-300">
            Confirm &amp; add to ledger
          </button>
          <button className="rounded-md px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-200">
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={`tabular-nums ${
          emphasis ? "font-medium text-teal-400" : "text-slate-200"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}