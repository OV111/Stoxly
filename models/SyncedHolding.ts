import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISyncedHolding extends Document {
  userId: Types.ObjectId;
  connectionId: Types.ObjectId;
  symbol: string;
  quantity: number;
  updatedAt: Date;
  createdAt: Date;
}

const SyncedHoldingSchema = new Schema<ISyncedHolding>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    connectionId: {
      type: Schema.Types.ObjectId,
      ref: "ExchangeConnection",
      required: true,
      index: true,
    },
    symbol: { type: String, required: true },
    quantity: { type: Number, required: true },
  },
  { timestamps: true }
);

SyncedHoldingSchema.index({ connectionId: 1, symbol: 1 }, { unique: true });

const SyncedHolding =
  mongoose.models.SyncedHolding ||
  mongoose.model<ISyncedHolding>("SyncedHolding", SyncedHoldingSchema);

export default SyncedHolding;
