"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import LogoLoop from "@/components/LogoLoop";
import { companies } from "@/components/landing/companies";

type Quote = { price: number; changePercent: number };
type Company = (typeof companies)[number];

// Quotes arrive once per page load. Measuring the track with numbers already
// in place avoids the strip jumping mid-scroll when they'd otherwise pop in;
// if the API is slow or down, show logo-only chips after this long instead.
const QUOTE_WAIT_MS = 2500;

const formatPrice = (p: number) =>
  p >= 1000
    ? `$${p.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    : p >= 1
      ? `$${p.toFixed(2)}`
      : `$${p.toFixed(4)}`;

const Chip = ({ item, quote }: { item: Company; quote?: Quote }) => {
  const up = quote ? quote.changePercent >= 0 : false;

  return (
    <span className="group/chip inline-flex items-center gap-2.5 rounded-full border border-white/5 bg-white/[0.02] py-1.5 pr-3.5 pl-1.5 transition-colors duration-300 hover:border-white/15 hover:bg-white/[0.06]">
      {/* Brand icons are muted at rest so the strip reads as one calm row;
          the hovered chip gets its colour back. */}
      <span
        aria-hidden="true"
        className="flex size-7 items-center justify-center rounded-full bg-white/5 opacity-60 grayscale transition duration-300 group-hover/chip:opacity-100 group-hover/chip:grayscale-0 [&_svg]:size-4"
      >
        {item.node}
      </span>
      <span className="text-sm font-medium text-gray-400 transition-colors group-hover/chip:text-white">
        {"symbol" in item && item.symbol ? item.symbol : item.title}
      </span>
      {quote && (
        <>
          <span className="text-sm tabular-nums text-gray-500 transition-colors group-hover/chip:text-gray-400">
            {formatPrice(quote.price)}
          </span>
          <span
            className={`text-xs font-medium tabular-nums transition-colors ${
              up
                ? "text-emerald-400/70 group-hover/chip:text-emerald-400"
                : "text-red-500/70 group-hover/chip:text-red-500"
            }`}
          >
            {up ? "▲" : "▼"} {Math.abs(quote.changePercent).toFixed(2)}%
          </span>
        </>
      )}
    </span>
  );
};

const TickerTape = ({ signedIn }: { signedIn: boolean }) => {
  const [quotes, setQuotes] = useState<Record<string, Quote> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => setReady(true), QUOTE_WAIT_MS);

    fetch("/api/market/ticker", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error) setQuotes(data);
      })
      .catch(() => {})
      .finally(() => setReady(true));

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

  const renderItem = (item: Company): ReactNode => {
    const symbol = "symbol" in item ? item.symbol : undefined;
    const chip = <Chip item={item} quote={symbol ? quotes?.[symbol] : undefined} />;
    const label =
      symbol && quotes?.[symbol]
        ? `${item.title} (${symbol}) ${formatPrice(quotes[symbol].price)}, ${quotes[symbol].changePercent.toFixed(2)}% today`
        : item.title;

    // Signed-out visitors would just bounce off the sign-in wall, so only
    // members get clickable chips.
    return signedIn && "href" in item && item.href ? (
      <Link href={item.href} aria-label={label} className="block rounded-full">
        {chip}
      </Link>
    ) : (
      <span aria-label={label} role="img" className="block">
        {chip}
      </span>
    );
  };

  return (
    // Fixed height so the hero doesn't shift when the strip appears.
    <div className="h-11">
      {ready && (
        <div className="animate-in fade-in duration-700">
          <LogoLoop
            logos={companies}
            speed={40}
            direction="left"
            logoHeight={40}
            gap={12}
            pauseOnHover
            fadeOut
            fadeOutColor="#050505"
            renderItem={renderItem}
            ariaLabel="Live prices for popular stocks and crypto"
          />
        </div>
      )}
    </div>
  );
};

export default TickerTape;
