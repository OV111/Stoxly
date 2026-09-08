"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/dashboard/Panel";
import { RefreshCw } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Snapshot = {
  date: string;
  value: number;
  deposits: number;
  withdrawals: number;
};

type HistoryData = {
  snapshots: Snapshot[];
  totalDeposits: number;
  totalWithdrawals: number;
  startValue: number;
  endValue: number;
};

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PortfolioHistoryPanel = () => {
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/snapshots");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch history");
      }

      setHistory({
        ...data,
        snapshots: Array.isArray(data.snapshots) ? data.snapshots : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <Panel title="PORTFOLIO HISTORY" slot="@history">
        <div className="animate-pulse space-y-4">
          <div className="h-[200px] bg-gray-800/30 rounded-lg" />
          <div className="flex gap-4">
            <div className="flex-1 h-12 bg-gray-800/30 rounded" />
            <div className="flex-1 h-12 bg-gray-800/30 rounded" />
          </div>
        </div>
      </Panel>
    );
  }

  if (error || !history || !history.snapshots?.length) {
    return (
      <Panel title="PORTFOLIO HISTORY" slot="@history">
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <p className="text-gray-500 text-sm">
            {error || "No historical data available yet."}
          </p>
          <p className="text-xs text-gray-600">
            Daily snapshots will appear here once available.
          </p>
          <button
            onClick={() => fetchHistory()}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </Panel>
    );
  }

  const change = history.endValue - history.startValue;
  const changePercent = (change / history.startValue) * 100;
  const isPositive = change >= 0;

  return (
    <Panel
      title="PORTFOLIO HISTORY"
      slot="@history"
      meta={`${history.snapshots.length} days`}
      action={
        <button
          onClick={() => fetchHistory(true)}
          disabled={refreshing}
          className="text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
        </button>
      }
    >
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history.snapshots}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              tick={{ fill: "#6b7280", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "#374151" }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fill: "#6b7280", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "#374151" }}
              width={70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111827",
                borderColor: "#374151",
                borderRadius: "8px",
                padding: "8px 12px",
              }}
              labelStyle={{ color: "#9ca3af", fontSize: 11 }}
              formatter={(value: number) => [formatCurrency(value), "Value"]}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={isPositive ? "#2dd4bf" : "#ef4444"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: isPositive ? "#2dd4bf" : "#ef4444" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="bg-gray-800/30 rounded-lg p-3 text-center">
          <p className="text-[10px] font-semibold text-gray-500 tracking-wide">
            START
          </p>
          <p className="text-sm font-mono text-gray-300">
            {formatCurrency(history.startValue)}
          </p>
        </div>
        <div className="bg-gray-800/30 rounded-lg p-3 text-center">
          <p className="text-[10px] font-semibold text-gray-500 tracking-wide">
            END
          </p>
          <p
            className={`text-sm font-mono ${isPositive ? "text-teal-400" : "text-red-500"}`}
          >
            {formatCurrency(history.endValue)}
          </p>
          <p className="text-[10px] font-mono text-gray-500">
            {isPositive ? "+" : ""}
            {changePercent.toFixed(2)}%
          </p>
        </div>
      </div>
    </Panel>
  );
};

export default PortfolioHistoryPanel;
