-- FloatChat schema — verbatim from SCHEMA_AND_PROMPTS.md §1
-- Loaded automatically on first PostGIS container boot via docker-entrypoint-initdb.d

CREATE EXTENSION IF NOT EXISTS postgis;

-- One row per physical float
CREATE TABLE IF NOT EXISTS argo_floats (
    float_id        VARCHAR(20) PRIMARY KEY,   -- WMO float ID, e.g. '2902123'
    deploy_date      DATE,
    deploy_lat        DOUBLE PRECISION,
    deploy_lon        DOUBLE PRECISION,
    status           VARCHAR(20)               -- 'active' | 'inactive'
);

-- One row per profile (a single dive/surface cycle)
CREATE TABLE IF NOT EXISTS argo_profiles (
    profile_id       SERIAL PRIMARY KEY,
    float_id         VARCHAR(20) REFERENCES argo_floats(float_id),
    cycle_number      INTEGER,
    profile_date      TIMESTAMP,
    latitude          DOUBLE PRECISION,
    longitude         DOUBLE PRECISION,
    location          GEOGRAPHY(POINT, 4326),  -- PostGIS point, derived from lat/lon
    region            VARCHAR(50),              -- precomputed label, e.g. 'Arabian Sea'
    UNIQUE (float_id, cycle_number)             -- natural key: re-ingest must be idempotent
);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON argo_profiles USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_profiles_date ON argo_profiles(profile_date);

-- One row per depth-level measurement within a profile
CREATE TABLE IF NOT EXISTS argo_measurements (
    measurement_id    SERIAL PRIMARY KEY,
    profile_id         INTEGER REFERENCES argo_profiles(profile_id),
    pressure_dbar      DOUBLE PRECISION,        -- proxy for depth
    depth_m            DOUBLE PRECISION,
    temperature_c       DOUBLE PRECISION,
    salinity_psu        DOUBLE PRECISION,
    temp_qc_flag        INTEGER,                 -- ARGO QC: 1=good, 2=probably good, 3=probably bad, 4=bad
    salinity_qc_flag     INTEGER,
    is_valid            BOOLEAN GENERATED ALWAYS AS (temp_qc_flag IN (1,2) AND salinity_qc_flag IN (1,2)) STORED
);
CREATE INDEX IF NOT EXISTS idx_measurements_profile ON argo_measurements(profile_id);
CREATE INDEX IF NOT EXISTS idx_measurements_valid ON argo_measurements(is_valid);

-- Precomputed float-density + QC-quality stats, powers the Uncertainty Engine cheaply
CREATE TABLE IF NOT EXISTS qc_stats (
    region            VARCHAR(50),
    year_month         VARCHAR(7),               -- 'YYYY-MM'
    float_count         INTEGER,
    profile_count        INTEGER,
    total_readings       INTEGER,
    excluded_readings     INTEGER,
    qc_pass_ratio        DOUBLE PRECISION GENERATED ALWAYS AS
                          ((total_readings - excluded_readings)::float /
                           NULLIF(total_readings, 0)) STORED,
    PRIMARY KEY (region, year_month)
);

-- Precomputed monthly regional averages, powers comparative/anomaly queries
CREATE TABLE IF NOT EXISTS regional_monthly_avg (
    region            VARCHAR(50),
    year_month         VARCHAR(7),
    avg_temp_c          DOUBLE PRECISION,
    avg_salinity_psu     DOUBLE PRECISION,
    depth_bucket_m       INTEGER,                 -- e.g. averaged per 100m bucket
    PRIMARY KEY (region, year_month, depth_bucket_m)
);

-- Defense-in-depth: read-only role for ALL application queries (ARCHITECTURE.md §2.4)
-- LOGIN so the FastAPI app can connect as this role directly (SELECT-only, no writes).
CREATE ROLE floatchat_readonly LOGIN PASSWORD 'floatchat_dev';
GRANT CONNECT ON DATABASE floatchat TO floatchat_readonly;
GRANT USAGE ON SCHEMA public TO floatchat_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO floatchat_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO floatchat_readonly;