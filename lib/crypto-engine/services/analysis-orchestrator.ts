import { DataAggregator } from "../data-collection/data-aggregator";
import { MetricCalculator } from "../data-processing/metric-calculator";
import { FundamentalScorer } from "../scoring/modules/fundamental-scorer";
import { TokenomicsScorer } from "../scoring/modules/tokenomics-scorer";
import { OnchainScorer } from "../scoring/modules/onchain-scorer";
import { SentimentScorer } from "../scoring/modules/sentiment-scorer";
import { RiskScorer } from "../scoring/modules/risk-scorer";
import { ConfidenceModel } from "../scoring/confidence-model";
import { ScoreCombiner } from "../scoring/score-combiner";
import { getWeightsForCategory, adjustWeightsForMarketPhase } from "../config";
import { AnalysisResult, DataPackage, ModuleResult } from "../types";
import { AnalyticalAIInput } from "../types/ai";
import logger from "../utils/logger";
import { AIServiceError } from "../utils/errors";
import {
  buildGroqSystemPrompt,
  buildGroqUserPrompt,
} from "../config/ai-prompts/groq-prompt";

// Optional AI clients – we'll lazy-load them if AI is enabled
let GroqClient: any;

export class AnalysisOrchestrator {
  private dataAggregator: DataAggregator;
  private metricCalculator: MetricCalculator;
  private fundamentalScorer: FundamentalScorer;
  private tokenomicsScorer: TokenomicsScorer;
  private onchainScorer: OnchainScorer;
  private sentimentScorer: SentimentScorer;
  private riskScorer: RiskScorer;
  private confidenceModel: ConfidenceModel;
  private scoreCombiner: ScoreCombiner;

  constructor() {
    this.dataAggregator = new DataAggregator();
    this.metricCalculator = new MetricCalculator();
    this.fundamentalScorer = new FundamentalScorer();
    this.tokenomicsScorer = new TokenomicsScorer();
    this.onchainScorer = new OnchainScorer();
    this.sentimentScorer = new SentimentScorer();
    this.riskScorer = new RiskScorer();
    this.confidenceModel = new ConfidenceModel();
    this.scoreCombiner = new ScoreCombiner();
  }

