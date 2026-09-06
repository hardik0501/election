export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'THIRD_GENDER' | 'UNKNOWN';
export type RelationType = 'FATHER' | 'MOTHER' | 'HUSBAND' | 'OTHER' | 'UNKNOWN';
export type ValidationStatus = 'VALID' | 'WARNING' | 'DUPLICATE' | 'REJECTED';
export type BatchStatus =
  | 'UPLOADED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'OCR_PROCESSING'
  | 'PARSING'
  | 'VALIDATING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_WARNINGS'
  | 'FAILED'
  | 'PENDING'
  | 'PARTIAL';

export type FileType = 'PDF' | 'CSV' | 'XLSX' | 'IMAGE';
export type ElectionType = 'GENERAL' | 'ASSEMBLY' | 'MUNICIPAL' | 'PANCHAYAT' | 'BY_ELECTION';
export type ErrorSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface IngestionProgress {
  percentage: number;
  current_stage: BatchStatus;
  current_page: number;
  total_pages: number;
  records_detected: number;
  records_valid: number;
  warnings_count: number;
  errors_count: number;
  duplicates_count: number;
  current_file: string;
  elapsed_ms: number;
  stage_message?: string;
}

export interface ColumnMappingConfig {
  serial_number?: string;
  name_auto?: string;
  name_hi?: string;
  name_en?: string;
  relation_name?: string;
  relation_name_hi?: string;
  relation_name_en?: string;
  relation_type?: string;
  gender?: string;
  age?: string;
  house_number?: string;
  epic_number?: string;
  ward_number?: string;
  part_number?: string;
  area?: string;
  assembly_constituency?: string;
  district?: string;
}

export interface CsvPreviewResponse {
  headers: string[];
  sample_rows: Record<string, any>[];
  total_rows_estimate: number;
  suggested_mapping: ColumnMappingConfig;
}

export interface ImportReport {
  batch_id: string;
  batch_name: string;
  status: BatchStatus;
  created_at: string;
  completed_at: string | null;
  total_files: number;
  files: {
    id: string;
    filename: string;
    file_type: string;
    total_pages: number;
    file_size_bytes: number;
    file_hash_sha256: string;
  }[];
  records_processed: number;
  records_valid: number;
  records_flagged: number;
  duplicates_count: number;
  validation_errors: ValidationError[];
  summary: {
    valid_pct: number;
    avg_confidence: number;
    error_breakdown: Record<string, number>;
    extraction_report?: Record<string, any>;
  };
}

