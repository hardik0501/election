import { NextRequest, NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db/database';
import { Gender, RelationType, SearchQueryFilters } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const filters: SearchQueryFilters = {
      query: searchParams.get('q') || undefined,
      epic: searchParams.get('epic') || undefined,
      name: searchParams.get('name') || undefined,
      relation_name: searchParams.get('relation_name') || undefined,
      relation_type: searchParams.get('relation_type') as RelationType || undefined,
      gender: searchParams.get('gender') as Gender || undefined,
      min_age: searchParams.get('min_age') ? parseInt(searchParams.get('min_age')!, 10) : undefined,
      max_age: searchParams.get('max_age') ? parseInt(searchParams.get('max_age')!, 10) : undefined,
      house_no: searchParams.get('house_no') || undefined,
      ward: searchParams.get('ward') || undefined,
      part_no: searchParams.get('part_no') || undefined,
      serial_no: searchParams.get('serial_no') ? parseInt(searchParams.get('serial_no')!, 10) : undefined,
      assembly: searchParams.get('assembly') || undefined,
      search_mode: (searchParams.get('search_mode') || 'all') as any,
      limit: 1000,
      page: 1,
    };

    const searchRes = await dbRepository.searchVoters(filters);

    // Build CSV
    const headers = [
      'Serial No',
      'EPIC Number',
      'Name (Hindi)',
      'Name (English)',
      'Relation',
      'Relative Name (Hindi)',
      'Relative Name (English)',
      'Gender',
      'Age',
      'House No',
      'Ward',
      'Part No',
      'Assembly Constituency',
      'Validation Status',
    ];

    const rows = searchRes.results.map((r) => [
      r.serial_number || r.source_serial_number,
      `"${r.epic_number || ''}"`,
      `"${(r.name_hi || r.name_hindi || '').replace(/"/g, '""')}"`,
      `"${(r.name_en || r.name_english || '').replace(/"/g, '""')}"`,
      r.relation_type,
      `"${(r.relation_name_hi || r.relation_name_hindi || '').replace(/"/g, '""')}"`,
      `"${(r.relation_name_en || r.relation_name_english || '').replace(/"/g, '""')}"`,
      r.gender,
      r.age || '',
      `"${r.house_number || ''}"`,
      `"${r.ward_number || ''}"`,
      `"${r.part_number || ''}"`,
      `"${r.assembly_constituency || ''}"`,
      r.validation_status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="voter_export_${Date.now()}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
