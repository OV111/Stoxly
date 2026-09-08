import mongoose from 'mongoose';

const RecommendationHistorySchema = new mongoose.Schema({
  assetId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  analysisId: { type: String, ref: 'Analysis', required: true },

  // Recommendation
  recommendation: { type: String, required: true },
  confidence: { type: Number, required: true },
  score: { type: Number, required: true },

  // Price at time
  priceAtTime: { type: Number, required: true },

  // Backtesting fields (filled later)
  subsequentReturn7d: { type: Number },
  subsequentReturn30d: { type: Number },
  subsequentReturn90d: { type: Number },
  maxDrawdown30d: { type: Number },
  wasCorrect: { type: Boolean },

}, { timestamps: true });

RecommendationHistorySchema.index({ assetId: 1, timestamp: -1 });

export const RecommendationHistoryModel = mongoose.models.RecommendationHistory || mongoose.model('RecommendationHistory', RecommendationHistorySchema);