import mongoose from "mongoose";

const MarketSnapshotSchema = new mongoose.Schema(
  {
    assetId: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },

    // Market data
    priceUsd: { type: Number, required: true },
    marketCap: { type: Number },
    volume24h: { type: Number },
    circulatingSupply: { type: Number },
    totalSupply: { type: Number },
    maxSupply: { type: Number },

    // Price changes
    priceChange24h: { type: Number },
    priceChange7d: { type: Number },
    priceChange30d: { type: Number },

    // Volatility
    volatility30d: { type: Number },

    // ATH/ATL
    ath: { type: Number },
    athDate: { type: Date },
    atl: { type: Number },
    atlDate: { type: Date },

    // Rank & Dominance
    marketCapRank: { type: Number },
    dominance: { type: Number },
  },
  { timestamps: true },
);

MarketSnapshotSchema.index({ assetId: 1, timestamp: -1 });

export const MarketSnapshotModel =
  mongoose.models.MarketSnapshot ||
  mongoose.model("MarketSnapshot", MarketSnapshotSchema);
