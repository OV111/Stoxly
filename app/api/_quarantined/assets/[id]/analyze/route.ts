// app/api/assets/[id]/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AnalysisOrchestrator } from '@/lib/crypto-engine/services/analysis-orchestrator';
import {
  getCachedAnalysis,
  setCachedAnalysis,
  isAnalysisRunning,
  setAnalysisRunning,
  clearRunningFlag,
} from '@/lib/crypto-engine/cache';
import logger from '@/lib/crypto-engine/utils/logger';

const orchestrator = new AnalysisOrchestrator();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ← params is now a Promise
): Promise<NextResponse> {
  // ✅ MUST await params before accessing
  const { id } = await params;
  const { forceRefresh = false } = await req.json();

  try {
    // 1. Check cache
    if (!forceRefresh) {
      const cached = await getCachedAnalysis(id);
      if (cached) {
        logger.debug({ assetId: id }, 'Returning cached analysis');
        return NextResponse.json({
          status: 'completed',
          source: 'cache',
          analysisId: cached.analysisId,
          data: cached,
        });
      }
    }

    // 2. Check if already running
    if (isAnalysisRunning(id)) {
      return NextResponse.json({
        status: 'processing',
        source: 'running',
        message: 'Analysis is already in progress. Check back in a moment.',
      }, { status: 202 });
    }

    // 3. Mark running
    setAnalysisRunning(id);

    // 4. Run analysis
    const result = await orchestrator.analyze(id, {
      days: 365,
      enableAI: true,
    });

    // 5. Cache the result
    await setCachedAnalysis(id, result);

    // 6. Clear running flag
    clearRunningFlag(id);

    return NextResponse.json({
      status: 'completed',
      source: 'fresh',
      analysisId: result.analysisId,
      data: result,
    });
  } catch (error: any) {
    clearRunningFlag(id);
    logger.error({ assetId: id, error: error.message }, 'Analysis route error');
    return NextResponse.json(
      { status: 'error', message: error.message || 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}