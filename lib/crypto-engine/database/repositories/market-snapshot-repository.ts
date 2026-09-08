import { MarketSnapshotModel } from "../models/MarketSnapshot";
import { MarketData } from "../../types";
import { db } from "../connection";
import logger from "../../utils/logger";

export class MarketSnapshotRepository {
  async save(assetId: string, marketData: MarketData): Promise<boolean> {
    try {
      await db.connect();
      if (!db.isReady()) return false;

      await MarketSnapshotModel.create({
        assetId,
        timestamp: new Date(),
        priceUsd: marketData.priceUsd,
        marketCap: marketData.marketCap,
        volume24h: marketData.volume24h,
        circulatingSupply: marketData.circulatingSupply,
        totalSupply: marketData.totalSupply,
        maxSupply: marketData.maxSupply,
        priceChange24h: marketData.priceChange24h,
        priceChange7d: marketData.priceChange7d,
        priceChange30d: marketData.priceChange30d,
        volatility30d: marketData.volatility30d,
        ath: marketData.ath,
        athDate: marketData.athDate,
        atl: marketData.atl,
        atlDate: marketData.atlDate,
        marketCapRank: marketData.marketCapRank,
      });
      return true;
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        "Failed to save market snapshot",
      );
      return false;
    }
  }

  async findLatest(assetId: string): Promise<any | null> {
    try {
      await db.connect();
      if (!db.isReady()) return null;
      return await MarketSnapshotModel.findOne({ assetId })
        .sort({ timestamp: -1 })
        .lean();
    } catch (error) {
      return null;
    }
  }
}