  /**
   * Main entry point – analyze an asset and return full structured analysis
   */
  async analyze(
    rawAssetId: string,
    options: { days?: number; forceRefresh?: boolean; enableAI?: boolean } = {},
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    const { days = 365, enableAI = true } = options;
    const assetId = rawAssetId.replace(/^CRYPTO:/, "");
    logger.info({ assetId }, "Starting analysis orchestration");

    try {
      // ---- STEP 1: Collect data ----
      const dataPackage = await this.dataAggregator.collectAll(assetId, {
        days,
      });

      // ---- STEP 2: Calculate technical indicators ----
      const technicalIndicators = this.metricCalculator.calculateIndicators({
        ohlcv: dataPackage.historicalOhlcv,
      });
      dataPackage.technical = technicalIndicators;

      // ---- STEP 3: Run scorers ----
      const moduleScores: Record<string, ModuleResult> = {
        fundamental: this.fundamentalScorer.score(dataPackage),
        tokenomics: this.tokenomicsScorer.score(dataPackage),
        onchain: this.onchainScorer.score(dataPackage),
        sentiment: this.sentimentScorer.score(dataPackage),
        risk: this.riskScorer.score(dataPackage),
        technical: {
          score: this.calculateTechnicalScore(technicalIndicators),
          confidence: 80,
          evidence: [],
          narrative:
            "Technical analysis based on RSI, MACD, moving averages, etc.",
        },
        macro: {
          score: this.calculateMacroScore(dataPackage.macro),
          confidence: 70,
          evidence: [],
          narrative:
            "Macro environment assessment based on BTC trend, VIX, etc.",
        },
      };

      // ---- STEP 4: Compute confidence ----
      const confidenceResult = this.confidenceModel.calculate(
        dataPackage,
        moduleScores,
      );

      // ---- STEP 5: Combine scores into recommendation ----
      const weights = getWeightsForCategory(
        dataPackage.asset.categories[0] || "other",
      );
      const marketPhase = this.determineMarketPhase(dataPackage.macro);
      const adjustedWeights = adjustWeightsForMarketPhase(weights, marketPhase);

      const overallScore = this.scoreCombiner.combine(
        moduleScores,
        adjustedWeights,
        dataPackage.asset.categories[0] || "other",
        marketPhase,
      );

      // ---- STEP 6: (Optional) AI reasoning ----
      let aiNarrative: any = null;
      if (enableAI && process.env.GROQ_API_KEY) {
        try {
          logger.info({ assetId }, "Calling Groq AI for analysis...");
          aiNarrative = await this.runAIAnalysis(
            dataPackage,
            moduleScores,
            overallScore,
          );
          logger.info(
            { assetId, hasNarrative: !!aiNarrative },
            "Groq AI analysis complete",
          );
        } catch (aiError) {
          logger.warn(
            { assetId, error: (aiError as Error).message },
            "AI analysis failed, falling back to deterministic",
          );
        }
      } else {
        logger.info(
          { assetId, hasApiKey: !!process.env.GROQ_API_KEY, enableAI },
          "AI analysis skipped",
        );
      }

      // ---- STEP 7: Assemble final result ----
      const result: AnalysisResult = {
        asset: dataPackage.asset,
        timestamp: new Date(),
        analysisId: this.generateAnalysisId(assetId),
        version: "1.0.0",
        dataFreshness: {
          marketData: dataPackage.collectedAt,
          onchainData:
            dataPackage.onchain?.timestamp || dataPackage.collectedAt,
          newsData: dataPackage.news[0]?.publishedAt || dataPackage.collectedAt,
        },
        dataQuality: {
          completeness: dataPackage.dataQuality.completeness,
          freshness: dataPackage.dataQuality.freshness,
          reliability: dataPackage.dataQuality.reliability,
          consistency: 0.85,
          overallQuality: dataPackage.dataQuality.overallQuality,
          issues: dataPackage.dataQuality.missingFields.map((field) => ({
            type: "missing_data",
            severity: "medium",
            fields: [field],
            message: `Missing field: ${field}`,
            impact: "Reduces confidence in related analysis",
          })),
        },
        scores: overallScore,
        marketAnalysis: {
          score: moduleScores.technical.score,
          confidence: moduleScores.technical.confidence,
          evidence: moduleScores.technical.evidence,
          narrative:
            moduleScores.technical.narrative ||
            "Market analysis based on price, volume, and liquidity.",
          keyMetrics: {
            price: dataPackage.market.priceUsd,
            marketCap: dataPackage.market.marketCap,
            volume24h: dataPackage.market.volume24h,
            volatility30d: dataPackage.market.volatility30d,
          },
        },
        technicalAnalysis: {
          score: moduleScores.technical.score,
          confidence: moduleScores.technical.confidence,
          evidence: moduleScores.technical.evidence,
          narrative: moduleScores.technical.narrative || "",
          indicators: dataPackage.technical,
          supportResistance: {
            supports: dataPackage.technical.supportLevels,
            resistances: dataPackage.technical.resistanceLevels,
          },
        },
        fundamentalAnalysis: {
          score: moduleScores.fundamental.score,
          confidence: moduleScores.fundamental.confidence,
          evidence: moduleScores.fundamental.evidence,
          narrative: moduleScores.fundamental.narrative || "",
          strengths: [],
          weaknesses: [],
        },
        tokenomicsAnalysis: {
          score: moduleScores.tokenomics.score,
          confidence: moduleScores.tokenomics.confidence,
          evidence: moduleScores.tokenomics.evidence,
          narrative: moduleScores.tokenomics.narrative || "",
          supplyMetrics: {
            circulatingSupply: dataPackage.market.circulatingSupply,
            totalSupply: dataPackage.market.totalSupply,
            maxSupply: dataPackage.market.maxSupply,
            inflationRate: dataPackage.tokenomics.inflationRate,
          },
        },
        onchainAnalysis: {
          score: moduleScores.onchain.score,
          confidence: moduleScores.onchain.confidence,
          evidence: moduleScores.onchain.evidence,
          narrative: moduleScores.onchain.narrative || "",
          metrics: dataPackage.onchain || {},
          observations: [],
        },
        newsAnalysis: {
          score: moduleScores.sentiment.score,
          confidence: moduleScores.sentiment.confidence,
          evidence: moduleScores.sentiment.evidence,
          narrative: moduleScores.sentiment.narrative || "",
          summary: {
            positiveCount: dataPackage.news.filter(
              (n) => n.sentimentScore > 0.2,
            ).length,
            negativeCount: dataPackage.news.filter(
              (n) => n.sentimentScore < -0.2,
            ).length,
            neutralCount: dataPackage.news.filter(
              (n) => n.sentimentScore >= -0.2 && n.sentimentScore <= 0.2,
            ).length,
            topTopics: [],
            overallSentiment:
              dataPackage.news.reduce((sum, n) => sum + n.sentimentScore, 0) /
              (dataPackage.news.length || 1),
            recentCatalysts: [],
            recentRisks: [],
            sentimentTrend: "stable",
          },
        },
        sentimentAnalysis: {
          score: moduleScores.sentiment.score,
          confidence: moduleScores.sentiment.confidence,
          evidence: moduleScores.sentiment.evidence,
          narrative: moduleScores.sentiment.narrative || "",
          overall:
            dataPackage.news.reduce((sum, n) => sum + n.sentimentScore, 0) /
              (dataPackage.news.length || 1) >
            0.1
              ? "bullish"
              : dataPackage.news.reduce((sum, n) => sum + n.sentimentScore, 0) /
                    (dataPackage.news.length || 1) <
                  -0.1
                ? "bearish"
                : "neutral",
          contrarianIndicator: "Not applicable",
        },
        riskAnalysis: {
          overallRiskLevel:
            moduleScores.risk.score > 70
              ? "low"
              : moduleScores.risk.score > 40
                ? "medium"
                : "high",
          riskScore: moduleScores.risk.score,
          confidence: moduleScores.risk.confidence,
          riskFactors: [],
          highRiskCount: 0,
          summary: moduleScores.risk.narrative || "",
        },
        macroAnalysis: {
          score: moduleScores.macro.score,
          confidence: moduleScores.macro.confidence,
          evidence: moduleScores.macro.evidence,
          narrative: moduleScores.macro.narrative || "",
          context: dataPackage.macro,
        },
        valuationAnalysis: {
          score: 50,
          confidence: 60,
          evidence: [],
          narrative: "",
          valuationStatus: "fairly_valued",
        },
        opportunityAnalysis: {
          score: overallScore.score,
          confidence: overallScore.confidence,
          evidence: [],
          narrative: "",
          catalysts: [],
          invalidationConditions: [],
        },
        recommendation: {
          overall: this.scoreCombiner.scoreToRecommendation(overallScore.score)
            .overall,
          confidence: overallScore.confidence,
          confidenceLevel: overallScore.confidenceLevel,
          timeHorizon: {
            shortTerm: {
              description:
                "Short-term outlook based on technicals and momentum.",
              direction: "neutral",
              confidence: 50,
              confidenceLevel: "medium",
              keyFactors: ["RSI", "MACD", "Volume"],
            },
            mediumTerm: {
              description:
                "Medium-term outlook based on fundamentals and tokenomics.",
              direction: "bullish",
              confidence: 60,
              confidenceLevel: "medium",
              keyFactors: ["Adoption", "Tokenomics", "Ecosystem growth"],
            },
            longTerm: {
              description:
                "Long-term outlook based on fundamental value proposition.",
              direction: "bullish",
              confidence: 70,
              confidenceLevel: "high",
              keyFactors: ["Network effects", "Scarcity", "Global adoption"],
            },
          },
          conditions: "Favorable risk/reward profile for medium-term horizon.",
          rationale: this.scoreCombiner.scoreToRecommendation(
            overallScore.score,
          ).rationale,
        },
        reasonsToConsider: {
          items: [],
          summary: "Review detailed analysis for specific reasons.",
        },
        reasonsToAvoid: {
          items: [],
          summary: "Review detailed analysis for specific risks.",
        },
        bullCase:
          "Based on data, the asset shows promising fundamentals and adoption.",
        bearCase: "Risks include volatility and regulatory uncertainty.",
        catalysts: [],
        invalidationConditions: [],
        disclaimers: [
          "This analysis is based on available data and should not be considered financial advice.",
          "Past performance does not guarantee future results.",
          "Crypto markets are highly volatile and involve significant risk of loss.",
        ],
        metadata: {
          aiModels: aiNarrative ? ["groq"] : [],
          dataSources: ["coingecko", "cryptopanic", "etherscan", "github"],
          processingTimeMs: Date.now() - startTime,
          isCached: false,
        },
      };

      // ---- STEP 8: If AI narrative exists, merge it into the result ----
      if (aiNarrative) {
        logger.info({ assetId }, "Merging AI narrative into result");
        this.mergeAINarrative(result, aiNarrative);
      }

      // ---- STEP 9: Populate reasons from deterministic evidence ----
      this.populateReasonsFromEvidence(result, moduleScores);

      logger.info(
        { assetId, elapsedMs: Date.now() - startTime },
        "Analysis complete",
      );

      return result;
    } catch (error) {
      logger.error(
        { assetId, error: (error as Error).message },
        "Analysis orchestration failed",
      );
      throw error;
    }
  }

