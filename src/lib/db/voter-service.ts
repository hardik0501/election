import crypto from 'crypto';
import {
  Voter,
  SearchQueryFilters,
  SearchResultItem,
  SearchResponse,
  HouseholdGroup,
  VoterSourceInfo,
  AuditLog,
  ValidationError,
  Gender,
  RelationType,
  ValidationStatus,
} from '@/types';
import { dbRepository } from './database';
import { normalizeEnglish, normalizeEpic, normalizeHindi, normalizeHouseNumber } from '../nlp/normalization';
import { expandSearchQuery, transliterateEnglishToHindi, transliterateHindiToEnglish } from '../nlp/transliteration';

export class VoterService {
  /**
   * 1. Create a new Voter record
   */
  public async createVoter(
    data: Omit<Voter, 'id' | 'created_at' | 'updated_at' | 'normalized_name_hi' | 'normalized_name_en' | 'normalized_house_number' | 'normalized_relation_name_hi' | 'normalized_relation_name_en'> & {
      id?: string;
      normalized_name_hi?: string;
      normalized_name_en?: string;
      normalized_house_number?: string;
      normalized_relation_name_hi?: string;
      normalized_relation_name_en?: string;
    }
  ): Promise<Voter> {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const nameHi = data.name_hi || (data.name_en ? (transliterateEnglishToHindi(data.name_en)[0] || data.name_en) : '');
    const nameEn = data.name_en || (data.name_hi ? transliterateHindiToEnglish(data.name_hi) : '');

    const normNameHi = data.normalized_name_hi || normalizeHindi(nameHi);
    const normNameEn = data.normalized_name_en || normalizeEnglish(nameEn);

    const houseNo = data.house_number ? String(data.house_number).trim() : null;
    const normHouseNo = data.normalized_house_number || (houseNo ? normalizeHouseNumber(houseNo) : null);

    const relNameHi = data.relation_name_hi || (data.relation_name_en ? (transliterateEnglishToHindi(data.relation_name_en)[0] || data.relation_name_en) : null);
    const relNameEn = data.relation_name_en || (data.relation_name_hi ? transliterateHindiToEnglish(data.relation_name_hi) : null);

    const normRelHi = data.normalized_relation_name_hi || (relNameHi ? normalizeHindi(relNameHi) : null);
    const normRelEn = data.normalized_relation_name_en || (relNameEn ? normalizeEnglish(relNameEn) : null);

    const epic = normalizeEpic(data.epic_number);

    const voter: Voter = {
      id,
      serial_number: data.serial_number || 1,
      name_hi: nameHi,
      name_en: nameEn,
      normalized_name_hi: normNameHi,
      normalized_name_en: normNameEn,
      gender: data.gender || 'UNKNOWN',
      age: data.age ?? null,
      house_number: houseNo,
      normalized_house_number: normHouseNo,
      relation_type: data.relation_type || 'UNKNOWN',
      relation_name_hi: relNameHi,
      relation_name_en: relNameEn,
      normalized_relation_name_hi: normRelHi,
      normalized_relation_name_en: normRelEn,
      epic_number: epic || null,
      ward_number: data.ward_number ? String(data.ward_number) : null,
      part_number: data.part_number ? String(data.part_number) : null,
      area: data.area || null,
      election_id: data.election_id || null,
      constituency_id: data.constituency_id || null,
      source_file_id: data.source_file_id,
      source_page_number: data.source_page_number || 1,
      source_serial_number: data.source_serial_number || data.serial_number || 1,
      photo_available: data.photo_available ?? false,
      extraction_confidence: data.extraction_confidence ?? 1.0,
      validation_status: data.validation_status || (epic ? 'VALID' : 'WARNING'),
      created_at: now,
      updated_at: now,

      // UI Aliases
      name_hindi: nameHi,
      name_english: nameEn,
      relation_name_hindi: relNameHi,
      relation_name_english: relNameEn,
      normalized_name: normNameEn,
    };

    await dbRepository.insertVoterRecordsBulk([voter as any]);
    await this.logAudit({
      action: 'VOTER_CREATED',
      entity_type: 'voter',
      entity_id: voter.id,
      changes: { voter_id: voter.id, epic: voter.epic_number, name: voter.name_en },
    });

    return voter;
  }

