import { NextRequest, NextResponse } from 'next/server';
import { tabularParser } from '@/lib/parsers/csv-parser';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided for preview' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split('.').pop()?.toUpperCase();

    const fileType = ext === 'XLSX' || ext === 'XLS' ? 'XLSX' : 'CSV';
    const preview = tabularParser.preview(buffer, fileType);

    return NextResponse.json({
      success: true,
      filename: file.name,
      file_type: fileType,
      ...preview,
    });
  } catch (error: any) {
    console.error('Preview error:', error);
    return NextResponse.json({ error: error.message || 'Failed to preview file headers' }, { status: 500 });
  }
}
