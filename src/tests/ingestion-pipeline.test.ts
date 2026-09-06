import { describe, it, expect } from 'vitest';
import { tabularParser } from '../lib/parsers/csv-parser';
import { pdfElectoralRollParser } from '../lib/parsers/pdf-parser';
import { ingestionProcessor } from '../lib/ingestion/processor';
import { dbRepository } from '../lib/db/database';

describe('Phase 4: Production-Grade File Ingestion & Validation Pipeline', () => {
  it('should preview CSV headers and generate suggested column mapping', () => {
    const csvContent = `SL_NO,VOTER_NAME,FATHER_NAME,AGE,SEX,HOUSE_NO,VOTER_ID_EPIC,WARD_NO
1,Sunil Kumar,Ramesh Kumar,40,MALE,45,XYZ9876543,Ward-12`;

    const preview = tabularParser.preview(Buffer.from(csvContent, 'utf-8'), 'CSV');
    expect(preview.headers).toContain('VOTER_NAME');
    expect(preview.headers).toContain('VOTER_ID_EPIC');
    expect(preview.sample_rows.length).toBe(1);
    expect(preview.suggested_mapping.epic_number).toBe('VOTER_ID_EPIC');
    expect(preview.suggested_mapping.age).toBe('AGE');
  });

  it('should parse tabular data with custom column mapping config', async () => {
    const customCsv = `Col_A,Col_B,Col_C,Col_D
101,Anil Gupta,H.No 12-Z,AGP1234567`;

    const parsed = await tabularParser.parseBuffer(
      Buffer.from(customCsv, 'utf-8'),
      'CSV',
      { ward_number: 'Ward-99' },
      {
        serial_number: 'Col_A',
        name_auto: 'Col_B',
        house_number: 'Col_C',
        epic_number: 'Col_D',
      }
    );

    expect(parsed.length).toBe(1);
    expect(parsed[0].serial_number).toBe(101);
    expect(parsed[0].name_en).toBe('anil gupta');
    expect(parsed[0].house_number).toBe('12-Z');
    expect(parsed[0].epic_number).toBe('AGP1234567');
    expect(parsed[0].ward_number).toBe('Ward-99');
  });

  it('should queue batch asynchronously, enforce validation rules, and track validation errors', async () => {
    const batchEpic1 = `DUP_EPIC_${Date.now()}`;
    const testCsv = `serial_no,epic_number,voter_name,age,gender,house_no
1,${batchEpic1},Ravi Kumar,30,MALE,House 1
2,${batchEpic1},Ravi Duplicate,32,MALE,House 1
3,SHORT,Tiny Epic,15,FEMALE,House 2
4,VALID_EPIC_${Date.now()},,45,MALE,House 3`;

    const queueRes = await ingestionProcessor.processBatch({
      batchName: `Validation Pipeline Test ${Date.now()}`,
      files: [
        {
          filename: 'validation_test.csv',
          buffer: Buffer.from(testCsv, 'utf-8'),
          fileType: 'CSV',
        },
      ],
    });

    expect(queueRes.batch.id).toBeDefined();
    expect(queueRes.sourceFiles.length).toBe(1);

    const progress = ingestionProcessor.getProgress(queueRes.batch.id);
    expect(progress).not.toBeNull();
    expect(progress?.percentage).toBe(100);
    expect(progress?.current_stage).toBe('COMPLETED_WITH_WARNINGS');
    expect(progress?.warnings_count).toBeGreaterThanOrEqual(1);

    // Generate and inspect import report
    const report = await ingestionProcessor.generateImportReport(queueRes.batch.id);
    expect(report).not.toBeNull();
    expect(report?.batch_id).toBe(queueRes.batch.id);
    expect(report?.summary.error_breakdown).toBeDefined();
    expect(
      report?.summary.error_breakdown['DUPLICATE_EPIC_IN_BATCH'] ||
      report?.summary.error_breakdown['INVALID_AGE'] ||
      report?.summary.error_breakdown['MALFORMED_EPIC_FORMAT'] ||
      report?.summary.error_breakdown['MISSING_MANDATORY_NAME']
    ).toBeGreaterThanOrEqual(1);
  });
});
