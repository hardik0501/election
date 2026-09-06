import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  ImportBatch,
  SourceFile,
  Voter,
  SearchQueryFilters,
  SearchResultItem,
  SearchResponse,
  SystemStats,
  AuditLog,
  ValidationError,
  ExtractionResult,
  Election,
  Constituency,
  Ward,
  Part,
  Area,
  Role,
  User,
} from '@/types';
import { expandSearchQuery, transliterateHindiToEnglish } from '../nlp/transliteration';
import { normalizeEnglish, normalizeEpic, normalizeHindi, normalizeHouseNumber } from '../nlp/normalization';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_STORE_FILE = path.join(DATA_DIR, 'voter_store.json');

interface DatabaseStore {
  roles: Role[];
  users: User[];
  elections: Election[];
  constituencies: Constituency[];
  wards: Ward[];
  parts: Part[];
  areas: Area[];
  batches: ImportBatch[];
  source_files: SourceFile[];
  voters: Voter[];
  voter_relations: any[];
  extraction_results: ExtractionResult[];
  validation_errors: ValidationError[];
  audit_logs: AuditLog[];
  search_logs: {
    id: string;
    query_text?: string;
    query_filters?: any;
    result_count: number;
    execution_time_ms: number;
    created_at: string;
  }[];
}

export class DatabaseRepository {
  private memoryStore: DatabaseStore = {
    roles: [],
    users: [],
    elections: [],
    constituencies: [],
    wards: [],
    parts: [],
    areas: [],
    batches: [],
    source_files: [],
    voters: [],
    voter_relations: [],
    extraction_results: [],
    validation_errors: [],
    audit_logs: [],
    search_logs: [],
  };

  private isLoaded = false;

