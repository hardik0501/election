import { NextRequest, NextResponse } from 'next/server';
import { ingestionProcessor } from '@/lib/ingestion/processor';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const report = await ingestionProcessor.generateImportReport(params.id);
    if (!report) {
      return NextResponse.json({ error: 'Import report not found for batch' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format');

    if (format === 'json_download') {
      return new NextResponse(JSON.stringify(report, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="import_report_${params.id}.json"`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
