import mongoose, { Schema, type Model } from "mongoose";

import type {
  DecisionAction,
  ConfidenceLevel,
  TimeHorizon,
} from "@/types/journal";

export interface InvestmentDecisionDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;

  type: "DECISION";

  assetId?: mongoose.Types.ObjectId;
  symbol?: string;

  title?: string;

  action: DecisionAction;

  thesis?: string;
  expectation?: string;

  timeHorizon?: TimeHorizon;
  confidence?: ConfidenceLevel;

  invalidationCondition?: string;

  transactionId?: mongoose.Types.ObjectId;

  tags: string[];

  reflection?: string;
  reflectionCreatedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const InvestmentDecisionSchema = new Schema<InvestmentDecisionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["DECISION"],
      default: "DECISION",
      immutable: true,
    },

    assetId: {
      type: Schema.Types.ObjectId,
      required: false,
    },

    symbol: {
      type: String,
      required: false,
      uppercase: true,
      trim: true,
    },

    title: {
      type: String,
      trim: true,
      maxlength: 120,
    },

    action: {
      type: String,
      enum: ["BUY", "SELL", "INCREASE", "REDUCE", "HOLD", "OTHER"],
      required: true,
    },

    thesis: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    expectation: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    timeHorizon: {
      type: String,
      enum: ["SHORT", "MEDIUM", "LONG"],
    },

    confidence: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
    },

    invalidationCondition: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      required: false,
    },

    tags: {
      type: [String],
      default: [],
    },

    reflection: {
      type: String,
      trim: true,
      maxlength: 3000,
    },

    reflectionCreatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

InvestmentDecisionSchema.index({
  userId: 1,
  createdAt: -1,
});

InvestmentDecisionSchema.index({
  userId: 1,
  symbol: 1,
  createdAt: -1,
});

export const InvestmentDecision: Model<InvestmentDecisionDocument> =
  mongoose.models.InvestmentDecision ||
  mongoose.model<InvestmentDecisionDocument>(
    "InvestmentDecision",
    InvestmentDecisionSchema,
  );
