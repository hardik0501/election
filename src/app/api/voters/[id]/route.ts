import { NextRequest, NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db/database';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const voter = await dbRepository.getVoterById(params.id);
    if (!voter) {
      return NextResponse.json({ error: 'Voter record not found' }, { status: 404 });
    }
    return NextResponse.json({ voter });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
