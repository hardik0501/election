import { NextRequest, NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db/database';
import { Gender, RelationType, SearchQueryFilters } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const query = searchParams.get('q') || undefined;
    const epic = searchParams.get('epic') || undefined;
    const name = searchParams.get('name') || undefined;
    const relation_name = searchParams.get('relation_name') || undefined;
    const relation_type = searchParams.get('relation_type') as RelationType || undefined;
    const gender = searchParams.get('gender') as Gender || undefined;
    const min_age = searchParams.get('min_age') ? parseInt(searchParams.get('min_age')!, 10) : undefined;
    const max_age = searchParams.get('max_age') ? parseInt(searchParams.get('max_age')!, 10) : undefined;
    const house_no = searchParams.get('house_no') || undefined;
    const ward = searchParams.get('ward') || undefined;
    const part_no = searchParams.get('part_no') || undefined;
    const serial_no = searchParams.get('serial_no') ? parseInt(searchParams.get('serial_no')!, 10) : undefined;
    const area = searchParams.get('area') || undefined;
    const assembly = searchParams.get('assembly') || undefined;
    const search_mode = (searchParams.get('search_mode') || 'all') as SearchQueryFilters['search_mode'];
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;
    const sort_by = searchParams.get('sort_by') || 'relevance_score';
    const sort_order = (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc';

    const filters: SearchQueryFilters = {
      query,
      epic,
      name,
      relation_name,
      relation_type,
      gender,
      min_age,
      max_age,
      house_no,
      ward,
      part_no,
      serial_no,
      area,
      assembly,
      search_mode,
      page,
      limit,
      sort_by,
      sort_order,
    };

    const response = await dbRepository.searchVoters(filters);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Search API Error:', error);
    return NextResponse.json({ error: error.message || 'Search execution failed' }, { status: 500 });
  }
}
