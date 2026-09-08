import mongoose from "mongoose";

const AssetSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    symbol: { type: String, required: true, index: true },
    name: { type: String, required: true },
    blockchain: { type: String, default: "unknown" },
    contractAddress: { type: String },
    categories: { type: [String], default: [] },
    isStablecoin: { type: Boolean, default: false },
    isMemeCoin: { type: Boolean, default: false },
    isDeFi: { type: Boolean, default: false },
    isGaming: { type: Boolean, default: false },
    description: { type: String },
    logoUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

AssetSchema.index({ symbol: 1, blockchain: 1 });

export const AssetModel =
  mongoose.models.Asset || mongoose.model("Asset", AssetSchema);
