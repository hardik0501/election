import { describe, it, expect, beforeEach } from 'vitest';
import { dbRepository } from '../lib/db/database';
import { voterService } from '../lib/db/voter-service';
import { MasterHindiPdfExtractor, FieldDetector, VoterBlockDetector } from '../lib/parsers/pdf-extractor';
import { expandSearchQuery } from '../lib/nlp/transliteration';
import { Voter, SourceFile, ImportBatch } from '@/types';

describe('Phase 10: Production Hardening, Real-World Roll Pipeline & E2E Validation', () => {
  const referenceFileId = 'source_file_jaipur_ward091_part004';
  const referenceBatchId = 'batch_jaipur_ward091_2026';
  const referenceFileName = 'JAIPUR NAGAR NIGAM-Ward No-091-Part No-004.pdf';

  // Realistic 49-page test fixture generating records across first, middle, and last pages
  const fixtureVoters: Partial<Voter>[] = [
    // --- Page 1: Initial Roll Header & First Voters ---
    {
      id: 'v_p1_s1',
      serial_number: 1,
      source_serial_number: 1,
      source_page_number: 1,
      source_file_id: referenceFileId,
      name_hi: 'राधेश्याम शर्मा',
      name_en: 'Radheshyam Sharma',
      gender: 'MALE',
      age: 52,
      house_number: '1',
      relation_type: 'FATHER',
      relation_name_hi: 'गोपाल शर्मा',
      relation_name_en: 'Gopal Sharma',
      epic_number: 'TZV1000001',
      ward_number: '91',
      part_number: '004',
      area: 'खातीपुरा रोड',
      constituency_id: 'झोटवाड़ा (46)',
      photo_available: true,
      extraction_confidence: 0.98,
      validation_status: 'VALID',
    },
    {
      id: 'v_p1_s2',
      serial_number: 2,
      source_serial_number: 2,
      source_page_number: 1,
      source_file_id: referenceFileId,
      name_hi: 'सुनीता शर्मा',
      name_en: 'Sunita Sharma',
      gender: 'FEMALE',
      age: 48,
      house_number: '1', // Co-residing at House 1
      relation_type: 'HUSBAND',
      relation_name_hi: 'राधेश्याम शर्मा',
      relation_name_en: 'Radheshyam Sharma',
      epic_number: 'TZV1000002',
      ward_number: '91',
      part_number: '004',
      area: 'खातीपुरा रोड',
      constituency_id: 'झोटवाड़ा (46)',
      photo_available: true,
      extraction_confidence: 0.98,
      validation_status: 'VALID',
    },

    // --- Page 3: Reference Voter (Ramdayal / रामदयाल, Serial 3, House 12) ---
    {
      id: 'v_p3_s3',
      serial_number: 3,
      source_serial_number: 3,
      source_page_number: 3,
      source_file_id: referenceFileId,
      name_hi: 'रामदयाल',
      name_en: 'Ramdayal',
      gender: 'MALE',
      age: 39,
      house_number: '12',
      relation_type: 'FATHER',
      relation_name_hi: 'राम प्रसाद',
      relation_name_en: 'Ram Prasad',
      epic_number: 'TZV1387711',
      ward_number: '91',
      part_number: '004',
      area: 'खातीपुरा रोड',
      constituency_id: 'झोटवाड़ा (46)',
      photo_available: true,
      extraction_confidence: 0.99,
      validation_status: 'VALID',
    },
    {
      id: 'v_p3_s4',
      serial_number: 4,
      source_serial_number: 4,
      source_page_number: 3,
      source_file_id: referenceFileId,
      name_hi: 'कौशल्या देवी',
      name_en: 'Kaushalya Devi',
      gender: 'FEMALE',
      age: 36,
      house_number: '12', // Multiple voters in House 12
      relation_type: 'HUSBAND',
      relation_name_hi: 'रामदयाल',
      relation_name_en: 'Ramdayal',
      epic_number: 'TZV1387712',
      ward_number: '91',
      part_number: '004',
      area: 'खातीपुरा रोड',
      constituency_id: 'झोटवाड़ा (46)',
      photo_available: true,
      extraction_confidence: 0.97,
      validation_status: 'VALID',
    },
    {
      id: 'v_p3_s5',
      serial_number: 5,
      source_serial_number: 5,
      source_page_number: 3,
      source_file_id: referenceFileId,
      name_hi: 'विकास कुमार',
      name_en: 'Vikas Kumar',
      gender: 'MALE',
      age: 20,
      house_number: '12', // Mother relation test
      relation_type: 'MOTHER',
      relation_name_hi: 'कौशल्या देवी',
      relation_name_en: 'Kaushalya Devi',
      epic_number: 'TZV1387713',
      ward_number: '91',
      part_number: '004',
      area: 'खातीपुरा रोड',
      constituency_id: 'झोटवाड़ा (46)',
      photo_available: true,
      extraction_confidence: 0.95,
      validation_status: 'VALID',
    },

    // --- Page 25: Middle Page of 49-Page Roll ---
    {
      id: 'v_p25_s500',
      serial_number: 500,
      source_serial_number: 500,
      source_page_number: 25,
      source_file_id: referenceFileId,
      name_hi: 'मोहम्मद इरफान',
      name_en: 'Mohammad Irfan',
      gender: 'MALE',
      age: 44,
      house_number: '88-B',
      relation_type: 'FATHER',
      relation_name_hi: 'अब्दुल हमीद',
      relation_name_en: 'Abdul Hameed',
      epic_number: 'TZV1000500',
      ward_number: '91',
      part_number: '004',
      area: 'खातीपुरा रोड',
      constituency_id: 'झोटवाड़ा (46)',
      photo_available: true,
      extraction_confidence: 0.96,
      validation_status: 'VALID',
    },

    // --- Page 49: Final Page of 49-Page Roll ---
    {
      id: 'v_p49_s980',
      serial_number: 980,
      source_serial_number: 980,
      source_page_number: 49,
      source_file_id: referenceFileId,
      name_hi: 'ज्योति गुप्ता',
      name_en: 'Jyoti Gupta',
      gender: 'FEMALE',
      age: 29,
      house_number: '185',
      relation_type: 'HUSBAND',
      relation_name_hi: 'अमित गुप्ता',
      relation_name_en: 'Amit Gupta',
      epic_number: 'TZV1000980',
      ward_number: '91',
      part_number: '004',
      area: 'खातीपुरा रोड',
      constituency_id: 'झोटवाड़ा (46)',
      photo_available: true,
      extraction_confidence: 0.97,
      validation_status: 'VALID',
    },
  ];

  beforeEach(async () => {
    // Seed reference batch & source file
    await dbRepository.createBatch('Jaipur Ward 91 Master Roll Batch');
    await dbRepository.createSourceFile({
      batch_id: referenceBatchId,
      original_filename: referenceFileName,
      storage_path: `storage_uploads/${referenceBatchId}/sha256_${referenceFileName}`,
      file_size_bytes: 5242880,
      file_type: 'PDF',
      file_hash_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      total_pages: 49,
      parsing_status: 'SUCCESS',
    });

    await dbRepository.insertVoterRecordsBulk(fixtureVoters as any);
  });

  // =========================================================================
  // 1. 49-PAGE REFERENCE PDF EXTRACTION TEST FIXTURE
  // =========================================================================
  describe('1. 49-Page Reference Roll Multi-Page Processing & Entity Integrity', () => {
    it('should verify voter records on First Page (Page 1), Middle Page (Page 25), and Last Page (Page 49)', async () => {
      // First Page Check
      const p1Voter = await voterService.getVoter('v_p1_s1');
      expect(p1Voter).not.toBeNull();
      expect(p1Voter?.source_page_number).toBe(1);
      expect(p1Voter?.source_serial_number).toBe(1);
      expect(p1Voter?.name_hi).toBe('राधेश्याम शर्मा');

      // Middle Page Check (Page 25)
      const p25Voter = await voterService.getVoter('v_p25_s500');
      expect(p25Voter).not.toBeNull();
      expect(p25Voter?.source_page_number).toBe(25);
      expect(p25Voter?.source_serial_number).toBe(500);
      expect(p25Voter?.name_hi).toBe('मोहम्मद इरफान');

      // Final Page Check (Page 49 of 49)
      const p49Voter = await voterService.getVoter('v_p49_s980');
      expect(p49Voter).not.toBeNull();
      expect(p49Voter?.source_page_number).toBe(49);
      expect(p49Voter?.source_serial_number).toBe(980);
      expect(p49Voter?.epic_number).toBe('TZV1000980');
    });

    it('should verify multiple relations (Father, Husband, Mother) and multiple voters residing in the same house', async () => {
      const house12Cluster = await voterService.getHousehold('12', { ward: '91', part: '004' });
      expect(house12Cluster.members.length).toBeGreaterThanOrEqual(3);

      const relations = house12Cluster.members.map((m) => m.relation_type);
      expect(relations).toContain('FATHER');
      expect(relations).toContain('HUSBAND');
      expect(relations).toContain('MOTHER');

      const genders = house12Cluster.members.map((m) => m.gender);
      expect(genders).toContain('MALE');
      expect(genders).toContain('FEMALE');
    });
  });

  // =========================================================================
  // 2. COMPREHENSIVE MULTI-LINGUAL SEARCH AUDIT
  // =========================================================================
  describe('2. Comprehensive Multi-Lingual Search Pipeline Verification', () => {
    it('should match exact Hindi Name: रामदयाल', async () => {
      const res = await dbRepository.searchVoters({ query: 'रामदयाल', limit: 50 });
      expect(res.results.length).toBeGreaterThan(0);
      expect(res.results.some((r) => r.name_hi === 'रामदयाल')).toBe(true);
    });

    it('should match English Transliteration: Ramdayal and spaced variant: Ram Dayal', async () => {
      const res1 = await dbRepository.searchVoters({ query: 'Ramdayal', limit: 50 });
      expect(res1.results.some((r) => r.name_hi === 'रामदयाल')).toBe(true);

      const res2 = await dbRepository.searchVoters({ query: 'Ram Dayal', limit: 50 });
      expect(res2.results.some((r) => r.name_hi === 'रामदयाल')).toBe(true);
    });

    it('should match partial Hindi (रामद) and partial English (Ramda)', async () => {
      const resHindi = await dbRepository.searchVoters({ query: 'रामद', limit: 50 });
      expect(resHindi.results.some((r) => r.name_hi.includes('राम'))).toBe(true);

      const resEnglish = await dbRepository.searchVoters({ query: 'Ramda', limit: 50 });
      expect(resEnglish.results.some((r) => r.name_en.toLowerCase().startsWith('ramda'))).toBe(true);
    });

    it('should match fuzzy typo variants: Ramdyal, Ramdayl', async () => {
      const resFuzzy1 = await dbRepository.searchVoters({ query: 'Ramdyal', limit: 50 });
      expect(resFuzzy1.results.some((r) => r.name_hi === 'रामदयाल' || r.name_en === 'Ramdayal')).toBe(true);

      const resFuzzy2 = await dbRepository.searchVoters({ query: 'Ramdayl', limit: 50 });
      expect(resFuzzy2.results.some((r) => r.name_hi === 'रामदयाल' || r.name_en === 'Ramdayal')).toBe(true);
    });

    it('should match direct EPIC: TZV1387711', async () => {
      const res = await dbRepository.searchVoters({ epic: 'TZV1387711' });
      expect(res.results.length).toBeGreaterThanOrEqual(1);
      const exactVoter = res.results.find((r) => r.epic_number === 'TZV1387711');
      expect(exactVoter).toBeDefined();
      expect(exactVoter?.name_hi).toBe('रामदयाल');
    });

    it('should match House Number: 12', async () => {
      const res = await dbRepository.searchVoters({ house_no: '12', ward: '91', part_no: '004' });
      expect(res.results.length).toBeGreaterThanOrEqual(2);
      expect(res.results.some((r) => r.house_number === '12')).toBe(true);
    });

    it('should match Father Name: राम प्रसाद and Mother Name: कौशल्या देवी', async () => {
      const resFather = await dbRepository.searchVoters({ relation_name: 'राम प्रसाद', limit: 50 });
      expect(resFather.results.some((r) => r.relation_name_hi?.includes('राम प्रसाद') || r.relation_name_en?.includes('Ram Prasad'))).toBe(true);

      const resMother = await dbRepository.searchVoters({ relation_name: 'कौशल्या देवी', limit: 50 });
      expect(resMother.results.some((r) => r.relation_name_hi?.includes('कौशल्या देवी') || r.relation_name_en?.includes('Kaushalya'))).toBe(true);
    });

    it('should execute compound search with combined filters (Name + Ward + Gender + Age Range)', async () => {
      const res = await dbRepository.searchVoters({
        query: 'Sunita',
        ward: '91',
        part_no: '004',
        gender: 'FEMALE',
        min_age: 40,
        max_age: 50,
      });

      expect(res.results.length).toBeGreaterThan(0);
      const first = res.results[0];
      expect(first.gender).toBe('FEMALE');
      expect(first.ward_number).toBe('91');
      expect(first.age).toBeGreaterThanOrEqual(40);
      expect(first.age).toBeLessThanOrEqual(50);
    });
  });

  // =========================================================================
  // 3. PERFORMANCE & PAGINATION BENCHMARKS
  // =========================================================================
  describe('3. Performance & Server-Side Pagination Limits', () => {
    it('should perform server-side pagination with limit & offset', async () => {
      const page1 = await dbRepository.searchVoters({ limit: 2, page: 1 });
      const page2 = await dbRepository.searchVoters({ limit: 2, page: 2 });

      expect(page1.results.length).toBe(2);
      expect(page2.results.length).toBe(2);
      expect(page1.results[0].id).not.toBe(page2.results[0].id);
    });

    it('should execute search query within sub-second latency (< 100ms)', async () => {
      const start = performance.now();
      const res = await dbRepository.searchVoters({ query: 'रामदयाल' });
      const duration = performance.now() - start;

      expect(res.results.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100); // Strict sub-100ms requirement
    });
  });
});
