import { NextRequest, NextResponse } from 'next/server';
import { ingestionProcessor } from '@/lib/ingestion/processor';
import { FileType, ColumnMappingConfig } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const batchName = formData.get('batch_name') as string || undefined;
    const assembly = formData.get('assembly') as string || undefined;
    const ward = formData.get('ward') as string || undefined;
    const partNo = formData.get('part_no') as string || undefined;
    const district = formData.get('district') as string || undefined;

    // Optional column mapping config from interactive mapping UI
    let columnMapping: ColumnMappingConfig | undefined = undefined;
    const rawMapping = formData.get('column_mapping') as string | null;
    if (rawMapping) {
      try {
        columnMapping = JSON.parse(rawMapping);
      } catch (e) {
        console.warn('Failed to parse column mapping json:', e);
      }
    }

    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided for upload.' }, { status: 400 });
    }

    const processedFiles: { filename: string; buffer: Buffer; fileType: FileType }[] = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = file.name.split('.').pop()?.toUpperCase();

      let fileType: FileType = 'CSV';
      if (ext === 'PDF') fileType = 'PDF';
      else if (ext === 'XLSX' || ext === 'XLS') fileType = 'XLSX';
      else if (ext === 'PNG' || ext === 'JPG' || ext === 'JPEG' || ext === 'WEBP' || ext === 'BMP') fileType = 'IMAGE';

      processedFiles.push({
        filename: file.name,
        buffer,
        fileType,
      });
    }

    // Queue batch processing asynchronously
    const { batch, sourceFiles } = await ingestionProcessor.queueBatch({
      batchName,
      metadata: {
        assembly_constituency: assembly,
        ward_number: ward,
        part_number: partNo,
        district: district,
      },
      columnMapping,
      files: processedFiles,
    });

    return NextResponse.json({
      success: true,
      batch_id: batch.id,
      batch_name: batch.batch_name,
      status: batch.status,
      files_count: sourceFiles.length,
      source_files: sourceFiles,
      message: 'Batch uploaded and queued for processing. Poll /api/batches/[id]/progress for live updates.',
    });
  } catch (error: any) {
    console.error('API Upload Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process voter upload' },
      { status: 500 }
    );
  }
}
