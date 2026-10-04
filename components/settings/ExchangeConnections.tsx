"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

type Holding = { symbol: string; quantity: number };

type Connection = {
  id: string;
  provider: string;
  label?: string;
  status: "connected" | "error" | "revoked";
  lastError?: string;
  lastSyncedAt?: string;
  holdings: Holding[];
};

type ConnectForm = { provider: "binance"; label: string; apiKey: string; apiSecret: string };

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 flex flex-col gap-4">
    {children}
  </div>
);

const inputClass =
  "h-11 px-3 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50";

const ExchangeConnections = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const form = useForm<ConnectForm>({ defaultValues: { provider: "binance", label: "" } });

  const loadConnections = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/exchanges");
      const json = await res.json();
      if (res.ok) setConnections(json.connections);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const onConnect = async (data: ConnectForm) => {
    setStatus(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/exchanges/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", message: json.error ?? "Could not connect exchange." });
        return;
      }
      setStatus({ type: "success", message: "Exchange connected." });
      form.reset({ provider: "binance", label: "", apiKey: "", apiSecret: "" });
      await loadConnections();
    } catch {
      setStatus({ type: "error", message: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const onSync = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await fetch("/api/exchanges/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ connectionId: id }),
      });
      if (res.ok) await loadConnections();
    } finally {
      setSyncingId(null);
    }
  };

  const onRemove = async (id: string) => {
    await fetch(`/api/exchanges/${id}`, { method: "DELETE" });
    await loadConnections();
  };

  return (
    <Card>
      <div>
        <h2 className="text-lg font-semibold text-gray-100">Connected Exchanges</h2>
        <p className="text-gray-400 mt-1 text-sm">
          Link a read-only exchange API key to sync your holdings automatically instead of
          entering them by hand. Stoxly never requests trade or withdraw permissions, and keys
          are encrypted at rest.
        </p>
      </div>

      {!loading && connections.length > 0 && (
        <div className="flex flex-col gap-3">
          {connections.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-gray-700 bg-gray-900 p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-100 text-sm font-medium capitalize">
                    {c.provider} {c.label ? `· ${c.label}` : ""}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.status === "connected" && c.lastSyncedAt
                      ? `Last synced ${new Date(c.lastSyncedAt).toLocaleString()}`
                      : c.status === "error"
                        ? `Error: ${c.lastError ?? "sync failed"}`
                        : "Not synced yet"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onSync(c.id)}
                    disabled={syncingId === c.id}
                    className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                  >
                    {syncingId === c.id ? "Syncing..." : "Sync now"}
                  </button>
                  <button
                    onClick={() => onRemove(c.id)}
                    className="text-xs px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {c.holdings.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {c.holdings.map((h) => (
                    <span
                      key={h.symbol}
                      className="text-xs px-2 py-1 rounded-md bg-gray-800 border border-gray-700 text-gray-300"
                    >
                      {h.symbol}: {h.quantity}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={form.handleSubmit(onConnect)} className="flex flex-col gap-3 pt-2 border-t border-gray-700">
        <p className="text-sm text-gray-300 font-medium">Connect a new exchange</p>
        <select {...form.register("provider")} className={inputClass}>
          <option value="binance">Binance</option>
        </select>
        <input
          {...form.register("label")}
          placeholder="Label (optional, e.g. Binance main)"
          className={inputClass}
        />
        <input
          {...form.register("apiKey", { required: true })}
          placeholder="Read-only API key"
          className={inputClass}
        />
        <input
          {...form.register("apiSecret", { required: true })}
          type="password"
          placeholder="API secret"
          className={inputClass}
        />
        {status && (
          <p className={`text-sm ${status.type === "success" ? "text-teal-400" : "text-red-500"}`}>
            {status.message}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="h-11 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50"
        >
          {submitting ? "Connecting..." : "Connect"}
        </button>
      </form>
    </Card>
  );
};

export default ExchangeConnections;
