import mongoose from "mongoose";

const AnalysisSchema = new mongoose.Schema(
  {
    // Core identification
    assetId: { type: String, required: true, index: true },
    analysisId: { type: String, unique: true, required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    version: { type: String, default: "1.0.0" },

    // Scores
    scores: {
      score: { type: Number, required: true },
      confidence: { type: Number, required: true },
      confidenceLevel: {
        type: String,
        enum: ["high", "medium", "low", "very_low"],
        required: true,
      },
      riskAdjustedScore: { type: Number, required: true },
      modules: { type: mongoose.Schema.Types.Mixed, default: {} },
    },

    // Recommendation
    recommendation: {
      overall: { type: String, required: true },
      confidence: { type: Number, required: true },
      confidenceLevel: {
        type: String,
        enum: ["high", "medium", "low", "very_low"],
      },
      timeHorizon: {
        shortTerm: { type: mongoose.Schema.Types.Mixed },
        mediumTerm: { type: mongoose.Schema.Types.Mixed },
        longTerm: { type: mongoose.Schema.Types.Mixed },
      },
      conditions: { type: String },
      rationale: { type: String },
    },

    // AI narrative
    bullCase: { type: String },
    bearCase: { type: String },
    investmentThesis: { type: String },

    // Reasons
    reasonsToConsider: {
      items: { type: [mongoose.Schema.Types.Mixed], default: [] },
      summary: { type: String },
    },
    reasonsToAvoid: {
      items: { type: [mongoose.Schema.Types.Mixed], default: [] },
      summary: { type: String },
    },

    // Catalysts & Conditions
    catalysts: { type: [mongoose.Schema.Types.Mixed], default: [] },
    invalidationConditions: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    // Disclaimers
    disclaimers: { type: [String], default: [] },

    // Metadata
    metadata: {
      aiModels: { type: [String], default: [] },
      dataSources: { type: [String], default: [] },
      processingTimeMs: { type: Number, required: true },
      isCached: { type: Boolean, default: false },
    },

    // Data Quality
    dataQuality: {
      completeness: { type: Number },
      freshness: { type: Number },
      reliability: { type: Number },
      consistency: { type: Number },
      overallQuality: { type: Number },
      issues: { type: [mongoose.Schema.Types.Mixed], default: [] },
    },

    // Market snapshot (for quick reference)
    marketSnapshot: {
      priceUsd: { type: Number },
      marketCap: { type: Number },
      volume24h: { type: Number },
      priceChange24h: { type: Number },
    },
  },
  { timestamps: true },
);

// Compound indexes for fast queries
AnalysisSchema.index({ assetId: 1, timestamp: -1 });
AnalysisSchema.index({ analysisId: 1 });
AnalysisSchema.index({ "scores.score": -1 });
AnalysisSchema.index({ "recommendation.overall": 1 });

export const AnalysisModel =
  mongoose.models.Analysis || mongoose.model("Analysis", AnalysisSchema);
