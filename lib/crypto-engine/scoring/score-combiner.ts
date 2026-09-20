//  Final composite score → Recommendation mapping
import { ModuleResult, OverallScore } from '../types/scores';
import { RecommendationType, ConfidenceLevel } from '../types/enums';
import { WeightConfig } from '../config/scoring-weights';

export class ScoreCombiner {
  combine(
    moduleScores: Record<string, ModuleResult>,
    weights: WeightConfig,
    assetCategory: string,
    marketPhase: 'bull' | 'bear' | 'sideways'
  ): OverallScore {
    let weightedSum = 0;
    let weightSum = 0;

    for (const [key, result] of Object.entries(moduleScores)) {
      const weight = weights[key as keyof WeightConfig] || 0;
      // Confidence-weight the score: low confidence modules contribute less
      const confidenceFactor = result.confidence / 100;
      const effectiveScore = result.score * confidenceFactor;
      weightedSum += effectiveScore * weight;
      weightSum += weight * confidenceFactor;
    }

    const finalScore = weightSum > 0 ? weightedSum / weightSum : 50;
    const roundedScore = Math.round(Math.min(Math.max(finalScore, 0), 100));

    // Map to recommendation
    const recommendation = this.scoreToRecommendation(roundedScore);

    // Confidence level
    const avgConfidence = Object.values(moduleScores).reduce((sum, m) => sum + m.confidence, 0) / Object.values(moduleScores).length;
    const confidenceLevel = this.getConfidenceLevel(avgConfidence);

    return {
      score: roundedScore,
      confidence: Math.round(avgConfidence),
      confidenceLevel,
      modules: moduleScores,
      riskAdjustedScore: Math.round(roundedScore * (1 - (100 - (moduleScores.risk?.score || 50)) / 200)),
    };
  }

  public scoreToRecommendation(score: number): {
    overall: RecommendationType;
    rationale: string;
  } {
    if (score >= 75) {
      return {
        overall: 'strong_opportunity',
        rationale: 'Exceptional fundamentals, technicals, and risk/reward profile.',
      };
    }
    if (score >= 55) {
      return {
        overall: 'potential_opportunity',
        rationale: 'Attractive setup with manageable risks.',
      };
    }
    if (score >= 40) {
      return {
        overall: 'watch',
        rationale: 'Wait for better entry or more confirmation.',
      };
    }
    if (score >= 25) {
      return {
        overall: 'neutral',
        rationale: 'Mixed signals; no clear edge.',
      };
    }
    if (score >= 10) {
      return {
        overall: 'high_risk',
        rationale: 'Speculative with significant downside exposure.',
      };
    }
    return {
      overall: 'avoid',
      rationale: 'Unfavorable risk/reward profile.',
    };
  }

  private getConfidenceLevel(confidence: number): ConfidenceLevel {
    if (confidence >= 80) return 'high';
    if (confidence >= 60) return 'medium';
    if (confidence >= 40) return 'low';
    return 'very_low';
  }
}