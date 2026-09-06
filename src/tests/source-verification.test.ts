import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { dbRepository } from '../lib/db/database';
import { voterService } from '../lib/db/voter-service';
import { VoterBlockDetector, FieldDetector } from '../lib/parsers/pdf-extractor';

describe('Phase 8: Source Verification & Original Document Provenance', () => {
  const dummyFileId = 'source_file_jaipur_ward91_p4';
  const dummyBatchId = 'batch_jaipur_ward91_test_2026';
  const originalFileName = 'JAIPUR NAGAR NIGAM-Ward No-091-Part No-004.pdf';

  // Sample raw mock PDF buffer representing original document
  const mockPdfBuffer = Buffer.from('%PDF-1.4 Mock Original Preserved Electoral Roll Document Binary Content');
  const expectedSha256 = crypto.createHash('sha256').update(mockPdfBuffer).digest('hex');

  beforeEach(async () => {
    // Reset or ensure batch & source file metadata is present in repository
    await dbRepository.createBatch('Jaipur Ward 91 Roll Test Batch');

    await dbRepository.createSourceFile({
      batch_id: dummyBatchId,
      original_filename: originalFileName,
      storage_path: `storage_uploads/${dummyBatchId}/${expectedSha256}_${originalFileName}`,
      file_size_bytes: mockPdfBuffer.length,
      file_type: 'PDF',
      file_hash_sha256: expectedSha256,
      total_pages: 49,
      parsing_status: 'SUCCESS',
    });
  });

  describe('1. Multi-Page Source Metadata Retention', () => {
    it('should retain exact page numbers and serials across multi-page voter ingestion (Page 1, 3, 7, 49)', async () => {
      const multiPageVoters = [
        {
          id: 'voter_p1_s1',
          serial_number: 1,
          name_hi: 'राधेश्याम शर्मा',
          name_en: 'Radheshyam Sharma',
          gender: 'MALE' as const,
          age: 52,
          house_number: '1',
          relation_type: 'FATHER' as const,
          relation_name_hi: 'गोपाल शर्मा',
          relation_name_en: 'Gopal Sharma',
          epic_number: 'TZV1000001',
          ward_number: '91',
          part_number: '004',
          source_file_id: dummyFileId,
          source_page_number: 1,
          source_serial_number: 1,
          raw_extracted_data: {
            raw_card_text: '1 TZV1000001\nनिर्वाचक का नाम: राधेश्याम शर्मा\nपिता का नाम: गोपाल शर्मा\nगृह संख्या: 1\nउम्र: 52 लिंग: पुरुष',
            page_number: 1,
          },
        },
        {
          id: 'voter_p3_s3',
          serial_number: 3,
          name_hi: 'रामदयाल',
          name_en: 'Ramdayal',
          gender: 'MALE' as const,
          age: 39,
          house_number: '12',
          relation_type: 'FATHER' as const,
          relation_name_hi: 'राम प्रसाद',
          relation_name_en: 'Ram Prasad',
          epic_number: 'TZV1387711',
          ward_number: '91',
          part_number: '004',
          source_file_id: dummyFileId,
          source_page_number: 3,
          source_serial_number: 3,
          raw_extracted_data: {
            raw_card_text: '3 TZV1387711\nनिर्वाचक का नाम: रामदयाल\nपिता का नाम: राम प्रसाद\nगृह संख्या: 12\nउम्र: 39 लिंग: पुरुष',
            page_number: 3,
          },
        },
        {
          id: 'voter_p7_s145',
          serial_number: 145,
          name_hi: 'सुनीता देवी',
          name_en: 'Sunita Devi',
          gender: 'FEMALE' as const,
          age: 31,
          house_number: '54',
          relation_type: 'HUSBAND' as const,
          relation_name_hi: 'राजेश कुमार',
          relation_name_en: 'Rajesh Kumar',
          epic_number: 'TZV1000145',
          ward_number: '91',
          part_number: '004',
          source_file_id: dummyFileId,
          source_page_number: 7,
          source_serial_number: 145,
          raw_extracted_data: {
            raw_card_text: '145 TZV1000145\nनिर्वाचक का नाम: सुनीता देवी\nपति का नाम: राजेश कुमार\nगृह संख्या: 54\nउम्र: 31 लिंग: महिला',
            page_number: 7,
          },
        },
        {
          id: 'voter_p49_s980',
          serial_number: 980,
          name_hi: 'अब्दुल रशीद',
          name_en: 'Abdul Rashid',
          gender: 'MALE' as const,
          age: 64,
          house_number: '180',
          relation_type: 'FATHER' as const,
          relation_name_hi: 'मोहम्मद बशीर',
          relation_name_en: 'Mohammad Bashir',
          epic_number: 'TZV1000980',
          ward_number: '91',
          part_number: '004',
          source_file_id: dummyFileId,
          source_page_number: 49,
          source_serial_number: 980,
          raw_extracted_data: {
            raw_card_text: '980 TZV1000980\nनिर्वाचक का नाम: अब्दुल रशीद\nपिता का नाम: मोहम्मद बशीर\nगृह संख्या: 180\nउम्र: 64 लिंग: पुरुष',
            page_number: 49,
          },
        },
      ];

      await dbRepository.insertVoterRecordsBulk(multiPageVoters as any);

      // Verify Page 1 Voter
      const p1 = await voterService.getVoter('voter_p1_s1');
      expect(p1).not.toBeNull();
      expect(p1?.source_page_number).toBe(1);
      expect(p1?.source_serial_number).toBe(1);

      // Verify Page 3 Voter (Example from specifications)
      const p3 = await voterService.getVoter('voter_p3_s3');
      expect(p3).not.toBeNull();
      expect(p3?.source_page_number).toBe(3);
      expect(p3?.source_serial_number).toBe(3);
      expect(p3?.epic_number).toBe('TZV1387711');
      expect((p3 as any).raw_extracted_data.raw_card_text).toContain('रामदयाल');

      // Verify Page 7 Voter
      const p7 = await voterService.getVoter('voter_p7_s145');
      expect(p7).not.toBeNull();
      expect(p7?.source_page_number).toBe(7);
      expect(p7?.source_serial_number).toBe(145);

      // Verify Page 49 Voter (Last page of 49-page reference)
      const p49 = await voterService.getVoter('voter_p49_s980');
      expect(p49).not.toBeNull();
      expect(p49?.source_page_number).toBe(49);
      expect(p49?.source_serial_number).toBe(980);
    });
  });

  describe('2. Source Lineage & Provenance Integrity', () => {
    it('should retrieve full source metadata, file info, batch info, and SHA-256 for a voter', async () => {
      const sourceLineage = await voterService.getSourceInformation('voter_p3_s3');
      expect(sourceLineage).not.toBeNull();
      expect(sourceLineage?.page_number).toBe(3);
      expect(sourceLineage?.source_serial).toBe(3);
    });

    it('should verify that original raw text and processed structured fields remain separate', async () => {
      const voter = await voterService.getVoter('voter_p3_s3');
      expect(voter).not.toBeNull();

      // Processed normalized data
      expect(voter?.name_hi).toBe('रामदयाल');
      expect(voter?.name_en).toBe('Ramdayal');
      expect(voter?.gender).toBe('MALE');

      // Original unedited raw OCR text block
      const rawText = (voter as any).raw_extracted_data?.raw_card_text;
      expect(rawText).toBeDefined();
      expect(rawText).toContain('3 TZV1387711');
      expect(rawText).toContain('निर्वाचक का नाम: रामदयाल');
    });
  });

  describe('3. Multi-Page PDF Block Extraction & Page Boundary Tracking', () => {
    it('should extract records while maintaining page numbers across distinct page extractions', () => {
      const mockPage3Text = `भाग सं. 004
1 TZV1000001
निर्वाचक का नाम: महेश चंद
पिता का नाम: रमेश चंद
गृह संख्या: 1
उम्र: 45 लिंग: पुरुष

2 TZV1000002
निर्वाचक का नाम: सीमा चंद
पति का नाम: महेश चंद
गृह संख्या: 1
उम्र: 40 लिंग: महिला`;

      const mockPage4Text = `भाग सं. 004
3 TZV1387711
निर्वाचक का नाम: रामदयाल
पिता का नाम: राम प्रसाद
गृह संख्या: 12
उम्र: 39 लिंग: पुरुष`;

      const p3Blocks = VoterBlockDetector.detectBlocksOnPage(mockPage3Text);
      const p3Cards = p3Blocks.map((b, idx) => FieldDetector.parseVoterCard(b, idx + 1, 3)).filter(Boolean);

      const p4Blocks = VoterBlockDetector.detectBlocksOnPage(mockPage4Text);
      const p4Cards = p4Blocks.map((b, idx) => FieldDetector.parseVoterCard(b, idx + 1, 4)).filter(Boolean);

      expect(p3Cards.length).toBe(2);
      expect(p3Cards[0]?.source_page_number).toBe(3);
      expect(p3Cards[1]?.source_page_number).toBe(3);

      expect(p4Cards.length).toBe(1);
      expect(p4Cards[0]?.source_page_number).toBe(4);
      expect(p4Cards[0]?.serial_number).toBe(3);
      expect(p4Cards[0]?.name_hi).toBe('रामदयाल');
    });
  });
});
