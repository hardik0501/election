import { describe, it, expect, beforeAll } from 'vitest';
import { dbRepository } from '../lib/db/database';
import { ingestionProcessor } from '../lib/ingestion/processor';

describe('Phase 6: High-Quality Hindi + English Multilingual Search Suite', () => {
  const testBatchTag = `SearchTest_${Date.now()}`;
  const ramdayalEpic = `RDY${Date.now().toString().slice(-7)}`;
  const sunitaEpic = `SNT${Date.now().toString().slice(-7)}`;
  const vikasEpic = `VKS${Date.now().toString().slice(-7)}`;

  beforeAll(async () => {
    const csvData = `serial_number,epic_number,voter_name,relation_type,relation_name,gender,age,house_number,ward_number,part_number,assembly_constituency
201,${ramdayalEpic},रामदयाल,FATHER,शंकर लाल,MALE,48,House 10-A,Ward-15,Part-01,182-Bankipur
202,${sunitaEpic},सुनीता शर्मा,HUSBAND,रामदयाल,FEMALE,44,House 10-A,Ward-15,Part-01,182-Bankipur
203,${vikasEpic},विकास कुमार,MOTHER,कौशल्या देवी,MALE,22,House 12-B,Ward-15,Part-02,182-Bankipur
204,RND9876541,रमेश वर्मा,FATHER,दीनानाथ वर्मा,MALE,60,House 44,Ward-16,Part-03,182-Bankipur`;

    await ingestionProcessor.processBatch({
      batchName: testBatchTag,
      files: [
        {
          filename: 'multilingual_search_seed.csv',
          buffer: Buffer.from(csvData, 'utf-8'),
          fileType: 'CSV',
        },
      ],
    });
  });

  it('1. should match EXACT Hindi query: "रामदयाल"', async () => {
    const res = await dbRepository.searchVoters({ query: 'रामदयाल', limit: 100 });
    expect(res.total).toBeGreaterThanOrEqual(1);

    const match = res.results.find((v) => v.epic_number === ramdayalEpic);
    expect(match).toBeDefined();
    expect(match?.name_hindi || match?.name_hi).toBe('रामदयाल');
    expect(match?.relevance_score).toBeGreaterThanOrEqual(95);
    expect(match?.matched_fields).toContain('Matched Name (Exact Devanagari)');
  });

  it('2. should match ENGLISH transliteration query: "Ramdayal"', async () => {
    const res = await dbRepository.searchVoters({ query: 'Ramdayal', limit: 100 });
    expect(res.total).toBeGreaterThanOrEqual(1);

    const match = res.results.find((v) => v.epic_number === ramdayalEpic);
    expect(match).toBeDefined();
    expect(match?.relevance_score).toBeGreaterThanOrEqual(85);
  });

  it('3. should match SPACED English query: "Ram Dayal"', async () => {
    const res = await dbRepository.searchVoters({ query: 'Ram Dayal', limit: 100 });
    expect(res.total).toBeGreaterThanOrEqual(1);

    const match = res.results.find((v) => v.epic_number === ramdayalEpic);
    expect(match).toBeDefined();
    expect(match?.relevance_score).toBeGreaterThanOrEqual(80);
    expect(match?.matched_fields).toContain('Matched Spaced Variant');
  });

  it('4. should match PARTIAL prefix query: "Ramda"', async () => {
    const res = await dbRepository.searchVoters({ query: 'Ramda', limit: 100 });
    expect(res.total).toBeGreaterThanOrEqual(1);

    const match = res.results.find((v) => v.epic_number === ramdayalEpic);
    expect(match).toBeDefined();
    expect(match?.matched_fields).toContain('Matched Name (Prefix)');
  });

  it('5. should match FUZZY / typo queries: "Ramdyal" and "Ramdayl"', async () => {
    const res1 = await dbRepository.searchVoters({ query: 'Ramdyal', search_mode: 'fuzzy', limit: 100 });
    const match1 = res1.results.find((v) => v.epic_number === ramdayalEpic);
    expect(match1).toBeDefined();
    expect(match1?.matched_fields).toContain('Matched Fuzzy Name (Typo Tolerant)');

    const res2 = await dbRepository.searchVoters({ query: 'Ramdayl', search_mode: 'fuzzy', limit: 100 });
    const match2 = res2.results.find((v) => v.epic_number === ramdayalEpic);
    expect(match2).toBeDefined();
  });

  it('6. should match EXACT EPIC query', async () => {
    const res = await dbRepository.searchVoters({ epic: ramdayalEpic });
    expect(res.results.length).toBe(1);
    expect(res.results[0].epic_number).toBe(ramdayalEpic);
    expect(res.results[0].relevance_score).toBe(100);
  });

  it('7. should match Husband Name query: "Ramdayal" matching Sunita Sharma', async () => {
    const res = await dbRepository.searchVoters({ query: 'Ramdayal', limit: 100 });
    const sunitaMatch = res.results.find((v) => v.epic_number === sunitaEpic);
    expect(sunitaMatch).toBeDefined();
    expect(sunitaMatch?.relation_type).toBe('HUSBAND');
    expect(sunitaMatch?.matched_fields?.some((f) => f.includes('Husband Name'))).toBe(true);
  });

  it('8. should match Mother Name query: "Kaushalya" matching Vikas Kumar', async () => {
    const res = await dbRepository.searchVoters({ query: 'Kaushalya', limit: 100 });
    const vikasMatch = res.results.find((v) => v.epic_number === vikasEpic);
    expect(vikasMatch).toBeDefined();
    expect(vikasMatch?.relation_type).toBe('MOTHER');
    expect(vikasMatch?.matched_fields?.some((f) => f.includes('Mother Name'))).toBe(true);
  });

  it('9. should match House Number search query', async () => {
    const res = await dbRepository.searchVoters({ house_no: '10-A', limit: 100 });
    expect(res.results.length).toBeGreaterThanOrEqual(2);
    const hasRamdayal = res.results.some((v) => v.epic_number === ramdayalEpic);
    const hasSunita = res.results.some((v) => v.epic_number === sunitaEpic);
    expect(hasRamdayal).toBe(true);
    expect(hasSunita).toBe(true);
  });

  it('10. should enforce age range, gender, and ward filters', async () => {
    // Filter: Ward-15 + Age 40-50 + MALE
    const res = await dbRepository.searchVoters({
      ward: 'Ward-15',
      min_age: 40,
      max_age: 50,
      gender: 'MALE',
    });

    expect(res.results.length).toBeGreaterThanOrEqual(1);
    expect(res.results.every((v) => v.gender === 'MALE' && v.age! >= 40 && v.age! <= 50)).toBe(true);
    expect(res.results.some((v) => v.epic_number === ramdayalEpic)).toBe(true);
  });

  it('11. should return query expansion metadata and server-side facets in search response', async () => {
    const res = await dbRepository.searchVoters({
      query: 'Ramdayal',
      limit: 10,
      page: 1,
    });

    expect(res.query_expansion).toBeDefined();
    expect(res.query_expansion?.original).toBe('Ramdayal');
    expect(res.query_expansion?.detected_script).toBe('latin');
    expect(res.query_expansion?.transliterated_candidates).toBeDefined();
    expect(res.facets).toBeDefined();
    expect(res.facets?.gender_distribution).toBeDefined();
  });
});