  /**
   * 2. Update an existing Voter record
   */
  public async updateVoter(id: string, updates: Partial<Voter>): Promise<Voter | null> {
    const existing = await this.getVoter(id);
    if (!existing) return null;

    const nameHi = updates.name_hi !== undefined ? updates.name_hi : existing.name_hi;
    const nameEn = updates.name_en !== undefined ? updates.name_en : existing.name_en;

    const houseNo = updates.house_number !== undefined ? updates.house_number : existing.house_number;
    const normHouseNo = houseNo ? normalizeHouseNumber(houseNo) : null;

    const updatedVoter: Voter = {
      ...existing,
      ...updates,
      name_hi: nameHi,
      name_en: nameEn,
      normalized_name_hi: normalizeHindi(nameHi),
      normalized_name_en: normalizeEnglish(nameEn),
      house_number: houseNo,
      normalized_house_number: normHouseNo,
      epic_number: updates.epic_number !== undefined ? normalizeEpic(updates.epic_number) : existing.epic_number,
      updated_at: new Date().toISOString(),

      // Aliases
      name_hindi: nameHi,
      name_english: nameEn,
      relation_name_hindi: updates.relation_name_hi !== undefined ? updates.relation_name_hi : existing.relation_name_hi,
      relation_name_english: updates.relation_name_en !== undefined ? updates.relation_name_en : existing.relation_name_en,
    };

    await dbRepository.updateVoter(id, updatedVoter as any);
    await this.logAudit({
      action: 'VOTER_UPDATED',
      entity_type: 'voter',
      entity_id: id,
      changes: updates,
    });

    return updatedVoter;
  }

  /**
   * 3. Get Voter by ID
   */
  public async getVoter(id: string): Promise<Voter | null> {
    const voter = await dbRepository.getVoterById(id);
    if (!voter) return null;
    return this.ensureVoterNormalizedFields(voter as any);
  }

  /**
   * 4. Search Voters with multi-lingual, compound and fuzzy options
   */
  public async searchVoters(filters: SearchQueryFilters): Promise<SearchResponse> {
    return dbRepository.searchVoters(filters);
  }

  /**
   * 5. Search specifically by EPIC Number (Exact / Prefix)
   */
  public async searchByEpic(epic: string): Promise<Voter[]> {
    const normEpic = normalizeEpic(epic);
    if (!normEpic) return [];

    const res = await dbRepository.searchVoters({
      epic: normEpic,
      search_mode: 'exact',
      limit: 50,
    });

    return res.results.map((r) => this.ensureVoterNormalizedFields(r));
  }

  /**
   * 6. Search by House Number
   */
  public async searchByHouseNumber(
    houseNo: string,
    filters: Omit<SearchQueryFilters, 'house_no'> = {}
  ): Promise<Voter[]> {
    const normHouseNo = normalizeHouseNumber(houseNo);
    const res = await dbRepository.searchVoters({
      ...filters,
      house_no: normHouseNo,
      limit: 100,
    });
    return res.results.map((r) => this.ensureVoterNormalizedFields(r));
  }

  /**
   * 7. Get Household Group (All voters co-residing in the same house)
   */
  public async getHousehold(
    houseNumber: string,
    wardOrPart?: { ward?: string; part?: string }
  ): Promise<HouseholdGroup> {
    const normHouseNo = normalizeHouseNumber(houseNumber);
    const searchRes = await dbRepository.searchVoters({
      house_no: normHouseNo,
      ward: wardOrPart?.ward,
      part_no: wardOrPart?.part,
      limit: 100,
      sort_by: 'serial_number',
      sort_order: 'asc',
    });

    const members = searchRes.results.map((r) => this.ensureVoterNormalizedFields(r));

    // Determine candidate head of household (oldest male/female adult)
    let headCandidate: Voter | null = null;
    let maxAge = 0;
    for (const member of members) {
      if (member.age && member.age > maxAge) {
        maxAge = member.age;
        headCandidate = member;
      }
    }

    return {
      house_number: houseNumber,
      normalized_house_number: normHouseNo,
      part_number: wardOrPart?.part || (members[0]?.part_number ?? null),
      ward_number: wardOrPart?.ward || (members[0]?.ward_number ?? null),
      members,
      total_members: members.length,
      head_candidate: headCandidate || members[0] || null,
    };
  }

