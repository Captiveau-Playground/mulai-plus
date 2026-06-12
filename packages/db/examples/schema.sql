-- ==========================================================
-- PostgreSQL Schema: Major Indonesian Higher Education Data
-- Language: English
-- Generated: 2026-06-08T08:50:21.924Z
-- ==========================================================

-- Drop existing tables (ordered by FK dependencies)
DROP TABLE IF EXISTS snbt_applicant_provinces CASCADE;
DROP TABLE IF EXISTS snbt_capacity_history CASCADE;
DROP TABLE IF EXISTS snbp_capacity_history CASCADE;
DROP TABLE IF EXISTS snbt_programs CASCADE;
DROP TABLE IF EXISTS snbp_programs CASCADE;
DROP TABLE IF EXISTS program_mappings CASCADE;
DROP TABLE IF EXISTS university_mappings CASCADE;
DROP TABLE IF EXISTS snpmb_universities CASCADE;
DROP TABLE IF EXISTS name_histories CASCADE;
DROP TABLE IF EXISTS graduation_rates CASCADE;
DROP TABLE IF EXISTS lecturer_counts CASCADE;
DROP TABLE IF EXISTS program_counts CASCADE;
DROP TABLE IF EXISTS study_durations CASCADE;
DROP TABLE IF EXISTS student_stats CASCADE;
DROP TABLE IF EXISTS tuition_fees CASCADE;
DROP TABLE IF EXISTS study_programs CASCADE;
DROP TABLE IF EXISTS university_details CASCADE;
DROP TABLE IF EXISTS universities CASCADE;

-- ────── PDDIKTI ──────

CREATE TABLE universities (
    id_sp              TEXT PRIMARY KEY,
    code               TEXT,
    name               TEXT NOT NULL,
    short_name         TEXT,
    type               TEXT,        -- Negeri, Swasta, Agama, Kedinasan
    status             TEXT,        -- Aktif, Alih Bentuk, Tutup, etc.
    province           TEXT,
    regency            TEXT,
    accreditation      TEXT,        -- Unggul, Baik Sekali, Baik, etc.
    total_programs     INTEGER,
    tuition_range      TEXT
);

CREATE TABLE university_details (
    id_sp                     TEXT PRIMARY KEY REFERENCES universities(id_sp),
    detail_id                 TEXT,
    group_name                TEXT,   -- Perguruan Tinggi Negeri/Swasta/Agama/etc
    supervisor                TEXT,   -- LLDIKTI / PTA, etc.
    email                     TEXT,
    phone                     TEXT,
    fax                       TEXT,
    website                   TEXT,
    address                   TEXT,
    postal_code               TEXT,
    subdistrict               TEXT,
    latitude                  DOUBLE PRECISION,
    longitude                 DOUBLE PRECISION,
    founded_date              DATE,
    establishment_decree_date DATE,
    establishment_decree      TEXT,
    accreditation_status      TEXT,
    accreditation             TEXT
);

CREATE TABLE study_programs (
    id_sms                TEXT PRIMARY KEY,
    id_sp                 TEXT NOT NULL REFERENCES universities(id_sp),
    code                  TEXT,
    name                  TEXT NOT NULL,
    level                 TEXT,        -- S1, D3, D4, S2, Profesi, etc.
    accreditation         TEXT,
    status                TEXT,        -- Aktif, Tutup, Alih Bentuk, etc.
    lecturers_nidn        INTEGER DEFAULT 0,
    lecturers_nidk        INTEGER DEFAULT 0,
    total_lecturers       INTEGER DEFAULT 0,
    teaching_lecturers    INTEGER DEFAULT 0,
    total_students        INTEGER DEFAULT 0,
    ratio                 TEXT,
    data_completeness     INTEGER DEFAULT 0
);

CREATE TABLE tuition_fees (
    id_sp            TEXT PRIMARY KEY REFERENCES universities(id_sp),
    fee_id           TEXT,
    tuition_range    TEXT
);

CREATE TABLE student_stats (
    id_sp             TEXT PRIMARY KEY REFERENCES universities(id_sp),
    student_stats_id  TEXT,
    avg_graduates     DOUBLE PRECISION DEFAULT 0,
    avg_new_students  DOUBLE PRECISION DEFAULT 0
);

CREATE TABLE study_durations (
    id                 SERIAL PRIMARY KEY,
    id_sp              TEXT NOT NULL REFERENCES universities(id_sp),
    duration_id        TEXT,
    level              TEXT,
    avg_duration_years DOUBLE PRECISION
);

CREATE TABLE program_counts (
    id_sp              TEXT PRIMARY KEY REFERENCES universities(id_sp),
    program_count_id   TEXT,
    total_programs     INTEGER DEFAULT 0
);

CREATE TABLE lecturer_counts (
    id_sp               TEXT PRIMARY KEY REFERENCES universities(id_sp),
    lecturer_count_id   TEXT,
    total_lecturers     INTEGER DEFAULT 0
);

