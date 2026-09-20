import mongoose, { Schema, Model, models } from "mongoose";
import type { WatchlistSymbolType } from "@/types/watchlist";

export interface WatchlistDocument {
  userId: mongoose.Types.ObjectId | string;
  symbol: string;
  type: WatchlistSymbolType;
  addedAt: Date;
}

const WatchlistSchema = new Schema<WatchlistDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["stock", "crypto", "etf", "index"],
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: "watchlists",
  }
);

// Prevent duplicates per user + symbol + type
WatchlistSchema.index({ userId: 1, symbol: 1, type: 1 }, { unique: true });

// Fast listing per user
WatchlistSchema.index({ userId: 1, addedAt: -1 });

export const Watchlist: Model<WatchlistDocument> =
  (models.Watchlist as Model<WatchlistDocument>) ||
  mongoose.model<WatchlistDocument>("Watchlist", WatchlistSchema);