  /**
   * 8. Get Source Information & Cryptographic Provenance
   */
  public async getSourceInformation(voterId: string): Promise<VoterSourceInfo | null> {
    const voter = await this.getVoter(voterId);
    if (!voter) return null;

    const sourceFile = await dbRepository.getSourceFileById(voter.source_file_id);
    const batch = sourceFile ? await dbRepository.getBatchById(sourceFile.batch_id) : null;
    const validationErrors = await this.getValidationErrors(voterId);

    return {
      voter_id: voter.id,
      source_file: sourceFile,
      batch,
      page_number: voter.source_page_number,
      source_serial: voter.source_serial_number,
      file_hash_sha256: sourceFile?.file_hash_sha256 || null,
      storage_path: sourceFile?.storage_path || null,
      extraction_result: {
        id: crypto.randomUUID(),
        source_file_id: voter.source_file_id,
        page_number: voter.source_page_number,
        raw_text: JSON.stringify(voter.raw_extracted_data || {}),
        ocr_engine: 'digital_text_layer',
        confidence: voter.extraction_confidence,
        created_at: voter.created_at,
      },
      validation_errors: validationErrors,
    };
  }

  /**
   * 9. Log Audit Entry
   */
  public async logAudit(entry: {
    user_id?: string | null;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    changes?: Record<string, any>;
    ip_address?: string | null;
  }): Promise<AuditLog> {
    const log: AuditLog = {
      id: crypto.randomUUID(),
      user_id: entry.user_id || null,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || null,
      changes: entry.changes || {},
      ip_address: entry.ip_address || null,
      created_at: new Date().toISOString(),
    };

    await dbRepository.recordAuditLog(log);
    return log;
  }

  /**
   * 10. Get Validation Errors for a voter
   */
  public async getValidationErrors(voterId: string): Promise<ValidationError[]> {
    return dbRepository.getValidationErrorsByVoterId(voterId);
  }

  /**
   * Helper: Ensure backward/forward compatibility between camelCase, snake_case, and Phase 2 fields
   */
  private ensureVoterNormalizedFields(raw: any): Voter {
    const nameHi = raw.name_hi || raw.name_hindi || '';
    const nameEn = raw.name_en || raw.name_english || '';
    const relNameHi = raw.relation_name_hi || raw.relation_name_hindi || null;
    const relNameEn = raw.relation_name_en || raw.relation_name_english || null;
    const houseNo = raw.house_number || null;

    return {
      id: raw.id,
      serial_number: raw.serial_number || raw.source_serial_number || 1,
      name_hi: nameHi,
      name_en: nameEn,
      normalized_name_hi: raw.normalized_name_hi || normalizeHindi(nameHi),
      normalized_name_en: raw.normalized_name_en || normalizeEnglish(nameEn),
      gender: raw.gender || 'UNKNOWN',
      age: raw.age ?? null,
      house_number: houseNo,
      normalized_house_number: raw.normalized_house_number || (houseNo ? normalizeHouseNumber(houseNo) : null),
      relation_type: raw.relation_type || 'UNKNOWN',
      relation_name_hi: relNameHi,
      relation_name_en: relNameEn,
      normalized_relation_name_hi: raw.normalized_relation_name_hi || (relNameHi ? normalizeHindi(relNameHi) : null),
      normalized_relation_name_en: raw.normalized_relation_name_en || (relNameEn ? normalizeEnglish(relNameEn) : null),
      epic_number: raw.epic_number || null,
      ward_number: raw.ward_number || null,
      part_number: raw.part_number || null,
      area: raw.area || raw.section_name || null,
      election_id: raw.election_id || null,
      constituency_id: raw.constituency_id || null,
      source_file_id: raw.source_file_id,
      source_page_number: raw.source_page_number || 1,
      source_serial_number: raw.source_serial_number || 1,
      photo_available: Boolean(raw.photo_available),
      extraction_confidence: raw.extraction_confidence ?? 1.0,
      validation_status: raw.validation_status || 'VALID',
      created_at: raw.created_at || new Date().toISOString(),
      updated_at: raw.updated_at || new Date().toISOString(),

      // Aliases
      name_hindi: nameHi,
      name_english: nameEn,
      relation_name_hindi: relNameHi,
      relation_name_english: relNameEn,
      normalized_name: raw.normalized_name || normalizeEnglish(nameEn),
      assembly_constituency: raw.assembly_constituency,
      district: raw.district,
      state: raw.state,
      raw_extracted_data: raw.raw_extracted_data,
      batch_id: raw.batch_id,
    };
  }
}

export const voterService = new VoterService();