CREATE TABLE graduation_rates (
    id_sp            TEXT PRIMARY KEY REFERENCES universities(id_sp),
    grad_rate_id     TEXT,
    graduation_rate  DOUBLE PRECISION
);

CREATE TABLE name_histories (
    id            SERIAL PRIMARY KEY,
    id_sp         TEXT NOT NULL REFERENCES universities(id_sp),
    old_name      TEXT,
    year_changed  INTEGER
);

-- ────── SNPMB ──────

CREATE TABLE snpmb_universities (
    id_ptn     INTEGER PRIMARY KEY,
    code       INTEGER,
    name       TEXT NOT NULL,
    province   TEXT,
    type       TEXT,        -- PTN Akademik / PTN Vokasi / PTKIN
    is_ptnbh   INTEGER DEFAULT 0,
    website    TEXT,
    address    TEXT
);

CREATE TABLE snbp_programs (
    id_prodi          INTEGER PRIMARY KEY,
    id_ptn            INTEGER NOT NULL REFERENCES snpmb_universities(id_ptn),
    code              INTEGER,
    name              TEXT NOT NULL,
    level             TEXT,
    portfolio_code    INTEGER DEFAULT 0,
    portfolio_name    TEXT,
    capacity          INTEGER,
    is_new            INTEGER DEFAULT 0
);

CREATE TABLE snbt_programs (
    id_prodi          INTEGER PRIMARY KEY,
    id_ptn            INTEGER NOT NULL REFERENCES snpmb_universities(id_ptn),
    code              INTEGER,
    name              TEXT NOT NULL,
    level             TEXT,
    portfolio_code    INTEGER DEFAULT 0,
    portfolio_name    TEXT,
    capacity          INTEGER,
    is_new            INTEGER DEFAULT 0
);

CREATE TABLE snbp_capacity_history (
    id             SERIAL PRIMARY KEY,
    id_prodi       INTEGER NOT NULL REFERENCES snbp_programs(id_prodi),
    year           INTEGER NOT NULL,
    capacity       INTEGER,
    applicants     INTEGER,
    accepted       INTEGER
);

CREATE TABLE snbt_capacity_history (
    id             SERIAL PRIMARY KEY,
    id_prodi       INTEGER NOT NULL REFERENCES snbt_programs(id_prodi),
    year           INTEGER NOT NULL,
    capacity       INTEGER,
    applicants     INTEGER,
    accepted       INTEGER
);

CREATE TABLE snbt_applicant_provinces (
    id               SERIAL PRIMARY KEY,
    id_prodi         INTEGER NOT NULL REFERENCES snbt_programs(id_prodi),
    year             INTEGER NOT NULL,
    province_code    TEXT,
    province_name    TEXT,
    total_applicants INTEGER DEFAULT 0
);

-- ────── MAPPING ──────

CREATE TABLE university_mappings (
    id_ptn            INTEGER PRIMARY KEY REFERENCES snpmb_universities(id_ptn),
    code              INTEGER,
    name              TEXT NOT NULL,
    id_sp             TEXT REFERENCES universities(id_sp),
    pt_code           TEXT,
    pt_name           TEXT,
    province          TEXT,
    group_name        TEXT,
    supervisor        TEXT,
    match_type        TEXT DEFAULT 'exact',
    match_similarity  DOUBLE PRECISION DEFAULT 1
);

CREATE TABLE program_mappings (
    id                   SERIAL PRIMARY KEY,
    snpmb_program_id     INTEGER NOT NULL,
    snpmb_program_code   INTEGER,
    snpmb_program_name   TEXT NOT NULL,
    level                TEXT,
    pddikti_program_id   TEXT,
    pddikti_program_code TEXT,
    pddikti_program_name TEXT,
    pddikti_level        TEXT,
    id_ptn               INTEGER NOT NULL,
    id_sp                TEXT,
    similarity           DOUBLE PRECISION
);

-- ────── INDEX ──────
CREATE INDEX idx_study_programs_id_sp ON study_programs(id_sp);
CREATE INDEX idx_study_programs_code ON study_programs(code);
CREATE INDEX idx_study_durations_id_sp ON study_durations(id_sp);
CREATE INDEX idx_snbp_programs_id_ptn ON snbp_programs(id_ptn);
CREATE INDEX idx_snbt_programs_id_ptn ON snbt_programs(id_ptn);
CREATE INDEX idx_snbp_capacity_id_prodi ON snbp_capacity_history(id_prodi);
CREATE INDEX idx_snbt_capacity_id_prodi ON snbt_capacity_history(id_prodi);
CREATE INDEX idx_snbt_prov_id_prodi ON snbt_applicant_provinces(id_prodi);
CREATE INDEX idx_snbt_prov_year ON snbt_applicant_provinces(year);
CREATE INDEX idx_program_mappings_snpmb ON program_mappings(snpmb_program_id);
CREATE INDEX idx_program_mappings_pddikti ON program_mappings(pddikti_program_id);
