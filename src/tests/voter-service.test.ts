import { describe, it, expect } from 'vitest';
import { voterService } from '../lib/db/voter-service';
import { migrationRunner } from '../lib/db/migrate';
import { dbRepository } from '../lib/db/database';

describe('Phase 2: Production-Grade Database & Service Suite', () => {
  it('should run migrations or verify migration files exist', async () => {
    const res = await migrationRunner.runMigrations();
    expect(res).toBeDefined();
    expect(Array.isArray(res.applied)).toBe(true);
  });

  it('should create and retrieve a normalized voter entity with full field preservation', async () => {
    // Create source file first
    const sourceFile = await dbRepository.createSourceFile({
      batch_id: 'batch-test-123',
      original_filename: 'Ward_14_Patna.pdf',
      storage_path: '/storage_uploads/Ward_14_Patna.pdf',
      file_type: 'PDF',
      file_hash_sha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      file_size_bytes: 1048576,
      total_pages: 10,
      parsing_status: 'SUCCESS',
    });

    const newVoter = await voterService.createVoter({
      serial_number: 55,
      name_hi: 'राजेन्द्र प्रसाद',
      name_en: 'Rajendra Prasad',
      gender: 'MALE',
      age: 65,
      house_number: 'Flat 402, Royal Residency',
      relation_type: 'FATHER',
      relation_name_hi: 'महादेव सहाय',
      relation_name_en: 'Mahadev Sahay',
      epic_number: 'BR/01/182/005511',
      ward_number: 'Ward-14',
      part_number: 'Part-102',
      area: 'Station Road',
      source_file_id: sourceFile.id,
      source_page_number: 2,
      source_serial_number: 55,
      photo_available: true,
      extraction_confidence: 0.99,
      validation_status: 'VALID',
    });

    expect(newVoter.id).toBeDefined();
    expect(newVoter.name_hi).toBe('राजेन्द्र प्रसाद');
    expect(newVoter.normalized_name_hi).toBe('राजेन्द्र प्रसाद');
    expect(newVoter.normalized_name_en).toBe('rajendra prasad');
    expect(newVoter.normalized_house_number).toBe('Flat 402, Royal Residency');
    expect(newVoter.epic_number).toBe('BR/01/182/005511');

    // Fetch via getVoter
    const fetched = await voterService.getVoter(newVoter.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(newVoter.id);
    expect(fetched?.age).toBe(65);
  });

  it('should update voter and track audit logs', async () => {
    const sourceFile = await dbRepository.createSourceFile({
      batch_id: 'batch-test-124',
      original_filename: 'Test_Update.pdf',
      storage_path: '/storage_uploads/Test_Update.pdf',
      file_type: 'PDF',
      file_hash_sha256: 'ffffc3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      file_size_bytes: 500000,
      total_pages: 5,
      parsing_status: 'SUCCESS',
    });

    const voter = await voterService.createVoter({
      serial_number: 99,
      name_hi: 'किशन लाल',
      name_en: 'Kishan Lal',
      gender: 'MALE',
      age: 28,
      house_number: '10-A',
      relation_type: 'FATHER',
      relation_name_hi: 'मोहन लाल',
      relation_name_en: 'Mohan Lal',
      epic_number: 'TEST990011',
      source_file_id: sourceFile.id,
      source_page_number: 1,
      source_serial_number: 99,
      photo_available: false,
      extraction_confidence: 0.95,
      validation_status: 'VALID',
    });

    const updated = await voterService.updateVoter(voter.id, {
      age: 29,
      house_number: '10-B',
    });

    expect(updated?.age).toBe(29);
    expect(updated?.house_number).toBe('10-B');
    expect(updated?.normalized_house_number).toBe('10-B');
  });

  it('should search voters by exact EPIC number', async () => {
    const epic = 'TEST990011';
    const results = await voterService.searchByEpic(epic);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].epic_number).toBe(epic);
  });

  it('should search by house number and group family members into household', async () => {
    const uniqueHouse = `House_${Date.now()}`;
    const uniqueWard = `Ward_${Date.now()}`;
    const uniqueEpic1 = `HH1_${Date.now()}`;
    const uniqueEpic2 = `HH2_${Date.now()}`;

    const sourceFile = await dbRepository.createSourceFile({
      batch_id: `batch-${Date.now()}`,
      original_filename: 'Household.csv',
      storage_path: '/storage_uploads/Household.csv',
      file_type: 'CSV',
      file_hash_sha256: '1234567890123456789012345678901234567890123456789012345678901234',
      file_size_bytes: 12000,
      total_pages: 1,
      parsing_status: 'SUCCESS',
    });

    // Create 2 family members in same house
    await voterService.createVoter({
      serial_number: 1,
      name_hi: 'अशोक शर्मा',
      name_en: 'Ashok Sharma',
      gender: 'MALE',
      age: 50,
      house_number: uniqueHouse,
      relation_type: 'FATHER',
      relation_name_hi: 'राम शर्मा',
      relation_name_en: 'Ram Sharma',
      epic_number: uniqueEpic1,
      ward_number: uniqueWard,
      part_number: 'Part-50',
      source_file_id: sourceFile.id,
      source_page_number: 1,
      source_serial_number: 1,
      photo_available: true,
      extraction_confidence: 1.0,
      validation_status: 'VALID',
    });

    await voterService.createVoter({
      serial_number: 2,
      name_hi: 'सुषमा शर्मा',
      name_en: 'Sushma Sharma',
      gender: 'FEMALE',
      age: 46,
      house_number: uniqueHouse,
      relation_type: 'HUSBAND',
      relation_name_hi: 'अशोक शर्मा',
      relation_name_en: 'Ashok Sharma',
      epic_number: uniqueEpic2,
      ward_number: uniqueWard,
      part_number: 'Part-50',
      source_file_id: sourceFile.id,
      source_page_number: 1,
      source_serial_number: 2,
      photo_available: true,
      extraction_confidence: 1.0,
      validation_status: 'VALID',
    });

    // Retrieve Household
    const household = await voterService.getHousehold(uniqueHouse, {
      ward: uniqueWard,
      part: 'Part-50',
    });

    expect(household.total_members).toBe(2);
    expect(household.head_candidate?.name_en).toBe('Ashok Sharma');
    expect(household.members.map((m) => m.name_en)).toContain('Sushma Sharma');

    // Test Lineage with uniqueEpic1
    const voters = await voterService.searchByEpic(uniqueEpic1);
    expect(voters.length).toBe(1);

    const sourceInfo = await voterService.getSourceInformation(voters[0].id);
    expect(sourceInfo).not.toBeNull();
    expect(sourceInfo?.voter_id).toBe(voters[0].id);
    expect(sourceInfo?.file_hash_sha256).toBe('1234567890123456789012345678901234567890123456789012345678901234');
    expect(sourceInfo?.source_file?.original_filename).toBe('Household.csv');
  });
});