  // --- Private helpers ---

  private generateAnalysisId(assetId: string): string {
    return `${assetId}_${Date.now()}`;
  }

  private calculateTechnicalScore(indicators: any): number {
    let score = 50;
    if (indicators.rsi14 > 70) score -= 10;
    else if (indicators.rsi14 < 30) score += 10;
    if (indicators.macd.histogram > 0) score += 5;
    else score -= 5;
    if (indicators.trend === "uptrend") score += 10;
    else if (indicators.trend === "downtrend") score -= 10;
    return Math.min(Math.max(score, 0), 100);
  }

  private calculateMacroScore(macro: any): number {
    let score = 50;
    if (macro.btcTrend === "uptrend") score += 15;
    else if (macro.btcTrend === "downtrend") score -= 15;
    if (macro.fearAndGreedIndex > 70) score -= 10;
    else if (macro.fearAndGreedIndex < 30) score += 10;
    if (macro.riskEnvironment === "risk_on") score += 10;
    else if (macro.riskEnvironment === "risk_off") score -= 10;
    return Math.min(Math.max(score, 0), 100);
  }

  private determineMarketPhase(macro: any): "bull" | "bear" | "sideways" {
    if (macro.btcTrend === "uptrend" && macro.fearAndGreedIndex > 50)
      return "bull";
    if (macro.btcTrend === "downtrend" && macro.fearAndGreedIndex < 50)
      return "bear";
    return "sideways";
  }

