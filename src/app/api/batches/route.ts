import { NextRequest, NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const batches = await dbRepository.getBatches();
    return NextResponse.json({ batches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
