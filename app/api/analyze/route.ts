import { NextRequest, NextResponse } from "next/server";
import { AnalysisOrchestrator } from "@/lib/crypto-engine/services/analysis-orchestrator";
import {
  getCachedAnalysis,
  setCachedAnalysis,
  isAnalysisRunning,
  setAnalysisRunning,
  clearRunningFlag,
} from "@/lib/crypto-engine/cache";
import logger from "@/lib/crypto-engine/utils/logger";

const orchestrator = new AnalysisOrchestrator();

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { id, forceRefresh = false } = await req.json();

  try {
    // 1. Check cache first (unless forceRefresh)
    if (!forceRefresh) {
      const cached = await getCachedAnalysis(id);
      if (cached) {
        logger.debug({ assetId: id }, "Returning cached analysis");
        return NextResponse.json({
          status: "cached",
          analysisId: cached.analysisId,
          data: cached,
        });
      }
    }

    // 2. Check if analysis is already running for this asset
    if (isAnalysisRunning(id)) {
      return NextResponse.json(
        {
          status: "processing",
          message: "Analysis is already in progress. Please wait.",
        },
        { status: 202 },
      );
    }

    // 3. Mark as running
    setAnalysisRunning(id);

    // 4. Run the analysis (orchestrator handles everything)
    try {
      const result = await orchestrator.analyze(id, {
        days: 365,
        enableAI: true,
      });

      // 5. Cache the result
      await setCachedAnalysis(id, result);

      // 6. Clear running flag
      clearRunningFlag(id);

      return NextResponse.json({
        status: "completed",
        analysisId: result.analysisId,
        data: result,
      });
    } catch (error) {
      clearRunningFlag(id);
      logger.error({ assetId: id, error: error.message }, "Analysis failed");
      throw error;
    }
  } catch (error) {
    logger.error({ assetId: id, error: error.message }, "Analysis route error");
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 },
    );
  }
}