  /**
   * 🧠 STEP 6: Call Groq AI with the combined data
   */
  // services/analysis-orchestrator.ts

  private async runAIAnalysis(
    dataPackage: DataPackage,
    moduleScores: Record<string, ModuleResult>,
    overallScore: any,
  ): Promise<any> {
    // Lazy-load Groq client
    if (!GroqClient) {
      const { default: Groq } = await import("groq-sdk");
      GroqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }

    // ---- Build the input for Groq ----
    const input: AnalyticalAIInput = {
      asset: {
        id: dataPackage.asset.id,
        name: dataPackage.asset.name,
        symbol: dataPackage.asset.symbol,
        marketCapRank: dataPackage.market.marketCapRank || 0,
      },
      market_data: dataPackage.market,
      technical_indicators: dataPackage.technical,
      fundamental_data: dataPackage.fundamental,
      tokenomics: dataPackage.tokenomics,
      onchain_data: dataPackage.onchain,
      news_summary: {
        positiveCount: dataPackage.news.filter((n) => n.sentimentScore > 0.2)
          .length,
        negativeCount: dataPackage.news.filter((n) => n.sentimentScore < -0.2)
          .length,
        neutralCount: dataPackage.news.filter(
          (n) => n.sentimentScore >= -0.2 && n.sentimentScore <= 0.2,
        ).length,
        topTopics: dataPackage.news.slice(0, 10).map((n) => n.category),
        overallSentiment:
          dataPackage.news.reduce((sum, n) => sum + n.sentimentScore, 0) /
          (dataPackage.news.length || 1),
        recentCatalysts: dataPackage.news
          .filter((n) => n.sentimentScore > 0.5)
          .slice(0, 3)
          .map((n) => n.title),
        recentRisks: dataPackage.news
          .filter((n) => n.sentimentScore < -0.5)
          .slice(0, 3)
          .map((n) => n.title),
        sentimentTrend: "stable",
      },
      macro_context: dataPackage.macro,
    };

    logger.info(
      {
        assetSymbol: input.asset.symbol,
        dataSize: JSON.stringify(input).length,
      },
      "Sending data to Groq",
    );

    // ---- ✅ Use the recommended models from the deprecation document ----
    // ---- ✅ Current working models (as of Sept 2026) ----
    const models = [
      "openai/gpt-oss-120b", // Production, 500 t/s — primary
      "openai/gpt-oss-20b", // Production, 1000 t/s — fast fallback
      "qwen/qwen3.6-27b", // Preview, reasoning model — last resort
    ];

    let lastError: Error | null = null;

    for (const model of models) {
      try {
        logger.info({ model }, "Attempting Groq model");

        const startTime = Date.now();
        const response = await GroqClient.chat.completions.create({
          model: model,
          messages: [
            {
              role: "system",
              content: buildGroqSystemPrompt(),
            },
            {
              role: "user",
              content: buildGroqUserPrompt(input),
            },
          ],
          temperature: 0.3,
          max_tokens: 8000, // ✅ FIX 1: was unbounded → JSON truncated mid-response
        });

        const elapsed = Date.now() - startTime;
        const raw = response.choices[0]?.message?.content;

        if (!raw) {
          throw new Error("Empty response from Groq");
        }

        // ✅ FIX 2: Qwen reasoning models emit <think>…</think> before the JSON
        const content = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

        logger.info(
          {
            model,
            elapsedMs: elapsed,
            contentLength: content.length,
            preview: content.slice(0, 200),
          },
          "Groq response received",
        );

        // ---- Parse JSON ----
        try {
          const parsed = JSON.parse(content);
          logger.info(
            {
              hasAnalysis: !!parsed.analysis,
              bullishCount: parsed.analysis?.bullish_factors?.length || 0,
              bearishCount: parsed.analysis?.bearish_factors?.length || 0,
            },
            "Groq response parsed successfully",
          );
          parsed._model_used = model;
          return parsed;
        } catch (parseError) {
          // ✅ FIX 3: regex fallback on the already-cleaned string (not raw)
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            logger.info({ model }, "Extracted JSON from response");
            parsed._model_used = model;
            return parsed;
          }
          logger.error(
            { content: content.slice(0, 500) },
            "Failed to parse Groq response",
          );
          throw new Error("Invalid JSON from Groq");
        }
      } catch (error) {
        lastError = error as Error;
        logger.warn(
          { model, error: (error as Error).message },
          "Model failed, trying next",
        );
        continue;
      }
    }

