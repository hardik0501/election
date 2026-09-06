import { describe, it, expect } from 'vitest';
import { dbRepository } from '../lib/db/database';
import { ingestionProcessor } from '../lib/ingestion/processor';

describe('Search & Ingestion Pipeline Integration Test', () => {
  it('should ingest CSV file, persist records, and perform compound multi-lingual search', async () => {
    const uniqueWard = `Ward-${Date.now().toString().slice(-4)}`;
    const testEpic = `XYZ${Date.now()}`;
    const csvContent = `serial_number,epic_number,voter_name,relation_type,relation_name,gender,age,house_number,ward_number,part_number,assembly_constituency
101,ABC9876543,राजेश कुमार,FATHER,महेश कुमार,MALE,38,12-A,${uniqueWard},Part-12,182-Patna
102,ABC9876544,सुनीता शर्मा,HUSBAND,राजेश कुमार,FEMALE,34,12-A,${uniqueWard},Part-12,182-Patna
103,${testEpic},विक्रम सिंह,FATHER,धर्मेन्द्र सिंह,MALE,45,45-C,Ward-9,Part-14,182-Patna`;

    const result = await ingestionProcessor.processBatch({
      batchName: `Patna Test Electoral Roll ${Date.now()}`,
      files: [
        {
          filename: 'test_electoral_roll.csv',
          buffer: Buffer.from(csvContent, 'utf-8'),
          fileType: 'CSV',
        },
      ],
    });

    expect(result.totalRecordsProcessed).toBe(3);
    expect(['COMPLETED', 'COMPLETED_WITH_WARNINGS']).toContain(result.batch.status);
    expect(result.sourceFiles.length).toBe(1);

    // 1. Test search with English transliteration ("Rajesh" -> matches "राजेश कुमार")
    const searchRes1 = await dbRepository.searchVoters({
      query: 'Rajesh',
    });
    expect(searchRes1.total).toBeGreaterThanOrEqual(1);
    const foundRajesh = searchRes1.results.find((r) => (r.name_hi || r.name_hindi || '').includes('राजेश'));
    expect(foundRajesh).toBeDefined();

    // 2. Test exact EPIC search
    const searchRes2 = await dbRepository.searchVoters({
      epic: testEpic,
    });
    expect(searchRes2.results.length).toBe(1);
    expect(searchRes2.results[0].name_hindi).toBe('विक्रम सिंह');

    // 3. Test Compound Filter (Unique Ward + Gender)
    const searchRes3 = await dbRepository.searchVoters({
      ward: uniqueWard,
      gender: 'FEMALE',
    });
    expect(searchRes3.results.length).toBe(1);
    expect(searchRes3.results[0].name_hindi).toBe('सुनीता शर्मा');
  });
});
