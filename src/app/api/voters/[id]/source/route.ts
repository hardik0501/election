import { NextRequest, NextResponse } from 'next/server';
import { voterService } from '@/lib/db/voter-service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sourceInfo = await voterService.getSourceInformation(params.id);
    if (!sourceInfo) {
      return NextResponse.json({ error: 'Voter source info not found' }, { status: 404 });
    }
    return NextResponse.json(sourceInfo);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
