import { Voter, ValidationError, Gender, RelationType, ValidationStatus } from '@/types';
import crypto from 'crypto';

export interface ValidationIssue {
  id: string;
  voter_id: string;
  source_file_id: string;
  file_name?: string;
  page_number: number;
  serial_number: number;
  field_name: 'epic_number' | 'age' | 'gender' | 'serial_number' | 'house_number' | 'ward_number' | 'part_number' | 'relation_type' | 'relation_name' | 'name';
  current_value: string | number | null;
  original_extracted_value?: string | number | null;
  confidence: number;
  issue: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  suggested_action: string;
  is_resolved: boolean;
  resolution?: {
    action: 'ACCEPT' | 'EDIT' | 'REJECT_RECORD' | 'MARK_REVIEWED';
    resolved_by?: string;
    resolved_at: string;
    notes?: string;
    previous_value?: any;
    new_value?: any;
  } | null;
  created_at: string;
}

export class VoterDataQualityValidator {
  /**
   * Run comprehensive validation rules across all required electoral roll fields.
   * Does NOT delete records; flags issues for human/administrative verification.
   */
  public static validateVoterRecord(
    voter: Partial<Voter>,
    context?: {
      source_file_name?: string;
      raw_extracted_text?: string;
    }
  ): {
    isValid: boolean;
    suggestedStatus: ValidationStatus;
    issues: ValidationIssue[];
  } {
    const issues: ValidationIssue[] = [];
    const now = new Date().toISOString();
    const voterId = voter.id || crypto.randomUUID();
    const sourceFileId = voter.source_file_id || 'unknown_file';
    const pageNum = voter.source_page_number || 1;
    const serialNum = voter.source_serial_number || voter.serial_number || 1;

    // 1. EPIC Validation
    const epic = voter.epic_number?.trim();
    if (!epic) {
      issues.push({
        id: crypto.randomUUID(),
        voter_id: voterId,
        source_file_id: sourceFileId,
        file_name: context?.source_file_name,
        page_number: pageNum,
        serial_number: serialNum,
        field_name: 'epic_number',
        current_value: null,
        original_extracted_value: (voter as any).raw_extracted_data?.raw_epic || null,
        confidence: 0.5,
        issue: 'EPIC / Voter ID number is missing from electoral entry',
        severity: 'WARNING',
        suggested_action: 'Verify original document page for handwritten or obscured EPIC card number.',
        is_resolved: false,
        created_at: now,
      });
    } else {
      // Standard formats: 3 Letters + 7 Digits (e.g. TZV1387711) or state slash format (e.g. RJ/01/023/123456)
      const isStandard10 = /^[A-Z]{3}[0-9]{7}$/i.test(epic);
      const isSlashFormat = /^[A-Z]{2,4}\/[0-9/]{3,12}$/i.test(epic);
      const isLegacyNumeric = /^[0-9]{6,12}$/.test(epic);

      if (!isStandard10 && !isSlashFormat && !isLegacyNumeric) {
        issues.push({
          id: crypto.randomUUID(),
          voter_id: voterId,
          source_file_id: sourceFileId,
          file_name: context?.source_file_name,
          page_number: pageNum,
          serial_number: serialNum,
          field_name: 'epic_number',
          current_value: epic,
          original_extracted_value: (voter as any).raw_extracted_data?.raw_epic || epic,
          confidence: 0.7,
          issue: `Non-standard EPIC format: "${epic}"`,
          severity: 'WARNING',
          suggested_action: 'Check for OCR character confusion (e.g. 0 vs O, 1 vs I) in original document.',
          is_resolved: false,
          created_at: now,
        });
      }
    }

    // 2. Age Validation
    const age = voter.age;
    if (age === undefined || age === null || isNaN(age)) {
      issues.push({
        id: crypto.randomUUID(),
        voter_id: voterId,
        source_file_id: sourceFileId,
        file_name: context?.source_file_name,
        page_number: pageNum,
        serial_number: serialNum,
        field_name: 'age',
        current_value: null,
        original_extracted_value: (voter as any).raw_extracted_data?.raw_age || null,
        confidence: 0.4,
        issue: 'Age field is missing or could not be parsed',
        severity: 'WARNING',
        suggested_action: 'Enter voter age from original roll page.',
        is_resolved: false,
        created_at: now,
      });
    } else if (age < 18) {
      issues.push({
        id: crypto.randomUUID(),
        voter_id: voterId,
        source_file_id: sourceFileId,
        file_name: context?.source_file_name,
        page_number: pageNum,
        serial_number: serialNum,
        field_name: 'age',
        current_value: age,
        original_extracted_value: (voter as any).raw_extracted_data?.raw_age || age,
        confidence: 0.85,
        issue: `Underage voter recorded: ${age} years (Constitutional voting age is 18+)`,
        severity: 'ERROR',
        suggested_action: 'Verify whether OCR misread Devanagari numerals or birth eligibility date.',
        is_resolved: false,
        created_at: now,
      });
    } else if (age > 120) {
      issues.push({
        id: crypto.randomUUID(),
        voter_id: voterId,
        source_file_id: sourceFileId,
        file_name: context?.source_file_name,
        page_number: pageNum,
        serial_number: serialNum,
        field_name: 'age',
        current_value: age,
        original_extracted_value: (voter as any).raw_extracted_data?.raw_age || age,
        confidence: 0.6,
        issue: `Statistically improbable age: ${age} years`,
        severity: 'WARNING',
        suggested_action: 'Verify OCR reading against original electoral roll block.',
        is_resolved: false,
        created_at: now,
      });
    }

    // 3. Gender Validation
    const gender = voter.gender;
    const validGenders: Gender[] = ['MALE', 'FEMALE', 'OTHER'];
    if (!gender || !validGenders.includes(gender)) {
      issues.push({
        id: crypto.randomUUID(),
        voter_id: voterId,
        source_file_id: sourceFileId,
        file_name: context?.source_file_name,
        page_number: pageNum,
        serial_number: serialNum,
        field_name: 'gender',
        current_value: gender || 'UNKNOWN',
        original_extracted_value: (voter as any).raw_extracted_data?.raw_gender || null,
        confidence: 0.5,
        issue: `Unrecognized or missing gender: "${gender || 'EMPTY'}"`,
        severity: 'WARNING',
        suggested_action: 'Assign correct gender (पुरुष / महिला / अन्य).',
        is_resolved: false,
        created_at: now,
      });
    }

    // 4. Serial Number Validation
    const serial = voter.source_serial_number || voter.serial_number;
    if (!serial || serial <= 0 || !Number.isInteger(serial)) {
      issues.push({
        id: crypto.randomUUID(),
        voter_id: voterId,
        source_file_id: sourceFileId,
        file_name: context?.source_file_name,
        page_number: pageNum,
        serial_number: serial || 0,
        field_name: 'serial_number',
        current_value: serial || null,
        confidence: 0.5,
        issue: 'Invalid or missing roll serial number',
        severity: 'ERROR',
        suggested_action: 'Assign correct sequential roll serial number.',
        is_resolved: false,
        created_at: now,
      });
    }

    // 5. House Number Validation
    const houseNo = voter.house_number?.trim();
    if (!houseNo || houseNo === '-' || houseNo === '0') {
      issues.push({
        id: crypto.randomUUID(),
        voter_id: voterId,
        source_file_id: sourceFileId,
        file_name: context?.source_file_name,
        page_number: pageNum,
        serial_number: serialNum,
        field_name: 'house_number',
        current_value: houseNo || null,
        original_extracted_value: (voter as any).raw_extracted_data?.raw_house || null,
        confidence: 0.6,
        issue: 'House / Door number missing or blank',
        severity: 'INFO',
        suggested_action: 'Confirm if house number was omitted in original roll or obscured by stamp.',
        is_resolved: false,
        created_at: now,
      });
    }

    // 6. Ward & Part Number Validation
    if (!voter.part_number && !voter.ward_number) {
      issues.push({
        id: crypto.randomUUID(),
        voter_id: voterId,
        source_file_id: sourceFileId,
        file_name: context?.source_file_name,
        page_number: pageNum,
        serial_number: serialNum,
        field_name: 'part_number',
        current_value: null,
        confidence: 0.6,
        issue: 'Missing Part Number and Ward Number hierarchy linkage',
        severity: 'WARNING',
        suggested_action: 'Assign Part / Ward from header metadata.',
        is_resolved: false,
        created_at: now,
      });
    }

    // 7. Relation Type & Relative Name
    const relType = voter.relation_type;
    const relName = voter.relation_name_hi || voter.relation_name_en;
    const validRelTypes: RelationType[] = ['FATHER', 'HUSBAND', 'MOTHER', 'OTHER'];
    if (!relType || !validRelTypes.includes(relType)) {
      issues.push({
        id: crypto.randomUUID(),
        voter_id: voterId,
        source_file_id: sourceFileId,
        file_name: context?.source_file_name,
        page_number: pageNum,
        serial_number: serialNum,
        field_name: 'relation_type',
        current_value: relType || null,
        confidence: 0.6,
        issue: 'Unclear or missing relation type (Father/Husband/Mother/Other)',
        severity: 'WARNING',
        suggested_action: 'Set relation type to FATHER, HUSBAND, MOTHER, or OTHER.',
        is_resolved: false,
        created_at: now,
      });
    }

    if (!relName || relName.trim() === '') {
      issues.push({
        id: crypto.randomUUID(),
        voter_id: voterId,
        source_file_id: sourceFileId,
        file_name: context?.source_file_name,
        page_number: pageNum,
        serial_number: serialNum,
        field_name: 'relation_name',
        current_value: null,
        confidence: 0.5,
        issue: 'Relative name is missing',
        severity: 'WARNING',
        suggested_action: 'Verify relative name from document block.',
        is_resolved: false,
        created_at: now,
      });
    }

    // 8. Voter Name
    const nameHi = voter.name_hi?.trim();
    const nameEn = voter.name_en?.trim();
    if (!nameHi && !nameEn) {
      issues.push({
        id: crypto.randomUUID(),
        voter_id: voterId,
        source_file_id: sourceFileId,
        file_name: context?.source_file_name,
        page_number: pageNum,
        serial_number: serialNum,
        field_name: 'name',
        current_value: null,
        confidence: 0.2,
        issue: 'Critical: Voter Name is completely blank',
        severity: 'CRITICAL',
        suggested_action: 'Enter voter name or inspect document card boundary.',
        is_resolved: false,
        created_at: now,
      });
    }

    // Determine overall status
    let suggestedStatus: ValidationStatus = 'VALID';
    const hasCritical = issues.some((i) => i.severity === 'CRITICAL');
    const hasError = issues.some((i) => i.severity === 'ERROR');
    const hasWarning = issues.some((i) => i.severity === 'WARNING');

    if (hasCritical || hasError || hasWarning) {
      suggestedStatus = 'WARNING';
    }

    return {
      isValid: issues.filter((i) => i.severity !== 'INFO').length === 0,
      suggestedStatus,
      issues,
    };
  }
}