// ---------------------------------------------------------------------------
// 1. Roles & Users (RBAC)
// ---------------------------------------------------------------------------
export interface Role {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface User {
  id: string;
  role_id?: string | null;
  email: string;
  full_name: string;
  password_hash?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role?: Role | null;
}

// ---------------------------------------------------------------------------
// 2. Electoral Hierarchy: Election, Constituency, Ward, Part, Area
// ---------------------------------------------------------------------------
export interface Election {
  id: string;
  title: string;
  election_type: ElectionType;
  state: string;
  year: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Constituency {
  id: string;
  election_id?: string | null;
  code: string;
  name_en: string;
  name_hi?: string | null;
  district: string;
  state: string;
  created_at: string;
  updated_at: string;
}

export interface Ward {
  id: string;
  constituency_id: string;
  ward_number: string;
  name_en?: string | null;
  name_hi?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Part {
  id: string;
  constituency_id: string;
  part_number: string;
  name_en?: string | null;
  name_hi?: string | null;
  polling_station_name_en?: string | null;
  polling_station_name_hi?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Area {
  id: string;
  part_id: string;
  name_en: string;
  name_hi?: string | null;
  pin_code?: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// 3. Batches & Source Files
// ---------------------------------------------------------------------------
export interface ImportBatch {
  id: string;
  election_id?: string | null;
  constituency_id?: string | null;
  batch_name: string;
  status: BatchStatus;
  total_files: number;
  total_records_processed: number;
  total_records_valid: number;
  total_records_flagged: number;
  error_message?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface SourceFile {
  id: string;
  batch_id: string;
  original_filename: string;
  storage_path: string;
  file_type: FileType;
  file_hash_sha256: string;
  file_size_bytes: number;
  total_pages: number;
  parsing_status: string;
  parsing_metrics?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// 4. Voters (Normalized Master Entity)
// ---------------------------------------------------------------------------
export interface Voter {
  id: string;
  serial_number: number;
  name_hi: string;
  name_en: string;
  normalized_name_hi: string;
  normalized_name_en: string;
  gender: Gender;
  age: number | null;
  house_number: string | null;
  normalized_house_number: string | null;
  relation_type: RelationType;
  relation_name_hi: string | null;
  relation_name_en: string | null;
  normalized_relation_name_hi: string | null;
  normalized_relation_name_en: string | null;
  epic_number: string | null;
  ward_number?: string | null;
  part_number?: string | null;
  area?: string | null;
  election_id?: string | null;
  constituency_id?: string | null;
  source_file_id: string;
  source_page_number: number;
  source_serial_number: number;
  photo_available: boolean;
  extraction_confidence: number;
  validation_status: ValidationStatus;
  created_at: string;
  updated_at: string;

  // Compatibility aliases for UI
  name_hindi?: string;
  name_english?: string;
  relation_name_hindi?: string | null;
  relation_name_english?: string | null;
  normalized_name?: string;
  assembly_constituency?: string | null;
  district?: string | null;
  state?: string;
  raw_extracted_data?: Record<string, any>;
  batch_id?: string;
}

// Alias VoterRecord to Voter for backward compatibility across modules
export type VoterRecord = Voter;

// ---------------------------------------------------------------------------
// 5. Voter Relations, Extractions, Validation Errors & Audits
// ---------------------------------------------------------------------------
export interface VoterRelation {
  id: string;
  voter_id: string;
  related_voter_id: string;
  relation_type: string;
  confidence: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ExtractionResult {
  id: string;
  source_file_id: string;
  page_number: number;
  raw_text?: string | null;
  bounding_boxes?: Record<string, any>[];
  ocr_engine: string;
  confidence: number;
  created_at: string;
}

export interface ValidationError {
  id: string;
  voter_id?: string | null;
  source_file_id?: string | null;
  error_code: string;
  error_message: string;
  severity: ErrorSeverity;
  raw_data?: Record<string, any>;
  is_resolved: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  changes?: Record<string, any>;
  ip_address?: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// 6. Search Queries & API Results
// ---------------------------------------------------------------------------
export interface SearchQueryFilters {
  query?: string;
  epic?: string;
  name?: string;
  relation_name?: string;
  relation_type?: RelationType;
  gender?: Gender;
  min_age?: number;
  max_age?: number;
  house_no?: string;
  ward?: string;
  part_no?: string;
  serial_no?: number;
  area?: string;
  assembly?: string;
  constituency_id?: string;
  election_id?: string;
  search_mode?: 'all' | 'exact' | 'fuzzy' | 'transliterated';
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface SearchResultItem extends Voter {
  relevance_score?: number;
  matched_fields?: string[];
  source_filename?: string;
  household_count?: number;
}

export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  query_expansion?: {
    original: string;
    transliterated_candidates: string[];
    detected_script: 'devanagari' | 'latin' | 'mixed';
  };
  execution_time_ms: number;
  facets?: {
    gender_distribution: Record<string, number>;
    ward_counts: Record<string, number>;
    part_counts: Record<string, number>;
  };
}

export interface HouseholdGroup {
  house_number: string;
  normalized_house_number: string;
  part_number: string | null;
  ward_number: string | null;
  members: Voter[];
  total_members: number;
  head_candidate?: Voter | null;
}

export interface VoterSourceInfo {
  voter_id: string;
  source_file: SourceFile | null;
  batch: ImportBatch | null;
  page_number: number;
  source_serial: number;
  file_hash_sha256: string | null;
  storage_path: string | null;
  extraction_result: ExtractionResult | null;
  validation_errors: ValidationError[];
}

export interface SystemStats {
  total_voters: number;
  total_batches: number;
  total_source_files: number;
  total_elections: number;
  total_assemblies: number;
  total_wards: number;
  gender_distribution: Record<string, number>;
  age_groups: {
    '18-25': number;
    '26-40': number;
    '41-60': number;
    '60+': number;
  };
  recent_searches_count: number;
  average_confidence: number;
}
