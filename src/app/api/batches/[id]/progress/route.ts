import { NextRequest, NextResponse } from 'next/server';
import { ingestionProcessor } from '@/lib/ingestion/processor';
import { dbRepository } from '@/lib/db/database';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const progress = ingestionProcessor.getProgress(params.id);
    const batch = await dbRepository.getBatchById(params.id);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    if (!progress) {
      // Return status from database if job completed previously
      return NextResponse.json({
        percentage: batch.status === 'COMPLETED' || batch.status === 'COMPLETED_WITH_WARNINGS' ? 100 : 0,
        current_stage: batch.status,
        current_page: 1,
        total_pages: 1,
        records_detected: batch.total_records_processed,
        records_valid: batch.total_records_valid,
        warnings_count: batch.total_records_flagged,
        errors_count: batch.status === 'FAILED' ? 1 : 0,
        duplicates_count: 0,
        current_file: '',
        elapsed_ms: 0,
        stage_message: `Batch status is ${batch.status}`,
      });
    }

    return NextResponse.json(progress);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