    // If all models failed
    throw lastError || new Error("All Groq models failed");
  }

  /**
   * Merge AI-generated narrative into the final result
   */
  private mergeAINarrative(result: AnalysisResult, aiNarrative: any): void {
    if (!aiNarrative || !aiNarrative.analysis) {
      logger.warn("AI narrative missing analysis field");
      return;
    }

    const analysis = aiNarrative.analysis;

    // ---- 1. Investment Thesis ----
    if (analysis.independent_conclusion?.summary) {
      result.recommendation.rationale = analysis.independent_conclusion.summary;
    }

    // ---- 2. Bull/Bear Cases ----
    if (analysis.bullish_factors && analysis.bullish_factors.length > 0) {
      const factors = analysis.bullish_factors.slice(0, 3);
      result.bullCase = factors
        .map((f: any) => `• ${f.factor}: ${f.evidence}`)
        .join("\n");
    }

    if (analysis.bearish_factors && analysis.bearish_factors.length > 0) {
      const factors = analysis.bearish_factors.slice(0, 3);
      result.bearCase = factors
        .map((f: any) => `• ${f.factor}: ${f.evidence}`)
        .join("\n");
    }

    // ---- 3. Reasons to Consider (Bullish Factors) ----
    if (analysis.bullish_factors && analysis.bullish_factors.length > 0) {
      result.reasonsToConsider.items = analysis.bullish_factors
        .slice(0, 5)
        .map((f: any) => ({
          reason: f.factor,
          evidence: [f.evidence],
          strength: f.weight || 0.7,
        }));
      result.reasonsToConsider.summary = analysis.bullish_factors
        .slice(0, 3)
        .map((f: any) => f.factor)
        .join("; ");
    }

    // ---- 4. Reasons to Avoid (Bearish Factors) ----
    if (analysis.bearish_factors && analysis.bearish_factors.length > 0) {
      result.reasonsToAvoid.items = analysis.bearish_factors
        .slice(0, 5)
        .map((f: any) => ({
          reason: f.factor,
          evidence: [f.evidence],
          severity: f.weight || 0.7,
        }));
      result.reasonsToAvoid.summary = analysis.bearish_factors
        .slice(0, 3)
        .map((f: any) => f.factor)
        .join("; ");
    }

    // ---- 5. Hidden Risks → Catalysts ----
    if (analysis.hidden_risks && analysis.hidden_risks.length > 0) {
      result.catalysts = analysis.hidden_risks.slice(0, 3).map((r: any) => ({
        event: r.risk,
        timing: "medium" as "short" | "medium" | "long",
        impact: "medium" as "high" | "medium" | "low",
        probability: r.probability || 0.5,
      }));
    }

    // ---- 6. Data Quality Notes → Invalidation Conditions ----
    if (analysis.data_quality_notes && analysis.data_quality_notes.length > 0) {
      result.invalidationConditions = analysis.data_quality_notes
        .slice(0, 3)
        .map((n: any) => ({
          condition: n.issue,
          metric: n.impact,
          threshold: n.recommendation || "monitor",
        }));
    }

    // ---- 7. Outlook (if available) ----
    if (aiNarrative.outlook) {
      if (aiNarrative.outlook.short_term) {
        result.recommendation.timeHorizon.shortTerm = {
          description:
            aiNarrative.outlook.short_term.description ||
            result.recommendation.timeHorizon.shortTerm.description,
          direction:
            aiNarrative.outlook.short_term.direction ||
            result.recommendation.timeHorizon.shortTerm.direction,
          confidence: (aiNarrative.outlook.short_term.confidence || 0.5) * 100,
          confidenceLevel:
            result.recommendation.timeHorizon.shortTerm.confidenceLevel,
          keyFactors:
            aiNarrative.outlook.short_term.key_factors ||
            result.recommendation.timeHorizon.shortTerm.keyFactors,
        };
      }
      if (aiNarrative.outlook.medium_term) {
        result.recommendation.timeHorizon.mediumTerm = {
          description:
            aiNarrative.outlook.medium_term.description ||
            result.recommendation.timeHorizon.mediumTerm.description,
          direction:
            aiNarrative.outlook.medium_term.direction ||
            result.recommendation.timeHorizon.mediumTerm.direction,
          confidence: (aiNarrative.outlook.medium_term.confidence || 0.5) * 100,
          confidenceLevel:
            result.recommendation.timeHorizon.mediumTerm.confidenceLevel,
          keyFactors:
            aiNarrative.outlook.medium_term.key_factors ||
            result.recommendation.timeHorizon.mediumTerm.keyFactors,
        };
      }
      if (aiNarrative.outlook.long_term) {
        result.recommendation.timeHorizon.longTerm = {
          description:
            aiNarrative.outlook.long_term.description ||
            result.recommendation.timeHorizon.longTerm.description,
          direction:
            aiNarrative.outlook.long_term.direction ||
            result.recommendation.timeHorizon.longTerm.direction,
          confidence: (aiNarrative.outlook.long_term.confidence || 0.5) * 100,
          confidenceLevel:
            result.recommendation.timeHorizon.longTerm.confidenceLevel,
          keyFactors:
            aiNarrative.outlook.long_term.key_factors ||
            result.recommendation.timeHorizon.longTerm.keyFactors,
        };
      }
    }

    // ---- 8. Track AI model ----
    if (!result.metadata.aiModels.includes("groq")) {
      result.metadata.aiModels.push("groq");
    }

    logger.info(
      {
        hasBullish: result.reasonsToConsider.items.length > 0,
        hasBearish: result.reasonsToAvoid.items.length > 0,
        hasCatalysts: result.catalysts.length > 0,
        aiModels: result.metadata.aiModels,
      },
      "AI narrative merged successfully",
    );
  }

  /**
   * Populate reasons from deterministic evidence (fallback)
   */
  private populateReasonsFromEvidence(
    result: AnalysisResult,
    moduleScores: Record<string, ModuleResult>,
  ): void {
    // Only populate if AI didn't already add reasons
    if (
      result.reasonsToConsider.items.length > 0 &&
      result.reasonsToAvoid.items.length > 0
    ) {
      return;
    }

    const buyReasons: string[] = [];
    const avoidReasons: string[] = [];

    for (const mod of Object.values(moduleScores)) {
      for (const ev of mod.evidence) {
        if (ev.type === "bullish" && ev.weight > 0.5) {
          buyReasons.push(ev.description);
        } else if (ev.type === "bearish" && ev.weight > 0.5) {
          avoidReasons.push(ev.description);
        }
      }
    }

    // Only set if AI didn't already populate them
    if (result.reasonsToConsider.items.length === 0) {
      const uniqueBuy = [...new Set(buyReasons)].slice(0, 5);
      result.reasonsToConsider.items = uniqueBuy.map((reason) => ({
        reason,
        evidence: [],
        strength: 0.7,
      }));
      result.reasonsToConsider.summary =
        uniqueBuy.length > 0
          ? uniqueBuy.join("; ")
          : "No strong bullish signals detected.";
    }

    if (result.reasonsToAvoid.items.length === 0) {
      const uniqueAvoid = [...new Set(avoidReasons)].slice(0, 5);
      result.reasonsToAvoid.items = uniqueAvoid.map((reason) => ({
        reason,
        evidence: [],
        severity: 0.7,
      }));
      result.reasonsToAvoid.summary =
        uniqueAvoid.length > 0
          ? uniqueAvoid.join("; ")
          : "No major bearish signals detected.";
    }
  }
}
