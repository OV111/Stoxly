"use client";

import type { ReactNode } from "react";
import { RefreshCw, Info } from "lucide-react";
import { Classic } from "@/components/loading-ui/classic";
import type { TabResponse } from "@/types/stock-tabs";

// ------------------------------------------------------------- chart tokens

/**
 * Chart colors, validated with the dataviz palette checker against the panel
 * surface (gray-800, #1f2937): all three series pass lightness, chroma,
 * contrast, and colorblind separation (worst adjacent CVD ΔE 9.4).
 * Gain/loss keeps the app-wide teal/red so polarity reads the same everywhere.
 */
export const CHART = {
  series1: "#3987e5",
  series2: "#d95926",
  series3: "#199e70",
  up: "#2dd4bf",
  down: "#ef4444",
  price: "#e5e7eb",
  grid: "#374151",
  axis: "#6b7280",
  surface: "#1f2937",
  neutral: "#4b5563",
} as const;

export const axisProps = {
  tick: { fill: CHART.axis, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: CHART.grid },
} as const;

export const tooltipProps = {
  contentStyle: {
    backgroundColor: "#111827",
    borderColor: "#374151",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: 12,
  },
  labelStyle: { color: "#9ca3af", fontSize: 11, marginBottom: 4 },
  itemStyle: { color: "#e5e7eb", padding: 0 },
  cursor: { stroke: "#4b5563", strokeWidth: 1 },
} as const;

// ------------------------------------------------------------- formatting

const compactCurrency = new Map<string, Intl.NumberFormat>();

/** $416.2B — currency-aware, for statement-sized numbers. */
export function fmtMoneyCompact(value: number | null | undefined, currency = "USD") {
  if (value === null || value === undefined) return "—";
  let f = compactCurrency.get(currency);
  if (!f) {
    f = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 2,
    });
    compactCurrency.set(currency, f);
  }
  return f.format(value);
}

export function fmtMoney(value: number | null | undefined, currency = "USD", digits = 2) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Ratio in, percent out: 0.1234 → "12.34%". */
export function fmtRatio(value: number | null | undefined, digits = 2, signed = false) {
  if (value === null || value === undefined) return "—";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

export function fmtCompact(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value);
}

export function fmtNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  if (!iso) return "—";
  // Date-only ISO strings are UTC midnight; format those in UTC so they don't
  // shift a day west of Greenwich. Full timestamps render in local time.
  if (iso.length === 10) {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
  }
  return new Date(iso).toLocaleString("en-US", opts);
}

export const toneClass = (value: number | null | undefined) =>
  value === null || value === undefined || value === 0
    ? "text-gray-300"
    : value > 0
      ? "text-teal-400"
      : "text-red-500";

// ------------------------------------------------------------- layout

export function Panel({
  title,
  aside,
  children,
  className = "",
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-gray-800 border border-gray-600 rounded-xl p-6 ${className}`}>
      {(title || aside) && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          {title && (
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{title}</h2>
          )}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  valueClassName = "text-gray-100",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-semibold mt-1 truncate ${valueClassName}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5">{children}</div>;
}

/** Pill-style single-choice control, keyboard-accessible as a radio group. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-gray-900 p-0.5 border border-gray-700">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400 ${
            value === opt.value ? "bg-gray-700 text-gray-100" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Chart legend swatch + label. Text stays in ink colors; only the swatch carries hue. */
export function LegendItem({ color, label, line = false }: { color: string; label: string; line?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
      <span
        aria-hidden
        className={line ? "w-3.5 h-0.5 rounded-full" : "size-2.5 rounded-sm"}
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

export function Footnote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-gray-500">
      <Info className="size-3.5 mt-px shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

// ------------------------------------------------------------- tab states

type FrameProps<T> = {
  response: TabResponse<T> | null;
  loading: boolean;
  refetching: boolean;
  error: string | null;
  retry: () => void;
  label: string;
  children: (data: T) => ReactNode;
};

/**
 * Loading / error / unavailable / ready, handled once for every tab. The
 * source line under each tab is part of the grounding story: every number
 * on screen can be traced to who published it.
 */
export function TabFrame<T>({ response, loading, refetching, error, retry, label, children }: FrameProps<T>) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16" role="status">
        <Classic className="size-6 text-gray-400" />
        <p className="text-sm text-gray-500">Loading {label.toLowerCase()}…</p>
      </div>
    );
  }

  if (error && !response) {
    return (
      <Panel>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-gray-300 font-medium">{label} couldn&apos;t be loaded</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300"
          >
            <RefreshCw className="size-3.5" /> Try again
          </button>
        </div>
      </Panel>
    );
  }

  if (!response) return null;

  if (!response.available) {
    return (
      <Panel>
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-gray-300 font-medium">No {label.toLowerCase()} for this symbol</p>
          <p className="text-sm text-gray-500 max-w-md">{response.reason}</p>
        </div>
      </Panel>
    );
  }

  return (
    <div className={`space-y-6 transition-opacity ${refetching ? "opacity-60" : ""}`} aria-busy={refetching}>
      {children(response.data)}
      <p className="text-xs text-gray-600">
        Source: {response.source}. Retrieved {fmtDate(response.asOf, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.
      </p>
    </div>
  );
}
