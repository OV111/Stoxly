import { AnalysisModel } from '../models/Analysis';
import { AnalysisResult } from '../../types';
import logger from '../../utils/logger';
import { db } from '../connection';

export class AnalysisRepository {
  /**
   * Save an analysis result to the database.
   * Stores the full data as a mixed field for easy retrieval,
   * plus extracted fields for efficient querying.
   */
  async save(result: AnalysisResult): Promise<boolean> {
    try {
      // Ensure connection is ready
      await db.connect();
      if (!db.isReady()) {
        logger.warn('Database not ready – skipping save');
        return false;
      }

      // Extract recommendation type and score for indexing
      const recommendationType = result.recommendation?.overall || 'unknown';
      const score = result.scores?.score || 0;
      const confidence = result.scores?.confidence || 0;

      const doc = {
        // Identification
        assetId: result.asset.id,
        analysisId: result.analysisId,
        timestamp: result.timestamp,
        version: result.version,

        // Extracted query fields
        recommendationType,
        score,
        confidence,
        aiModels: result.metadata.aiModels || [],

        // Full data (store everything as-is for complete retrieval)
        fullData: result,

        // These are already stored inside fullData,
        // but we keep them for backward compatibility if needed
        scores: result.scores,
        recommendation: result.recommendation,
        metadata: result.metadata,
        dataQuality: result.dataQuality,
      };

      await AnalysisModel.create(doc);
      logger.debug({ analysisId: result.analysisId, assetId: result.asset.id }, 'Analysis saved to database');
      return true;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to save analysis');
      return false;
    }
  }

  /**
   * Find the latest analysis for an asset
   */
  async findLatest(assetId: string): Promise<AnalysisResult | null> {
    try {
      await db.connect();
      if (!db.isReady()) return null;

      const doc = await AnalysisModel.findOne({ assetId })
        .sort({ timestamp: -1 })
        .lean();

      return doc ? this.toAnalysisResult(doc) : null;
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to find latest analysis');
      return null;
    }
  }

  /**
   * Find analysis by ID
   */
  async findById(analysisId: string): Promise<AnalysisResult | null> {
    try {
      await db.connect();
      if (!db.isReady()) return null;

      const doc = await AnalysisModel.findOne({ analysisId }).lean();
      return doc ? this.toAnalysisResult(doc) : null;
    } catch (error) {
      logger.error({ error: (error as Error).message }, `Failed to find analysis ${analysisId}`);
      return null;
    }
  }

  /**
   * Get analysis history for an asset with pagination
   */
  async findByAsset(assetId: string, limit: number = 10, skip: number = 0): Promise<AnalysisResult[]> {
    try {
      await db.connect();
      if (!db.isReady()) return [];

      const docs = await AnalysisModel.find({ assetId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      return docs.map((doc) => this.toAnalysisResult(doc));
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to find analysis history');
      return [];
    }
  }

  /**
   * Get the most recent recommendation for an asset (lightweight query)
   */
  async findLatestRecommendation(assetId: string): Promise<{ recommendation: string; score: number; confidence: number } | null> {
    try {
      await db.connect();
      if (!db.isReady()) return null;

      const doc = await AnalysisModel.findOne({ assetId })
        .sort({ timestamp: -1 })
        .select('recommendationType score confidence timestamp')
        .lean();

      if (!doc) return null;
      return {
        recommendation: doc.recommendationType || 'neutral',
        score: doc.score || 50,
        confidence: doc.confidence || 0,
      };
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to find latest recommendation');
      return null;
    }
  }

  /**
   * Count analyses for an asset
   */
  async count(assetId: string): Promise<number> {
    try {
      await db.connect();
      if (!db.isReady()) return 0;
      return await AnalysisModel.countDocuments({ assetId });
    } catch (error) {
      return 0;
    }
  }

  /**
   * Delete analysis by ID
   */
  async delete(analysisId: string): Promise<boolean> {
    try {
      await db.connect();
      if (!db.isReady()) return false;

      const result = await AnalysisModel.deleteOne({ analysisId });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error({ error: (error as Error).message }, `Failed to delete analysis ${analysisId}`);
      return false;
    }
  }

  /**
   * Delete all analyses for an asset (use with caution)
   */
  async deleteAllForAsset(assetId: string): Promise<number> {
    try {
      await db.connect();
      if (!db.isReady()) return 0;

      const result = await AnalysisModel.deleteMany({ assetId });
      return result.deletedCount || 0;
    } catch (error) {
      logger.error({ error: (error as Error).message }, `Failed to delete analyses for ${assetId}`);
      return 0;
    }
  }

  /**
   * Convert database document to AnalysisResult
   */
  private toAnalysisResult(doc: any): AnalysisResult {
    // If fullData exists, use it directly (preferred)
    if (doc.fullData) {
      return doc.fullData as AnalysisResult;
    }

    // Fallback: reconstruct from individual fields (for old documents without fullData)
    // This is a minimal reconstruction – you may need to expand based on your data.
    return {
      asset: { id: doc.assetId, symbol: doc.assetId, name: doc.assetId } as any,
      timestamp: doc.timestamp,
      analysisId: doc.analysisId,
      version: doc.version || '1.0.0',
      dataFreshness: {
        marketData: doc.timestamp,
        onchainData: doc.timestamp,
        newsData: doc.timestamp,
      },
      dataQuality: doc.dataQuality || {
        completeness: 0,
        freshness: 0,
        reliability: 0,
        consistency: 0,
        overallQuality: 0,
        issues: [],
      },
      scores: doc.scores || { score: 0, confidence: 0, confidenceLevel: 'low', riskAdjustedScore: 0, modules: {} },
      recommendation: doc.recommendation || {
        overall: 'neutral',
        confidence: 0,
        confidenceLevel: 'low',
        timeHorizon: {
          shortTerm: { description: '', direction: 'neutral', confidence: 0, confidenceLevel: 'low', keyFactors: [] },
          mediumTerm: { description: '', direction: 'neutral', confidence: 0, confidenceLevel: 'low', keyFactors: [] },
          longTerm: { description: '', direction: 'neutral', confidence: 0, confidenceLevel: 'low', keyFactors: [] },
        },
        conditions: '',
        rationale: '',
      },
      marketAnalysis: { keyMetrics: {} } as any,
      technicalAnalysis: {} as any,
      fundamentalAnalysis: { strengths: [], weaknesses: [] } as any,
      tokenomicsAnalysis: { supplyMetrics: {} } as any,
      onchainAnalysis: { metrics: {}, observations: [] } as any,
      newsAnalysis: { summary: { positiveCount: 0, negativeCount: 0, neutralCount: 0, topTopics: [], overallSentiment: 0, recentCatalysts: [], recentRisks: [], sentimentTrend: 'stable' } } as any,
      sentimentAnalysis: { overall: 'neutral', contrarianIndicator: '' } as any,
      riskAnalysis: { overallRiskLevel: 'medium', riskScore: 50, confidence: 50, riskFactors: [], highRiskCount: 0, summary: '' },
      macroAnalysis: { context: {} } as any,
      valuationAnalysis: { valuationStatus: 'fairly_valued' } as any,
      opportunityAnalysis: { catalysts: [], invalidationConditions: [] } as any,
      reasonsToConsider: { items: [], summary: '' },
      reasonsToAvoid: { items: [], summary: '' },
      bullCase: '',
      bearCase: '',
      catalysts: [],
      invalidationConditions: [],
      disclaimers: doc.disclaimers || [],
      metadata: doc.metadata || { aiModels: [], dataSources: [], processingTimeMs: 0, isCached: false },
    };
  }
}

export default AnalysisRepository;