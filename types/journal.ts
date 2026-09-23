export const JOURNAL_ENTRY_TYPES = {
  DECISION: "DECISION",
  NOTE: "NOTE",
} as const;

export type JournalEntryType =
  (typeof JOURNAL_ENTRY_TYPES)[keyof typeof JOURNAL_ENTRY_TYPES];

export const DECISION_ACTIONS = {
  BUY: "BUY",
  SELL: "SELL",
  INCREASE: "INCREASE",
  REDUCE: "REDUCE",
  HOLD: "HOLD",
  OTHER: "OTHER",
} as const;

export type DecisionAction =
  (typeof DECISION_ACTIONS)[keyof typeof DECISION_ACTIONS];

export const TIME_HORIZONS = {
  SHORT: "SHORT",
  MEDIUM: "MEDIUM",
  LONG: "LONG",
} as const;

export type TimeHorizon = (typeof TIME_HORIZONS)[keyof typeof TIME_HORIZONS];

export const CONFIDENCE_LEVELS = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;

export type ConfidenceLevel =
  (typeof CONFIDENCE_LEVELS)[keyof typeof CONFIDENCE_LEVELS];

export interface JournalEntryBase {
  _id: string;
  userId: string;

  type: JournalEntryType;

  assetId?: string;
  symbol?: string;

  title?: string;
  content?: string;

  createdAt: string;
  updatedAt: string;
}

export interface InvestmentDecision extends JournalEntryBase {
  type: "DECISION";

  action: DecisionAction;

  thesis?: string;
  expectation?: string;

  timeHorizon?: TimeHorizon;
  confidence?: ConfidenceLevel;

  invalidationCondition?: string;
  transactionId?: string;

  tags: string[];

  reflection?: string;
  reflectionCreatedAt?: string;
}

export interface InvestmentNote extends JournalEntryBase {
  type: "NOTE";

  tags: string[];
}

export type JournalEntry = InvestmentDecision | InvestmentNote;

export interface CreateInvestmentDecisionInput {
  assetId?: string;
  symbol?: string;
  title?: string;
  action: DecisionAction;
  thesis?: string;
  expectation?: string;
  timeHorizon?: TimeHorizon;
  confidence?: ConfidenceLevel;
  invalidationCondition?: string;
  transactionId?: string;
  tags?: string[];
}

export interface CreateInvestmentNoteInput {
  assetId?: string;
  symbol?: string;
  title?: string;
  content: string;
  tags?: string[];
}

export interface UpdateInvestmentDecisionInput {
  title?: string;
  action?: DecisionAction;
  thesis?: string;
  expectation?: string;
  timeHorizon?: TimeHorizon;
  confidence?: ConfidenceLevel;
  invalidationCondition?: string;
  tags?: string[];
  reflection?: string;
}

export interface UpdateInvestmentNoteInput {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface DecisionPositionContext {
  symbol: string;
  quantity: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnlPct: number;
}

export interface DecisionPriceContext {
  priceAtDecision: number;
  currentPrice: number;
  changePct: number;
  asOf: string;
}

export interface DecisionReviewData {
  decision: InvestmentDecision;
  position: DecisionPositionContext | null;
  priceContext: DecisionPriceContext | null;
}