  constructor() {
    this.ensureDataDir();
    this.loadStore();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadStore() {
    if (this.isLoaded) return;
    try {
      this.ensureDataDir();
      if (fs.existsSync(DB_STORE_FILE)) {
        const raw = fs.readFileSync(DB_STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.memoryStore = {
          roles: parsed.roles || [],
          users: parsed.users || [],
          elections: parsed.elections || [],
          constituencies: parsed.constituencies || [],
          wards: parsed.wards || [],
          parts: parsed.parts || [],
          areas: parsed.areas || [],
          batches: parsed.batches || [],
          source_files: parsed.source_files || [],
          voters: (parsed.voters || []).map((v: any) => this.mapToVoter(v)),
          voter_relations: parsed.voter_relations || [],
          extraction_results: parsed.extraction_results || [],
          validation_errors: parsed.validation_errors || [],
          audit_logs: parsed.audit_logs || [],
          search_logs: parsed.search_logs || [],
        };
      } else {
        this.memoryStore = {
          roles: [],
          users: [],
          elections: [],
          constituencies: [],
          wards: [],
          parts: [],
          areas: [],
          batches: [],
          source_files: [],
          voters: [],
          voter_relations: [],
          extraction_results: [],
          validation_errors: [],
          audit_logs: [],
          search_logs: [],
        };
        this.saveStore();
      }
      this.isLoaded = true;
    } catch (e) {
      console.error('Error reading voter_store.json:', e);
    }
  }

  private saveStore() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(DB_STORE_FILE, JSON.stringify(this.memoryStore, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving voter_store.json:', e);
    }
  }

  private mapToVoter(raw: any): Voter {
    const nameHi = raw.name_hi || raw.name_hindi || '';
    const nameEn = raw.name_en || raw.name_english || (nameHi ? transliterateHindiToEnglish(nameHi) : '');
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
      source_serial_number: raw.source_serial_number || raw.serial_number || 1,
      photo_available: Boolean(raw.photo_available),
      extraction_confidence: raw.extraction_confidence ?? 1.0,
      validation_status: raw.validation_status || 'VALID',
      created_at: raw.created_at || new Date().toISOString(),
      updated_at: raw.updated_at || new Date().toISOString(),

      // Aliases for compatibility
      name_hindi: nameHi,
      name_english: nameEn,
      relation_name_hindi: relNameHi,
      relation_name_english: relNameEn,
      normalized_name: raw.normalized_name || normalizeEnglish(nameEn),
      assembly_constituency: raw.assembly_constituency,
      district: raw.district,
      state: raw.state || 'INDIA',
      raw_extracted_data: raw.raw_extracted_data,
      batch_id: raw.batch_id,
    };
  }

  // --- Batches ---
  public async createBatch(batchName: string, metadata: Record<string, any> = {}): Promise<ImportBatch> {
    this.loadStore();
    const batch: ImportBatch = {
      id: crypto.randomUUID(),
      batch_name: batchName,
      status: 'PENDING',
      total_files: 0,
      total_records_processed: 0,
      total_records_valid: 0,
      total_records_flagged: 0,
      metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };
    this.memoryStore.batches.unshift(batch);
    this.saveStore();
    return batch;
  }

  public async getBatches(): Promise<ImportBatch[]> {
    this.loadStore();
    return [...this.memoryStore.batches];
  }

  public async getBatchById(id: string): Promise<ImportBatch | null> {
    this.loadStore();
    return this.memoryStore.batches.find((b) => b.id === id) || null;
  }

  public async updateBatch(
    id: string,
    updates: Partial<ImportBatch>
  ): Promise<ImportBatch | null> {
    this.loadStore();
    const index = this.memoryStore.batches.findIndex((b) => b.id === id);
    if (index === -1) return null;

    const updated = {
      ...this.memoryStore.batches[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.memoryStore.batches[index] = updated;
    this.saveStore();
    return updated;
  }

  // --- Source Files ---
  public async createSourceFile(file: Omit<SourceFile, 'id' | 'created_at' | 'updated_at'>): Promise<SourceFile> {
    this.loadStore();
    const newFile: SourceFile = {
      id: crypto.randomUUID(),
      ...file,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.memoryStore.source_files.push(newFile);

    const batch = this.memoryStore.batches.find((b) => b.id === file.batch_id);
    if (batch) {
      batch.total_files += 1;
      batch.updated_at = new Date().toISOString();
    }

    this.saveStore();
    return newFile;
  }

  public async getSourceFiles(batchId?: string): Promise<SourceFile[]> {
    this.loadStore();
    if (batchId) {
      return this.memoryStore.source_files.filter((f) => f.batch_id === batchId);
    }
    return [...this.memoryStore.source_files];
  }

  public async getSourceFileById(id: string): Promise<SourceFile | null> {
    this.loadStore();
    return this.memoryStore.source_files.find((f) => f.id === id) || null;
  }

  // --- Voter Records Bulk Ingestion ---
  public async insertVoterRecordsBulk(
    records: (Omit<Voter, 'id' | 'created_at' | 'updated_at'> & { id?: string })[]
  ): Promise<{ inserted: number; flagged: number; duplicates: number }> {
    this.loadStore();

    let validCount = 0;
    let flaggedCount = 0;
    let duplicateCount = 0;

    const now = new Date().toISOString();

    for (const raw of records) {
      const v = this.mapToVoter(raw);
      v.id = raw.id || crypto.randomUUID();
      v.created_at = now;
      v.updated_at = now;

      // Duplicate EPIC detection
      if (v.epic_number) {
        const existing = this.memoryStore.voters.find(
          (x) => x.epic_number && x.epic_number.toUpperCase() === v.epic_number!.toUpperCase()
        );
        if (existing) {
          v.validation_status = 'DUPLICATE';
          duplicateCount++;

          // Record validation error
          this.memoryStore.validation_errors.push({
            id: crypto.randomUUID(),
            voter_id: v.id,
            source_file_id: v.source_file_id,
            error_code: 'DUPLICATE_EPIC',
            error_message: `Duplicate EPIC number: ${v.epic_number} matches existing record ${existing.id}`,
            severity: 'WARNING',
            is_resolved: false,
            created_at: now,
          });
        }
      }

      if (v.validation_status === 'VALID') {
        validCount++;
      } else {
        flaggedCount++;
      }

      this.memoryStore.voters.push(v);
    }

    this.saveStore();
    return {
      inserted: records.length,
      flagged: flaggedCount,
      duplicates: duplicateCount,
    };
  }

  public async updateVoter(id: string, updates: Partial<Voter>): Promise<Voter | null> {
    this.loadStore();
    const index = this.memoryStore.voters.findIndex((v) => v.id === id);
    if (index === -1) return null;

    const updated = this.mapToVoter({
      ...this.memoryStore.voters[index],
      ...updates,
      id,
      updated_at: new Date().toISOString(),
    });

    this.memoryStore.voters[index] = updated;
    this.saveStore();
    return updated;
  }

  // --- Multi-Lingual Search Engine ---
  public async searchVoters(filters: SearchQueryFilters): Promise<SearchResponse> {
    this.loadStore();
    const startTime = performance.now();

    const query = filters.query?.trim();
    const epicQuery = filters.epic ? normalizeEpic(filters.epic) : null;
    const nameQuery = filters.name?.trim();
    const relQuery = filters.relation_name?.trim();
    const houseQuery = filters.house_no ? normalizeHouseNumber(filters.house_no) : null;

    const candidatesHindi: string[] = [];
    const candidatesEnglish: string[] = [];
    let queryExpansion: SearchResponse['query_expansion'];

    if (query) {
      const expansion = expandSearchQuery(query);
      queryExpansion = {
        original: query,
        detected_script: expansion.detected_script,
        transliterated_candidates: expansion.candidates,
      };

      for (const cand of expansion.candidates) {
        if (/[\u0900-\u097F]/.test(cand)) {
          candidatesHindi.push(normalizeHindi(cand));
        } else {
          candidatesEnglish.push(normalizeEnglish(cand));
        }
      }
    }

    if (nameQuery) {
      const exp = expandSearchQuery(nameQuery);
      for (const cand of exp.candidates) {
        if (/[\u0900-\u097F]/.test(cand)) candidatesHindi.push(normalizeHindi(cand));
        else candidatesEnglish.push(normalizeEnglish(cand));
      }
    }

    const sourceFileMap = new Map<string, string>();
    for (const sf of this.memoryStore.source_files) {
      sourceFileMap.set(sf.id, sf.original_filename);
    }

    // Precalculate household counts per house_number + part_number
    const householdCounts = new Map<string, number>();
    for (const v of this.memoryStore.voters) {
      if (v.normalized_house_number) {
        const key = `${v.part_number || 'default'}_${v.normalized_house_number}`;
        householdCounts.set(key, (householdCounts.get(key) || 0) + 1);
      }
    }

    const scoredResults: SearchResultItem[] = [];
    const mode = filters.search_mode || 'all';

    for (const voter of this.memoryStore.voters) {
      let score = 0;
      const matchedFields: string[] = [];

      const normNameEng = voter.normalized_name_en;
      const normNameHin = voter.normalized_name_hi;
      const normRelEng = voter.normalized_relation_name_en || '';
      const normRelHin = voter.normalized_relation_name_hi || '';

      // 1. Direct EPIC Filter / Match
      if (epicQuery) {
        if (!voter.epic_number) continue;
        const normEpic = normalizeEpic(voter.epic_number);
        if (normEpic === epicQuery) {
          score += 100;
          matchedFields.push('epic_exact');
        } else if (normEpic.includes(epicQuery)) {
          score += 60;
          matchedFields.push('epic_partial');
        } else {
          continue;
        }
      }

      // 2. Query Text Search
      if (query) {
        const normEpic = normalizeEpic(voter.epic_number);
        let queryMatched = false;

        // Check EPIC match
        if (normEpic && (normEpic === query.toUpperCase() || normEpic.includes(query.toUpperCase()))) {
          score = Math.max(score, normEpic === query.toUpperCase() ? 100 : 80);
          matchedFields.push(normEpic === query.toUpperCase() ? 'Matched EPIC' : 'Matched EPIC (Partial)');
          queryMatched = true;
        }

        // Check English Name candidates
        for (const engCand of candidatesEnglish) {
          const unspacedEngCand = engCand.replace(/\s+/g, '');
          const unspacedVoterName = normNameEng.replace(/\s+/g, '');

          if (normNameEng === engCand) {
            score = Math.max(score, 95);
            matchedFields.push('Matched Name (Exact)');
            queryMatched = true;
          } else if (unspacedVoterName === unspacedEngCand) {
            score = Math.max(score, 85);
            matchedFields.push('Matched Spaced Variant');
            queryMatched = true;
          } else if (normNameEng.startsWith(engCand) || unspacedVoterName.startsWith(unspacedEngCand)) {
            score = Math.max(score, 75);
            matchedFields.push('Matched Name (Prefix)');
            queryMatched = true;
          } else if (normNameEng.includes(engCand)) {
            score = Math.max(score, 70);
            matchedFields.push('Matched Name (Partial)');
            queryMatched = true;
          } else if (mode === 'fuzzy' || mode === 'all') {
            const dist = this.levenshtein(normNameEng, engCand);
            if (dist <= 2 && normNameEng.length > 3) {
              score = Math.max(score, 65);
              matchedFields.push('Matched Fuzzy Name (Typo Tolerant)');
              queryMatched = true;
            }
          }
        }

        // Check Hindi Name candidates
        for (const hinCand of candidatesHindi) {
          const unspacedHinCand = hinCand.replace(/\s+/g, '');
          const unspacedVoterHin = normNameHin.replace(/\s+/g, '');

          if (normNameHin === hinCand) {
            score = Math.max(score, 95);
            matchedFields.push('Matched Name (Exact Devanagari)');
            queryMatched = true;
          } else if (unspacedVoterHin === unspacedHinCand) {
            score = Math.max(score, 85);
            matchedFields.push('Matched Spaced Variant');
            queryMatched = true;
          } else if (normNameHin.startsWith(hinCand) || unspacedVoterHin.startsWith(unspacedHinCand)) {
            score = Math.max(score, 75);
            matchedFields.push('Matched Name (Prefix)');
            queryMatched = true;
          } else if (normNameHin.includes(hinCand)) {
            score = Math.max(score, 70);
            matchedFields.push('Matched Name (Partial)');
            queryMatched = true;
          } else if (mode === 'fuzzy' || mode === 'all') {
            const dist = this.levenshtein(normNameHin, hinCand);
            if (dist <= 2 && normNameHin.length > 2) {
              score = Math.max(score, 65);
              matchedFields.push('Matched Fuzzy Name (Typo Tolerant)');
              queryMatched = true;
            }
          }
        }

        // Check Relation Name matches
        const relLabel =
          voter.relation_type === 'FATHER'
            ? 'Father Name'
            : voter.relation_type === 'HUSBAND'
            ? 'Husband Name'
            : voter.relation_type === 'MOTHER'
            ? 'Mother Name'
            : 'Relation Name';

        for (const engCand of candidatesEnglish) {
          if (normRelEng) {
            if (normRelEng === engCand) {
              score = Math.max(score, 55);
              matchedFields.push(`Matched ${relLabel}`);
              queryMatched = true;
            } else if (normRelEng.includes(engCand)) {
              score = Math.max(score, 45);
              matchedFields.push(`Matched ${relLabel} (Partial)`);
              queryMatched = true;
            }
          }
        }
        for (const hinCand of candidatesHindi) {
          if (normRelHin) {
            if (normRelHin === hinCand) {
              score = Math.max(score, 55);
              matchedFields.push(`Matched ${relLabel}`);
              queryMatched = true;
            } else if (normRelHin.includes(hinCand)) {
              score = Math.max(score, 45);
              matchedFields.push(`Matched ${relLabel} (Partial)`);
              queryMatched = true;
            }
          }
        }

        // Check House
        if (voter.normalized_house_number && voter.normalized_house_number === normalizeHouseNumber(query)) {
          score = Math.max(score, 40);
          matchedFields.push('Matched House Number');
          queryMatched = true;
        }

        if (!queryMatched && !epicQuery) {
          continue;
        }
      }

      if (nameQuery && !query) {
        let nameMatched = false;
        for (const engCand of candidatesEnglish) {
          if (normNameEng.includes(engCand)) { nameMatched = true; break; }
        }
        for (const hinCand of candidatesHindi) {
          if (normNameHin.includes(hinCand)) { nameMatched = true; break; }
        }
        if (!nameMatched) continue;
        score = Math.max(score, 70);
        matchedFields.push('Matched Name (Filter)');
      }

      if (relQuery) {
        let relMatched = false;
        const relExp = expandSearchQuery(relQuery);
        for (const cand of relExp.candidates) {
          const normCandHin = normalizeHindi(cand);
          const normCandEng = normalizeEnglish(cand);
          if (normCandHin && normRelHin && (normRelHin === normCandHin || normRelHin.includes(normCandHin))) {
            relMatched = true;
            break;
          }
          if (normCandEng && normRelEng && (normRelEng === normCandEng || normRelEng.includes(normCandEng))) {
            relMatched = true;
            break;
          }
        }
        if (!relMatched) continue;
        score = Math.max(score, 65);
        matchedFields.push('Matched Relation Name (Filter)');
      }

      // 3. Structured Filters
      if (filters.gender && voter.gender !== filters.gender) continue;
      if (filters.relation_type && voter.relation_type !== filters.relation_type) continue;
      if (filters.min_age !== undefined && voter.age !== null && voter.age < filters.min_age) continue;
      if (filters.max_age !== undefined && voter.age !== null && voter.age > filters.max_age) continue;
      if (filters.area && voter.area !== filters.area && (voter as any).section_name !== filters.area) continue;
      if (houseQuery) {
        if (!voter.normalized_house_number || !voter.normalized_house_number.includes(houseQuery)) continue;
        score = Math.max(score, 40);
        matchedFields.push('Matched House Number');
      }
      if (filters.ward && voter.ward_number !== filters.ward) continue;
      if (filters.part_no && voter.part_number !== filters.part_no) continue;
      if (filters.serial_no !== undefined && voter.serial_number !== filters.serial_no && voter.source_serial_number !== filters.serial_no) continue;
      if (filters.constituency_id && voter.constituency_id !== filters.constituency_id) continue;
      if (filters.election_id && voter.election_id !== filters.election_id) continue;

      if (!query && !epicQuery && !houseQuery && !relQuery && !nameQuery) {
        score = 50;
      }

      const houseKey = `${voter.part_number || 'default'}_${voter.normalized_house_number || ''}`;
      const householdCount = householdCounts.get(houseKey) || 1;

      scoredResults.push({
        ...voter,
        relevance_score: score,
        matched_fields: matchedFields,
        source_filename: sourceFileMap.get(voter.source_file_id) || 'Electoral Roll',
        household_count: householdCount,
      });
    }

    // Sort Results
    const sortBy = filters.sort_by || 'relevance_score';
    const sortOrder = filters.sort_order || 'desc';

    scoredResults.sort((a, b) => {
      if (sortBy === 'relevance_score') {
        const diff = (b.relevance_score || 0) - (a.relevance_score || 0);
        return sortOrder === 'desc' ? diff : -diff;
      }
      if (sortBy === 'serial_number') {
        return sortOrder === 'desc'
          ? b.serial_number - a.serial_number
          : a.serial_number - b.serial_number;
      }
      if (sortBy === 'age') {
        return sortOrder === 'desc' ? (b.age || 0) - (a.age || 0) : (a.age || 0) - (b.age || 0);
      }
      if (sortBy === 'name') {
        return sortOrder === 'desc'
          ? b.name_en.localeCompare(a.name_en)
          : a.name_en.localeCompare(b.name_en);
      }
      return 0;
    });

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const total = scoredResults.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = scoredResults.slice((page - 1) * limit, page * limit);

    const genderDist: Record<string, number> = {};
    const wardCounts: Record<string, number> = {};
    const partCounts: Record<string, number> = {};

    for (const item of scoredResults) {
      genderDist[item.gender] = (genderDist[item.gender] || 0) + 1;
      if (item.ward_number) wardCounts[item.ward_number] = (wardCounts[item.ward_number] || 0) + 1;
      if (item.part_number) partCounts[item.part_number] = (partCounts[item.part_number] || 0) + 1;
    }

    const endTime = performance.now();
    const executionTimeMs = Math.round(endTime - startTime);

    this.logSearch(query, filters, total, executionTimeMs);

    return {
      results: paginated,
      total,
      page,
      limit,
      total_pages: totalPages,
      query_expansion: queryExpansion,
      execution_time_ms: executionTimeMs,
      facets: {
        gender_distribution: genderDist,
        ward_counts: wardCounts,
        part_counts: partCounts,
      },
    };
  }

  public async getVoterById(id: string): Promise<(Voter & { source_file?: SourceFile; batch?: ImportBatch }) | null> {
    this.loadStore();
    const voter = this.memoryStore.voters.find((v) => v.id === id);
    if (!voter) return null;

    const source_file = this.memoryStore.source_files.find((f) => f.id === voter.source_file_id);
    const batch = source_file ? this.memoryStore.batches.find((b) => b.id === source_file.batch_id) : undefined;

    return {
      ...voter,
      source_file,
      batch,
    };
  }

  public async getStats(): Promise<SystemStats> {
    this.loadStore();
    const voters = this.memoryStore.voters;
    const batches = this.memoryStore.batches;
    const sourceFiles = this.memoryStore.source_files;

    const genderDist: Record<string, number> = {
      MALE: 0,
      FEMALE: 0,
      OTHER: 0,
      UNKNOWN: 0,
    };

    const ageGroups = {
      '18-25': 0,
      '26-40': 0,
      '41-60': 0,
      '60+': 0,
    };

    const assemblies = new Set<string>();
    const wards = new Set<string>();
    let totalConfidence = 0;

    for (const v of voters) {
      genderDist[v.gender] = (genderDist[v.gender] || 0) + 1;
      if (v.age) {
        if (v.age <= 25) ageGroups['18-25']++;
        else if (v.age <= 40) ageGroups['26-40']++;
        else if (v.age <= 60) ageGroups['41-60']++;
        else ageGroups['60+']++;
      }
      if (v.assembly_constituency || v.constituency_id) {
        assemblies.add(v.assembly_constituency || v.constituency_id!);
      }
      if (v.ward_number) wards.add(v.ward_number);
      totalConfidence += v.extraction_confidence || 1.0;
    }

    return {
      total_voters: voters.length,
      total_batches: batches.length,
      total_source_files: sourceFiles.length,
      total_elections: this.memoryStore.elections.length,
      total_assemblies: assemblies.size,
      total_wards: wards.size,
      gender_distribution: genderDist,
      age_groups: ageGroups,
      recent_searches_count: this.memoryStore.search_logs.length,
      average_confidence: voters.length ? Number((totalConfidence / voters.length).toFixed(3)) : 1.0,
    };
  }

  public async recordAuditLog(log: AuditLog): Promise<void> {
    this.loadStore();
    this.memoryStore.audit_logs.unshift(log);
    if (this.memoryStore.audit_logs.length > 500) {
      this.memoryStore.audit_logs.pop();
    }
    this.saveStore();
  }

  public async getAuditLogs(filters?: {
    action?: string;
    entity_type?: string;
    user_id?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    this.loadStore();
    let logs = [...this.memoryStore.audit_logs];

    if (filters?.action) {
      logs = logs.filter((l) => l.action.toLowerCase() === filters.action!.toLowerCase());
    }
    if (filters?.entity_type) {
      logs = logs.filter((l) => l.entity_type.toLowerCase() === filters.entity_type!.toLowerCase());
    }
    if (filters?.user_id) {
      logs = logs.filter((l) => l.user_id === filters.user_id);
    }

    const limit = filters?.limit || 100;
    return logs.slice(0, limit);
  }

  public async createValidationError(error: Omit<ValidationError, 'id' | 'is_resolved' | 'created_at'>): Promise<ValidationError> {
    this.loadStore();
    const newError: ValidationError = {
      id: crypto.randomUUID(),
      ...error,
      is_resolved: false,
      created_at: new Date().toISOString(),
    };
    this.memoryStore.validation_errors.push(newError);
    this.saveStore();
    return newError;
  }

  public async getAllValidationErrors(includeResolved: boolean = false): Promise<ValidationError[]> {
    this.loadStore();
    if (includeResolved) {
      return [...this.memoryStore.validation_errors];
    }
    return this.memoryStore.validation_errors.filter((e) => !e.is_resolved);
  }

  public async resolveValidationError(
    id: string,
    resolution: {
      action: 'ACCEPT' | 'EDIT' | 'REJECT_RECORD' | 'MARK_REVIEWED';
      notes?: string;
      resolved_by?: string;
    }
  ): Promise<ValidationError | null> {
    this.loadStore();
    const index = this.memoryStore.validation_errors.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const err = this.memoryStore.validation_errors[index];
    err.is_resolved = true;
    (err as any).resolution = {
      ...resolution,
      resolved_at: new Date().toISOString(),
    };

    // If resolution action is ACCEPT or MARK_REVIEWED, update voter status to VALID if no other unresolved errors
    if (err.voter_id) {
      const remainingUnresolved = this.memoryStore.validation_errors.filter(
        (e) => e.voter_id === err.voter_id && !e.is_resolved && e.id !== id
      );

      const voterIndex = this.memoryStore.voters.findIndex((v) => v.id === err.voter_id);
      if (voterIndex !== -1) {
        if (resolution.action === 'REJECT_RECORD') {
          this.memoryStore.voters[voterIndex].validation_status = 'REJECTED' as any;
        } else if (remainingUnresolved.length === 0) {
          this.memoryStore.voters[voterIndex].validation_status = 'VALID';
        }
      }
    }

    this.saveStore();
    return err;
  }

  public async deleteVoter(id: string): Promise<boolean> {
    this.loadStore();
    const initialLen = this.memoryStore.voters.length;
    this.memoryStore.voters = this.memoryStore.voters.filter((v) => v.id !== id);
    if (this.memoryStore.voters.length < initialLen) {
      this.saveStore();
      return true;
    }
    return false;
  }

  public async getValidationErrorsByVoterId(voterId: string): Promise<ValidationError[]> {
    this.loadStore();
    return this.memoryStore.validation_errors.filter((e) => e.voter_id === voterId);
  }

  public async getValidationErrorsByBatchId(batchId: string): Promise<ValidationError[]> {
    this.loadStore();
    const sourceFileIds = new Set(this.memoryStore.source_files.filter((f) => f.batch_id === batchId).map((f) => f.id));
    return this.memoryStore.validation_errors.filter((e) => e.source_file_id ? sourceFileIds.has(e.source_file_id) : false);
  }

  private logSearch(query: string | undefined, filters: any, resultCount: number, timeMs: number) {
    this.memoryStore.search_logs.push({
      id: crypto.randomUUID(),
      query_text: query,
      query_filters: filters,
      result_count: resultCount,
      execution_time_ms: timeMs,
      created_at: new Date().toISOString(),
    });
    if (this.memoryStore.search_logs.length > 200) {
      this.memoryStore.search_logs.shift();
    }
    this.saveStore();
  }

  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}

export const dbRepository = new DatabaseRepository();
