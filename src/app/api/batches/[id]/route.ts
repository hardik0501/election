import { NextRequest, NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db/database';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const batch = await dbRepository.getBatchById(params.id);
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }
    const files = await dbRepository.getSourceFiles(params.id);
    return NextResponse.json({ batch, source_files: files });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
