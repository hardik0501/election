import { NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db/database';

export async function GET() {
  try {
    const stats = await dbRepository.getStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
