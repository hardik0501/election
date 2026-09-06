import { describe, it, expect, beforeEach } from 'vitest';
import path from 'path';
import { VoterDataQualityValidator } from '../lib/validation/rules';
import { DuplicateDetector } from '../lib/validation/duplicate-detector';
import { AuthService } from '../lib/security/auth';
import { SecuritySanitizer } from '../lib/security/sanitization';
import { RateLimiter } from '../lib/security/rate-limiter';
import { SecurityAuditLogger } from '../lib/security/audit';
import { dbRepository } from '../lib/db/database';
import { Voter, SourceFile } from '@/types';

describe('Phase 9: Data Quality, Security, and Audit System Suite', () => {
  beforeEach(() => {
    RateLimiter.reset();
  });

  // =========================================================================
  // 1. DATA QUALITY & VALIDATION RULES
  // =========================================================================
  describe('1. Data Quality & Multi-Field Validation Rules', () => {
    it('should validate EPIC format and flag missing or malformed EPIC numbers without deleting', () => {
      // Missing EPIC
      const res1 = VoterDataQualityValidator.validateVoterRecord({
        name_hi: 'रमेश कुमार',
        name_en: 'Ramesh Kumar',
        age: 35,
        gender: 'MALE',
        serial_number: 10,
        house_number: '12',
        ward_number: '91',
        part_number: '004',
        relation_type: 'FATHER',
        relation_name_hi: 'सुरेश कुमार',
      });
      expect(res1.isValid).toBe(false);
      expect(res1.issues.some((i) => i.field_name === 'epic_number')).toBe(true);
      expect(res1.issues[0].suggested_action).toBeDefined();

      // Valid Standard EPIC
      const res2 = VoterDataQualityValidator.validateVoterRecord({
        epic_number: 'TZV1387711',
        name_hi: 'रामदयाल',
        name_en: 'Ramdayal',
        age: 39,
        gender: 'MALE',
        serial_number: 3,
        house_number: '12',
        ward_number: '91',
        part_number: '004',
        relation_type: 'FATHER',
        relation_name_hi: 'राम प्रसाद',
      });
      expect(res2.isValid).toBe(true);
      expect(res2.suggestedStatus).toBe('VALID');
      expect(res2.issues.length).toBe(0);
    });

    it('should enforce constitutional voting age (18+) and flag underage or improbable ages', () => {
      // Underage (< 18)
      const minor = VoterDataQualityValidator.validateVoterRecord({
        epic_number: 'ABC1234567',
        name_hi: 'अमित कुमार',
        name_en: 'Amit Kumar',
        age: 16,
        gender: 'MALE',
        serial_number: 1,
        relation_type: 'FATHER',
        relation_name_hi: 'राजेश कुमार',
      });
      expect(minor.isValid).toBe(false);
      const ageIssue = minor.issues.find((i) => i.field_name === 'age');
      expect(ageIssue).toBeDefined();
      expect(ageIssue?.severity).toBe('ERROR');
      expect(ageIssue?.issue).toContain('Underage voter');

      // Extreme age (> 120)
      const extreme = VoterDataQualityValidator.validateVoterRecord({
        epic_number: 'ABC1234567',
        name_hi: 'राम स्वरूप',
        name_en: 'Ram Swaroop',
        age: 145,
        gender: 'MALE',
        serial_number: 2,
        relation_type: 'FATHER',
        relation_name_hi: 'गणेश',
      });
      expect(extreme.issues.some((i) => i.field_name === 'age' && i.severity === 'WARNING')).toBe(true);
    });

    it('should validate Gender, Serial, and Relation fields', () => {
      const invalid = VoterDataQualityValidator.validateVoterRecord({
        gender: 'UNKNOWN' as any,
        serial_number: -5,
        relation_type: 'INVALID' as any,
        relation_name_hi: '',
        name_hi: '',
        name_en: '',
      });

      expect(invalid.issues.some((i) => i.field_name === 'gender')).toBe(true);
      expect(invalid.issues.some((i) => i.field_name === 'serial_number')).toBe(true);
      expect(invalid.issues.some((i) => i.field_name === 'relation_type')).toBe(true);
      expect(invalid.issues.some((i) => i.field_name === 'name' && i.severity === 'CRITICAL')).toBe(true);
    });
  });

  // =========================================================================
  // 2. DUPLICATE DETECTION ENGINE
  // =========================================================================
  describe('2. Duplicate Detection System', () => {
    it('should detect duplicate EPIC numbers across rolls', () => {
      const voters: Voter[] = [
        {
          id: 'v1',
          serial_number: 1,
          name_hi: 'मोहन लाल',
          name_en: 'Mohan Lal',
          gender: 'MALE',
          age: 40,
          epic_number: 'XYZ9876543',
          source_file_id: 'file_01',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
        {
          id: 'v2',
          serial_number: 55,
          name_hi: 'मोहन लाल शर्मा',
          name_en: 'Mohan Lal Sharma',
          gender: 'MALE',
          age: 41,
          epic_number: 'XYZ9876543', // Same EPIC
          source_file_id: 'file_02',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
      ];

      const clusters = DuplicateDetector.detectEpicDuplicates(voters);
      expect(clusters.length).toBe(1);
      expect(clusters[0].duplicate_type).toBe('DUPLICATE_EPIC');
      expect(clusters[0].voter_ids).toContain('v1');
      expect(clusters[0].voter_ids).toContain('v2');
    });

    it('should detect duplicate serial within same source file / part', () => {
      const voters: Voter[] = [
        {
          id: 'v3',
          serial_number: 15,
          source_serial_number: 15,
          source_file_id: 'file_ward91_p4',
          name_hi: 'गीता देवी',
          name_en: 'Geeta Devi',
          epic_number: 'EPIC001',
        } as any,
        {
          id: 'v4',
          serial_number: 15, // Colliding serial in same file
          source_serial_number: 15,
          source_file_id: 'file_ward91_p4',
          name_hi: 'सीता देवी',
          name_en: 'Sita Devi',
          epic_number: 'EPIC002',
        } as any,
      ];

      const clusters = DuplicateDetector.detectSerialPartDuplicates(voters);
      expect(clusters.length).toBe(1);
      expect(clusters[0].duplicate_type).toBe('DUPLICATE_SERIAL_PART');
      expect(clusters[0].matched_attributes.serial_number).toBe(15);
    });

    it('should detect composite duplicate records without assuming same name alone is duplicate', () => {
      const voters: Voter[] = [
        // Coincidental same common name in village (Different father, house, age) -> NOT a duplicate!
        {
          id: 'v5',
          name_hi: 'सुरेश कुमार',
          name_en: 'Suresh Kumar',
          relation_name_en: 'Ramesh Kumar',
          house_number: '12',
          age: 30,
        } as any,
        {
          id: 'v6',
          name_hi: 'सुरेश कुमार',
          name_en: 'Suresh Kumar',
          relation_name_en: 'Gopal Lal', // Different father
          house_number: '99', // Different house
          age: 55, // Different age
        } as any,

        // Real duplicate candidate: Same name, same father, same house, same age
        {
          id: 'v7',
          name_hi: 'सुरेश कुमार',
          name_en: 'Suresh Kumar',
          relation_name_en: 'Ramesh Kumar',
          house_number: '12',
          age: 30,
        } as any,
      ];

      const clusters = DuplicateDetector.detectPossibleDuplicateRecords(voters);
      expect(clusters.length).toBe(1);
      expect(clusters[0].voter_ids).toContain('v5');
      expect(clusters[0].voter_ids).toContain('v7');
      expect(clusters[0].voter_ids).not.toContain('v6'); // Distinct voter preserved!
    });

    it('should detect repeated imports by identical SHA-256 hash', () => {
      const sourceFiles: SourceFile[] = [
        {
          id: 'sf1',
          batch_id: 'b1',
          original_filename: 'Roll_Part_1.pdf',
          file_hash_sha256: 'hash_abc_123_456',
        } as any,
        {
          id: 'sf2',
          batch_id: 'b2',
          original_filename: 'Roll_Part_1_Copy.pdf',
          file_hash_sha256: 'hash_abc_123_456', // Repeated upload
        } as any,
      ];

      const clusters = DuplicateDetector.detectRepeatedImports(sourceFiles);
      expect(clusters.length).toBe(1);
      expect(clusters[0].duplicate_type).toBe('REPEATED_IMPORT');
    });
  });

  // =========================================================================
  // 3. VALIDATION QUEUE RESOLUTION ACTIONS
  // =========================================================================
  describe('3. Validation Queue Resolution Actions', () => {
    it('should resolve validation error and preserve audit trail on ACCEPT and EDIT', async () => {
      const voter = await dbRepository.insertVoterRecordsBulk([
        {
          id: 'voter_val_test_01',
          serial_number: 88,
          name_hi: 'सुभाष',
          name_en: 'Subhash',
          age: 16, // Flagged
          epic_number: 'TESTEPIC88',
          validation_status: 'WARNING',
        } as any,
      ]);

      const valError = await dbRepository.createValidationError({
        voter_id: 'voter_val_test_01',
        error_code: 'UNDERAGE_VOTER',
        error_message: 'Age 16 is below constitutional limit',
        severity: 'ERROR',
      });

      // 1. Test EDIT Action (Correct age to 26)
      const edited = await dbRepository.resolveValidationError(valError.id, {
        action: 'EDIT',
        notes: 'Verified original roll indicates age 26 (OCR misread २ as १)',
        resolved_by: 'Senior Verification Officer',
      });

      expect(edited?.is_resolved).toBe(true);
      expect((edited as any).resolution.action).toBe('EDIT');

      // Update voter record age
      await dbRepository.updateVoter('voter_val_test_01', { age: 26, validation_status: 'VALID' });
      const updated = await dbRepository.getVoterById('voter_val_test_01');
      expect(updated?.age).toBe(26);
      expect(updated?.validation_status).toBe('VALID');
    });
  });

  // =========================================================================
  // 4. SECURITY, SANITIZATION & AUDIT SYSTEM
  // =========================================================================
  describe('4. Security & Vulnerability Defenses', () => {
    it('should prevent directory and path traversal attacks', () => {
      const baseDir = path.resolve(process.cwd(), 'storage_uploads');

      // Traversal attempt
      expect(() => {
        SecuritySanitizer.sanitizeSafePath(baseDir, '../../../../etc/passwd');
      }).toThrow(/traversal/i);

      expect(() => {
        SecuritySanitizer.sanitizeSafePath(baseDir, '..\\..\\windows\\win.ini');
      }).toThrow(/traversal/i);

      expect(() => {
        SecuritySanitizer.sanitizeSafePath(baseDir, 'batch_01\0/malicious.pdf');
      }).toThrow(/null byte/i);

      // Safe valid path inside base
      const safePath = SecuritySanitizer.sanitizeSafePath(baseDir, 'batch_123/document.pdf');
      expect(safePath.startsWith(baseDir)).toBe(true);
    });

    it('should inspect file magic bytes and reject spoofed or oversized uploads', () => {
      // Valid PDF buffer (%PDF-)
      const validPdf = Buffer.from('%PDF-1.4 Mock PDF Document Stream');
      const resPdf = SecuritySanitizer.validateFileMagicBytes(validPdf, 'PDF');
      expect(resPdf.isValid).toBe(true);
      expect(resPdf.detectedMime).toBe('application/pdf');

      // Fake PDF with spoofed name but executable/text content
      const fakePdf = Buffer.from('MZ\x90\x00 Executable binary spoofing as PDF');
      const resFake = SecuritySanitizer.validateFileMagicBytes(fakePdf, 'PDF');
      expect(resFake.isValid).toBe(false);
      expect(resFake.error).toContain('magic byte');

      // Oversized buffer check (> 50MB)
      const fakeOversized = { length: 55 * 1024 * 1024 } as Buffer;
      const resOversize = SecuritySanitizer.validateFileMagicBytes(fakeOversized, 'PDF');
      expect(resOversize.isValid).toBe(false);
      expect(resOversize.error).toContain('exceeds maximum permitted limit of 50MB');
    });

    it('should enforce sliding-window rate limiting on high-frequency requests', () => {
      const clientIp = '192.168.1.50';
      const limit = 5;

      for (let i = 0; i < limit; i++) {
        const check = RateLimiter.check(clientIp, limit, 60);
        expect(check.allowed).toBe(true);
      }

      // 6th request should be blocked
      const blocked = RateLimiter.check(clientIp, limit, 60);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.resetSeconds).toBeGreaterThan(0);
    });

    it('should strictly redact passwords, tokens, and authorization secrets in audit logs', async () => {
      const rawPayload = {
        email: 'officer@voterfinder.gov.in',
        password: 'SuperSecretPassword123!',
        session_token: 'bearer_eyJhbGciOi...',
        nested: {
          api_key: 'sec_key_xyz987',
          safe_field: 'Voter Name Corrected',
        },
      };

      const redacted = SecurityAuditLogger.redactSecrets(rawPayload);
      expect(redacted.password).toBe('[REDACTED_SECRET]');
      expect(redacted.session_token).toBe('[REDACTED_SECRET]');
      expect(redacted.nested.api_key).toBe('[REDACTED_SECRET]');
      expect(redacted.nested.safe_field).toBe('Voter Name Corrected');

      // Verify audit persistence with secret redaction
      const log = await SecurityAuditLogger.log({
        action: 'VOTER_EDIT',
        entity_type: 'voter',
        changes: rawPayload,
      });

      expect(log.changes?.password).toBe('[REDACTED_SECRET]');
    });

    it('should generate, verify, and enforce RBAC role permissions', () => {
      const adminSession = {
        id: 'usr_admin',
        email: 'admin@voterfinder.gov.in',
        full_name: 'System Admin',
        role: 'ADMIN' as const,
      };

      const token = AuthService.generateToken(adminSession);
      expect(token).toBeDefined();

      const decoded = AuthService.verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.role).toBe('ADMIN');

      // Admin has CAN_UPLOAD, CAN_VALIDATE, CAN_DELETE_VOTER
      expect(AuthService.hasPermission(decoded, 'CAN_UPLOAD')).toBe(true);
      expect(AuthService.hasPermission(decoded, 'CAN_VALIDATE')).toBe(true);
      expect(AuthService.hasPermission(decoded, 'CAN_DELETE_VOTER')).toBe(true);

      // Viewer only has CAN_SEARCH and CAN_VIEW_SOURCE
      const viewerToken = AuthService.generateToken({
        id: 'usr_viewer',
        email: 'viewer@voterfinder.gov.in',
        full_name: 'Public Viewer',
        role: 'VIEWER',
      });
      const viewerDecoded = AuthService.verifyToken(viewerToken);
      expect(AuthService.hasPermission(viewerDecoded, 'CAN_SEARCH')).toBe(true);
      expect(AuthService.hasPermission(viewerDecoded, 'CAN_DELETE_VOTER')).toBe(false);
      expect(AuthService.hasPermission(viewerDecoded, 'CAN_VALIDATE')).toBe(false);
    });
  });
});
