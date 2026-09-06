import { NextRequest, NextResponse } from 'next/server';
import { voterService } from '@/lib/db/voter-service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const voter = await voterService.getVoter(params.id);
    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    if (!voter.house_number) {
      return NextResponse.json({
        house_number: 'N/A',
        normalized_house_number: 'N/A',
        part_number: voter.part_number,
        ward_number: voter.ward_number,
        members: [voter],
        total_members: 1,
        head_candidate: voter,
      });
    }

    const household = await voterService.getHousehold(voter.house_number, {
      ward: voter.ward_number || undefined,
      part: voter.part_number || undefined,
    });

    return NextResponse.json(household);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
