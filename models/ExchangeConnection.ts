import mongoose, { Schema, Document, Types } from "mongoose";

export type ExchangeProviderName = "binance";

export interface IExchangeConnection extends Document {
  userId: Types.ObjectId;
  provider: ExchangeProviderName;
  label?: string;
  apiKeyEncrypted: string;
  apiSecretEncrypted: string;
  status: "connected" | "error" | "revoked";
  lastError?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ExchangeConnectionSchema = new Schema<IExchangeConnection>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, enum: ["binance"], required: true },
    label: { type: String },
    apiKeyEncrypted: { type: String, required: true },
    apiSecretEncrypted: { type: String, required: true },
    status: {
      type: String,
      enum: ["connected", "error", "revoked"],
      default: "connected",
    },
    lastError: { type: String },
    lastSyncedAt: { type: Date },
  },
  { timestamps: true }
);

// One connection per user+provider (relax with a `label`-based compound key later if multi-account support is needed)
ExchangeConnectionSchema.index({ userId: 1, provider: 1 }, { unique: true });

const ExchangeConnection =
  mongoose.models.ExchangeConnection ||
  mongoose.model<IExchangeConnection>("ExchangeConnection", ExchangeConnectionSchema);

export default ExchangeConnection;
