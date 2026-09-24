import { NextRequest, NextResponse } from 'next/server';
import { getCachedAnalysis } from '@/lib/crypto-engine/cache';
import logger from '@/lib/crypto-engine/utils/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    const cached = await getCachedAnalysis(id);
    if (cached) {
      return NextResponse.json({
        exists: true,
        isCached: true,
        data: cached,
      });
    }

    return NextResponse.json({
      exists: false,
      isCached: false,
      message: 'No analysis found. Click "Analyze" to generate one.',
    });
  } catch (error) {
    logger.error({ assetId: id, error: error.message }, 'Failed to fetch analysis');
    return NextResponse.json(
      { error: 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}