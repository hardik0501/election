import { NextRequest, NextResponse } from 'next/server';
import { dbRepository } from '@/lib/db/database';
import { storageService } from '@/lib/storage/file-storage';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sourceFile = await dbRepository.getSourceFileById(params.id);
    if (!sourceFile) {
      return NextResponse.json({ error: 'Source file not found' }, { status: 404 });
    }

    let buffer: Buffer | null = null;

    if (sourceFile.storage_path && fs.existsSync(sourceFile.storage_path)) {
      buffer = await storageService.getFileBuffer(sourceFile.storage_path);
    } else {
      // If original mock file path is simulated, generate valid binary electoral document placeholder
      const content = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF`;
      buffer = Buffer.from(content, 'utf-8');
    }

    const contentType =
      sourceFile.file_type === 'PDF'
        ? 'application/pdf'
        : sourceFile.file_type === 'CSV'
        ? 'text/csv; charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const uint8Array = new Uint8Array(buffer);

    return new Response(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(sourceFile.original_filename)}"`,
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error: any) {
    console.error('Failed to stream source file:', error);
    return NextResponse.json({ error: error.message || 'File streaming error' }, { status: 500 });
  }
}
