"use client";

import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, X } from "lucide-react";
import { Classic } from "@/components/loading-ui/classic";

type AlertItem = {
  _id: string;
  symbol: string;
  condition: "ABOVE" | "BELOW";
  threshold: number;
  status: "ARMED" | "TRIGGERED" | "DISABLED";
  cooldownMinutes: number;
  lastTriggeredAt?: string;
  currentPrice: number | null;
};

const statusStyles: Record<AlertItem["status"], string> = {
  ARMED: "bg-blue-500/10 text-blue-400",
  TRIGGERED: "bg-amber-500/10 text-amber-400",
  DISABLED: "bg-gray-700 text-gray-400",
};

const AlertsPage = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [formError, setFormError] = useState("");
  const [symbol, setSymbol] = useState("");
  const [condition, setCondition] = useState<"ABOVE" | "BELOW">("ABOVE");
  const [threshold, setThreshold] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadAlerts = () => {
    setLoading(true);
    setError(false);
    return fetch("/api/alerts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAlerts(data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = symbol.trim();
    const parsed = Number(threshold);
    if (!trimmed || submitting) return;

    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormError("Threshold must be a positive number.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: trimmed, condition, threshold: parsed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.message ?? "Failed to create alert.");
        return;
      }

      setSymbol("");
      setThreshold("");
      await loadAlerts();
    } catch {
      setFormError("Failed to create alert.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a._id !== id));
    await fetch("/api/alerts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadAlerts();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-100">Price Alerts</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Get notified once when a symbol crosses your threshold
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-2 max-w-2xl">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Symbol (e.g. AAPL)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-500"
          />
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as "ABOVE" | "BELOW")}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-gray-500"
          >
            <option value="ABOVE">Above</option>
            <option value="BELOW">Below</option>
          </select>
          <input
            type="number"
            step="any"
            min="0"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="Threshold"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 font-mono focus:outline-none focus:border-gray-500"
          />
          <button
            type="submit"
            disabled={submitting || !symbol.trim() || !threshold}
            className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 text-sm font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
        {formError && <p className="text-red-500 text-xs">{formError}</p>}
      </form>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 min-h-[30vh]">
          <Classic className="size-8 text-gray-400" />
          <p className="text-gray-500 text-lg">Loading alerts...</p>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <p className="text-red-500 text-lg">Failed to load alerts.</p>
        </div>
      ) : alerts.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No alerts yet — create one above to get notified on a price move.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {alerts.map((alert) => {
            const isAbove = alert.condition === "ABOVE";
            const price = alert.currentPrice;
            return (
              <div
                key={alert._id}
                className="bg-gray-800 border border-gray-600 rounded-xl p-5 hover:border-gray-500 transition-colors relative"
              >
                <button
                  onClick={() => handleDelete(alert._id)}
                  aria-label={`Delete alert for ${alert.symbol}`}
                  className="absolute top-3 right-3 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-start justify-between mb-4 pr-6">
                  <span className="text-xs font-mono font-semibold px-2 py-1 rounded bg-gray-700 text-yellow-400">
                    {alert.symbol}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${statusStyles[alert.status]}`}
                  >
                    {alert.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-3">
                  {isAbove ? (
                    <ArrowUp className="w-3.5 h-3.5 text-teal-400" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span>{isAbove ? "Above" : "Below"}</span>
                  <span className="font-mono text-gray-100">
                    ${alert.threshold.toFixed(2)}
                  </span>
                </div>

                <p className="text-2xl font-bold text-gray-100 font-mono">
                  {price != null
                    ? `$${price.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}`
                    : "--"}
                </p>

                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                  <span>Current price</span>
                  <span>Cooldown: {alert.cooldownMinutes}m</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
