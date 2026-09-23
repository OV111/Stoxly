import { ITransaction } from "@/models/Transactions";

export interface Lot {
  quantity: number;
  costPerUnit: number;
  occurredAt: Date;
}

export interface Holding {
  symbol: string;
  lots: Lot[];
  totalQuantity: number;
  totalCostBasis: number;
  avgCostPerUnit: number;
  realizedPnl: number;
}

export interface CashFlow {
  amount: number;
  occurredAt: Date;
}

export interface ReturnMetrics {
  twr: number; // decimal, e.g. 0.1482 = 14.82%
  mwr: number;
}

export interface RiskMetrics {
  beta: number;
  volatility: number;
  maxDrawdown: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  correlationMatrix: Record<string, Record<string, number>>;
}
