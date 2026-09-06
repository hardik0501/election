import { NextRequest, NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db/database';
import { DuplicateDetector } from '@/lib/validation/duplicate-detector';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'DUPLICATE_EPIC', 'DUPLICATE_SERIAL_PART', 'POSSIBLE_DUPLICATE_RECORD', 'REPEATED_IMPORT'

    const allVoters = await dbRepository.searchVoters({ limit: 1000 });
    const sourceFiles = await dbRepository.getSourceFiles();

    const result = DuplicateDetector.runAllDuplicateChecks(allVoters.results, sourceFiles);

    let clusters = result.clusters;
    if (type) {
      clusters = clusters.filter((c) => c.duplicate_type === type);
    }

    return NextResponse.json({
      total_clusters: clusters.length,
      summary: result.summary,
      clusters,
    });
  } catch (error: any) {
    console.error('Error detecting duplicates:', error);
    return NextResponse.json({ error: error.message || 'Failed to detect duplicates' }, { status: 500 });
  }
}
