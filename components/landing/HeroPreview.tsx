"use client";

import { useId, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  ChartSpline,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/**
 * Static product mock for the hero: three fanned cards, each a slice of the
 * product. Every number is illustrative sample data (labelled in the UI) —
 * nothing is fetched and none of it is a real account.
 */

// ---------- sample data ----------

// Indexed to 100 at the start of the period, monthly.
const PORTFOLIO = [100, 102, 99, 104, 107, 103, 108, 111, 109, 113, 112, 114.2];
const BENCHMARK = [100, 101, 100.5, 102, 104, 103, 105, 106, 107, 108.5, 109, 110];

const DRIVERS = [
  { label: "NVDA", value: 6.1 },
  { label: "MSFT", value: 3.4 },
  { label: "VOO", value: 1.9 },
  { label: "Cash drag", value: -1.2 },
  { label: "TSLA", value: -2.0 },
];

const MAX_DRIVER = Math.max(...DRIVERS.map((d) => Math.abs(d.value)));

// ---------- chart helpers ----------

const CHART_W = 320;
const CHART_H = 120;
const Y_MIN = 96;
const Y_MAX = 116;

const toPoints = (series: number[]) =>
  series.map((v, i) => {
    const x = (i / (series.length - 1)) * CHART_W;
    const y = CHART_H - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * CHART_H;
    return [x, y] as const;
  });

const toLine = (series: number[]) =>
  toPoints(series)
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

const toArea = (series: number[]) =>
  `${toLine(series)} L${CHART_W},${CHART_H} L0,${CHART_H} Z`;

const formatPct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;

// ---------- card bodies ----------

const PerformanceBody = () => {
  const [lastX, lastY] = toPoints(PORTFOLIO).at(-1)!;
  // The card renders twice (fan + phone scroller); a shared gradient id would
  // resolve to the hidden copy and blank the visible one's fill.
  const gradientId = useId();

  return (
    <>
      <div className="grid grid-cols-2 gap-px bg-white/5">
        <div className="bg-gray-800 px-5 py-4">
          <p className="text-xs text-gray-500">Time-weighted</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-400">
            +14.2%
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">How your picks did</p>
        </div>
        <div className="bg-gray-800 px-5 py-4">
          <p className="text-xs text-gray-500">Money-weighted</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
            +9.8%
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">What you earned</p>
        </div>
      </div>

      <div className="px-5 pt-4">
        <div className="mb-2 flex items-center gap-4 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded-full bg-blue-400" />
            Portfolio
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded-full bg-gray-500" />
            S&amp;P 500
          </span>
        </div>
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="h-40 w-full overflow-visible"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1="0"
              x2={CHART_W}
              y1={CHART_H * f}
              y2={CHART_H * f}
              stroke="rgba(255,255,255,0.05)"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={toArea(PORTFOLIO)} fill={`url(#${gradientId})`} />
          <path
            d={toLine(BENCHMARK)}
            fill="none"
            stroke="#9095A1"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={toLine(PORTFOLIO)}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={lastX} cy={lastY} r="3.5" fill="#60a5fa" />
        </svg>
      </div>
    </>
  );
};

const ExplainBody = () => (
  <div className="flex flex-col gap-4 px-5 py-4">
    <div className="flex gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
      <Sparkles className="mt-0.5 size-4 shrink-0 text-blue-400" />
      <p className="text-xs leading-relaxed text-gray-400">
        <span className="font-medium text-white">Timing cost you 4.4 pts.</span>{" "}
        Most of your deposits landed after the March rally, so your money earned
        less than your picks did.
      </p>
    </div>

    <div>
      <p className="mb-2.5 text-xs font-medium text-gray-400">
        Contribution to return
      </p>
      <ul className="flex flex-col gap-2.5">
        {DRIVERS.map(({ label, value }) => (
          <li
            key={label}
            className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3 text-xs"
          >
            <span className="truncate text-gray-400">{label}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <span
                className={`block h-full rounded-full ${value >= 0 ? "bg-emerald-400/80" : "bg-red-500/80"}`}
                style={{ width: `${(Math.abs(value) / MAX_DRIVER) * 100}%` }}
              />
            </span>
            <span
              className={`text-right tabular-nums ${value >= 0 ? "text-emerald-400" : "text-red-500"}`}
            >
              {formatPct(value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

const RiskBody = () => (
  <div className="flex flex-col gap-4 px-5 py-4">
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: "Volatility", value: "18.4%", note: "was 15.1%", up: true },
        { label: "Max drawdown", value: "−7.3%", note: "Apr 2–19" },
        { label: "Beta vs S&P", value: "1.21", note: "was 1.04", up: true },
        { label: "Sharpe", value: "0.92", note: "1Y, rf 4.5%" },
      ].map(({ label, value, note, up }) => (
        <div
          key={label}
          className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5"
        >
          <p className="flex items-center gap-1 text-[11px] text-gray-500">
            {label === "Volatility" && <Activity className="size-3" />}
            {label}
          </p>
          <p className="mt-1 flex items-center gap-1 text-base font-semibold tabular-nums text-white">
            {value}
            {up && <ArrowUpRight className="size-3.5 text-yellow-400" />}
          </p>
          <p className="text-[10px] text-gray-500">{note}</p>
        </div>
      ))}
    </div>

    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-gray-400">Largest position</span>
        <span className="tabular-nums text-white">NVDA · 31%</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-white/5">
        <span className="h-full bg-yellow-400/80" style={{ width: "31%" }} />
        <span className="h-full bg-blue-400/60" style={{ width: "18%" }} />
        <span className="h-full bg-blue-400/35" style={{ width: "14%" }} />
      </div>
    </div>

    <div className="flex gap-3 rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-4 py-3">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-yellow-400" />
      <p className="text-xs leading-relaxed text-gray-400">
        <span className="font-medium text-white">Concentration up 9 pts</span>{" "}
        since your May NVDA buys.
      </p>
    </div>
  </div>
);

// ---------- card shell ----------

type CardDef = {
  id: string;
  title: string;
  Icon: LucideIcon;
  Body: () => ReactNode;
};

// Left → right in the fan. The middle card is the resting front card.
const CARDS: CardDef[] = [
  { id: "explain", title: "Why it moved", Icon: Sparkles, Body: ExplainBody },
  { id: "performance", title: "Performance", Icon: ChartSpline, Body: PerformanceBody },
  { id: "risk", title: "Risk", Icon: ShieldAlert, Body: RiskBody },
];

const RESTING_FRONT = 1;

// Fixed resting pose per slot. Cards never change position when another is
// focused — only z-order, scale and tilt — so a card can't slide out from
// under the cursor and hand the hover to its neighbour (which would flicker).
const FAN = [
  { left: "0%", y: 36, rotate: -5 },
  { left: "19%", y: 0, rotate: 0 },
  { left: "38%", y: 36, rotate: 5 },
];

const CardShell = ({ card }: { card: CardDef }) => (
  <div className="h-full overflow-hidden rounded-2xl border border-white/10 bg-gray-800 shadow-2xl shadow-black/60">
    <div className="flex items-center justify-between border-b border-white/5 px-5 py-3.5">
      <div className="flex items-center gap-2">
        <card.Icon className="size-4 text-blue-400" />
        <span className="text-sm font-medium text-white">{card.title}</span>
      </div>
      <span className="text-[11px] text-gray-500">Sample · 1Y</span>
    </div>
    <card.Body />
  </div>
);

// ---------- component ----------

const HeroPreview = () => {
  const reduceMotion = useReducedMotion();
  const [focused, setFocused] = useState<number | null>(null);
  const front = focused ?? RESTING_FRONT;

  return (
    <div className="relative w-full max-w-xl">
      {/* Soft glow behind the stack so it lifts off the dot field. */}
      <div
        aria-hidden="true"
        className="absolute inset-8 rounded-[2rem] bg-blue-500/15 blur-3xl"
      />

      {/* sm and up: fanned stack, hover / focus / tap brings a card forward. */}
      <div
        role="group"
        aria-label="Sample Stoxly portfolio views: why it moved, performance, and risk"
        className="relative hidden h-[460px] sm:block"
        onMouseLeave={() => setFocused(null)}
      >
        {CARDS.map((card, i) => {
          const isFront = i === front;
          const pose = FAN[i];

          return (
            <motion.div
              key={card.id}
              tabIndex={0}
              aria-label={`${card.title} (sample data)`}
              onMouseEnter={() => setFocused(i)}
              onFocus={() => setFocused(i)}
              onClick={() => setFocused(i)}
              className="absolute top-6 h-[400px] w-[62%] cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
              style={{
                left: pose.left,
                zIndex: isFront ? 30 : 20 - Math.abs(i - front),
              }}
              initial={false}
              animate={{
                y: isFront ? pose.y - 14 : pose.y,
                rotate: isFront ? 0 : pose.rotate,
                scale: isFront ? (focused === null ? 1 : 1.06) : 0.94,
                // Dim with brightness, not opacity — translucent cards would show the
                // ones beneath through them.
                filter: isFront ? "brightness(1)" : "brightness(0.5)",
                // Pinned so no card can ever be left translucent.
                opacity: 1,
              }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 260, damping: 26 }
              }
            >
              <CardShell card={card} />
            </motion.div>
          );
        })}
      </div>

      {/* Phones: the fan is too cramped, so swipe through the same cards. */}
      <div className="relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:hidden [scrollbar-width:none]">
        {[CARDS[RESTING_FRONT], ...CARDS.filter((_, i) => i !== RESTING_FRONT)].map(
          (card) => (
            <div key={card.id} className="h-[400px] w-[85%] shrink-0 snap-center">
              <CardShell card={card} />
            </div>
          ),
        )}
      </div>
    </div>
  );
};

export default HeroPreview;
