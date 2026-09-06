-- =========================================================================
-- VoterFinder Canonical PostgreSQL Database Schema
-- =========================================================================

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Elections
CREATE TABLE IF NOT EXISTS elections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    election_type VARCHAR(50) NOT NULL DEFAULT 'GENERAL' CHECK (election_type IN ('GENERAL', 'ASSEMBLY', 'MUNICIPAL', 'PANCHAYAT', 'BY_ELECTION')),
    state VARCHAR(100) NOT NULL,
    year INT NOT NULL CHECK (year >= 1950 AND year <= 2100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Constituencies
CREATE TABLE IF NOT EXISTS constituencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID REFERENCES elections(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_hi VARCHAR(255),
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_constituency_code_state UNIQUE (code, state)
);

-- 5. Wards
CREATE TABLE IF NOT EXISTS wards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    constituency_id UUID REFERENCES constituencies(id) ON DELETE CASCADE,
    ward_number VARCHAR(50) NOT NULL,
    name_en VARCHAR(255),
    name_hi VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ward_constituency UNIQUE (constituency_id, ward_number)
);

-- 6. Parts
CREATE TABLE IF NOT EXISTS parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    constituency_id UUID REFERENCES constituencies(id) ON DELETE CASCADE,
    part_number VARCHAR(50) NOT NULL,
    name_en VARCHAR(255),
    name_hi VARCHAR(255),
    polling_station_name_en TEXT,
    polling_station_name_hi TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_part_constituency UNIQUE (constituency_id, part_number)
);

-- 7. Areas
CREATE TABLE IF NOT EXISTS areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id UUID REFERENCES parts(id) ON DELETE CASCADE,
    name_en VARCHAR(255) NOT NULL,
    name_hi VARCHAR(255),
    pin_code VARCHAR(10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Import Batches
CREATE TABLE IF NOT EXISTS import_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID REFERENCES elections(id) ON DELETE SET NULL,
    constituency_id UUID REFERENCES constituencies(id) ON DELETE SET NULL,
    batch_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL')),
    total_files INT NOT NULL DEFAULT 0,
    total_records_processed INT NOT NULL DEFAULT 0,
    total_records_valid INT NOT NULL DEFAULT 0,
    total_records_flagged INT NOT NULL DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 9. Source Files
CREATE TABLE IF NOT EXISTS source_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    original_filename VARCHAR(512) NOT NULL,
    storage_path VARCHAR(1024) NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('PDF', 'CSV', 'XLSX', 'IMAGE')),
    file_hash_sha256 CHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    total_pages INT DEFAULT 1,
    parsing_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (parsing_status IN ('PENDING', 'PARSING', 'SUCCESS', 'FAILED', 'PARTIAL_OCR')),
    parsing_metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Voters
CREATE TABLE IF NOT EXISTS voters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_number INT NOT NULL,
    name_hi VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    normalized_name_hi VARCHAR(255) NOT NULL,
    normalized_name_en VARCHAR(255) NOT NULL,
    gender VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN' CHECK (gender IN ('MALE', 'FEMALE', 'OTHER', 'THIRD_GENDER', 'UNKNOWN')),
    age INT CHECK (age IS NULL OR (age >= 18 AND age <= 130)),
    house_number VARCHAR(100),
    normalized_house_number VARCHAR(100),
    relation_type VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN' CHECK (relation_type IN ('FATHER', 'MOTHER', 'HUSBAND', 'OTHER', 'UNKNOWN')),
    relation_name_hi VARCHAR(255),
    relation_name_en VARCHAR(255),
    normalized_relation_name_hi VARCHAR(255),
    normalized_relation_name_en VARCHAR(255),
    epic_number VARCHAR(50),
    ward_number VARCHAR(100),
    part_number VARCHAR(100),
    area VARCHAR(255),
    election_id UUID REFERENCES elections(id) ON DELETE SET NULL,
    constituency_id UUID REFERENCES constituencies(id) ON DELETE SET NULL,
    source_file_id UUID NOT NULL REFERENCES source_files(id) ON DELETE CASCADE,
    source_page_number INT NOT NULL DEFAULT 1,
    source_serial_number INT NOT NULL,
    photo_available BOOLEAN NOT NULL DEFAULT FALSE,
    extraction_confidence NUMERIC(4,3) NOT NULL DEFAULT 1.000 CHECK (extraction_confidence >= 0.0 AND extraction_confidence <= 1.0),
    validation_status VARCHAR(50) NOT NULL DEFAULT 'VALID' CHECK (validation_status IN ('VALID', 'WARNING', 'DUPLICATE', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Voter Relations
CREATE TABLE IF NOT EXISTS voter_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voter_id UUID NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
    related_voter_id UUID NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL,
    confidence NUMERIC(4,3) DEFAULT 1.000,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_voter_relation_pair UNIQUE (voter_id, related_voter_id, relation_type)
);

-- 12. Extraction Results
CREATE TABLE IF NOT EXISTS extraction_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_file_id UUID NOT NULL REFERENCES source_files(id) ON DELETE CASCADE,
    page_number INT NOT NULL DEFAULT 1,
    raw_text TEXT,
    bounding_boxes JSONB DEFAULT '[]'::jsonb,
    ocr_engine VARCHAR(100) DEFAULT 'digital_text_layer',
    confidence NUMERIC(4,3) DEFAULT 1.000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Validation Errors
CREATE TABLE IF NOT EXISTS validation_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voter_id UUID REFERENCES voters(id) ON DELETE CASCADE,
    source_file_id UUID REFERENCES source_files(id) ON DELETE CASCADE,
    error_code VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'WARNING' CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    raw_data JSONB DEFAULT '{}'::jsonb,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    changes JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voters_epic_number ON voters (UPPER(TRIM(epic_number))) WHERE epic_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voters_house_number ON voters (house_number);
CREATE INDEX IF NOT EXISTS idx_voters_norm_house_number ON voters (normalized_house_number);
CREATE INDEX IF NOT EXISTS idx_voters_ward_part_serial ON voters (ward_number, part_number, serial_number);
CREATE INDEX IF NOT EXISTS idx_voters_part_source_serial ON voters (part_number, source_serial_number);
CREATE INDEX IF NOT EXISTS idx_voters_name_en_trgm ON voters USING gin (name_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_voters_norm_name_en_trgm ON voters USING gin (normalized_name_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_voters_name_hi_trgm ON voters USING gin (name_hi gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_voters_norm_name_hi_trgm ON voters USING gin (normalized_name_hi gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_voters_rel_name_en_trgm ON voters USING gin (relation_name_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_voters_rel_name_hi_trgm ON voters USING gin (relation_name_hi gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_voters_source_file_id ON voters (source_file_id);
CREATE INDEX IF NOT EXISTS idx_voters_constituency_id ON voters (constituency_id);
CREATE INDEX IF NOT EXISTS idx_voters_election_id ON voters (election_id);
CREATE INDEX IF NOT EXISTS idx_voters_validation_status ON voters (validation_status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_errors_voter_id ON validation_errors (voter_id);
