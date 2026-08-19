# FloatChat — Schema & Prompt Design

---

## 1. Database Schema (PostgreSQL + PostGIS)

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- One row per physical float
CREATE TABLE argo_floats (
    float_id        VARCHAR(20) PRIMARY KEY,   -- WMO float ID, e.g. '2902123'
    deploy_date      DATE,
    deploy_lat        DOUBLE PRECISION,
    deploy_lon        DOUBLE PRECISION,
    status           VARCHAR(20)               -- 'active' | 'inactive'
);

-- One row per profile (a single dive/surface cycle)
CREATE TABLE argo_profiles (
    profile_id       SERIAL PRIMARY KEY,
    float_id         VARCHAR(20) REFERENCES argo_floats(float_id),
    cycle_number      INTEGER,
    profile_date      TIMESTAMP,
    latitude          DOUBLE PRECISION,
    longitude         DOUBLE PRECISION,
    location          GEOGRAPHY(POINT, 4326),  -- PostGIS point, derived from lat/lon
    region            VARCHAR(50)               -- precomputed label, e.g. 'Arabian Sea'
);
CREATE INDEX idx_profiles_location ON argo_profiles USING GIST(location);
CREATE INDEX idx_profiles_date ON argo_profiles(profile_date);

-- One row per depth-level measurement within a profile
CREATE TABLE argo_measurements (
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
CREATE INDEX idx_measurements_profile ON argo_measurements(profile_id);
CREATE INDEX idx_measurements_valid ON argo_measurements(is_valid);

-- Precomputed float-density + QC-quality stats, powers the Uncertainty Engine cheaply
CREATE TABLE qc_stats (
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
CREATE TABLE regional_monthly_avg (
    region            VARCHAR(50),
    year_month         VARCHAR(7),
    avg_temp_c          DOUBLE PRECISION,
    avg_salinity_psu     DOUBLE PRECISION,
    depth_bucket_m       INTEGER,                 -- e.g. averaged per 100m bucket
    PRIMARY KEY (region, year_month, depth_bucket_m)
);
```

**Design notes:**
- `is_valid` is a generated column — the AI Orchestrator's default queries should always
  filter `WHERE is_valid = true` unless the user explicitly asks about QC/data quality.
- `qc_stats` and `regional_monthly_avg` are precomputed during ingestion (Day 2), not
  computed live — this keeps the uncertainty check and comparative queries fast and
  keeps the LLM from having to generate complex aggregation SQL from scratch.
- `region` labeling (Arabian Sea / Bay of Bengal / etc.) should be assigned during
  ingestion via a simple bounding-box lookup — don't make the LLM infer geography.

---

## 2. Few-Shot NL → SQL Prompt Set

System prompt skeleton for the AI Orchestrator (Gemini call #1):

```
You are a SQL generator for FloatChat, a system answering questions about ARGO ocean
float data. You have access to this schema: [insert schema from §1].

Rules:
- Generate ONLY a single SELECT statement. Never generate INSERT/UPDATE/DELETE/DROP.
- Always filter argo_measurements.is_valid = true unless the user asks about data
  quality or QC flags specifically.
- Use the region column when the user names a sea/region; use ST_DWithin on `location`
  for named cities/coordinates not covered by a region label.
- For comparative/anomaly questions, generate two things: (1) SQL for the target period,
  and (2) reference the precomputed regional_monthly_avg table for baseline comparison
  rather than computing a multi-year average from raw rows.
- Return output as JSON: {"sql": "...", "intent_type": "depth_profile|trajectory|
  time_series|comparison|metadata|unsupported", "explanation": "one sentence, plain language"}
- If the question cannot be answered from this schema, return
  {"sql": null, "intent_type": "unsupported", "explanation": "..."}

Examples:
[few-shot pairs below]
```

### Example pairs (extended to 18 before Day 2 checkpoint)

**1. Depth profile — region + month**
> Q: "What was the temperature at different depths near Mumbai in December 2023?"
```sql
SELECT m.depth_m, m.temperature_c
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.profile_id
WHERE ST_DWithin(p.location, ST_MakePoint(72.8777, 19.0760)::geography, 200000)
  AND p.profile_date BETWEEN '2023-12-01' AND '2023-12-31'
  AND m.is_valid = true
ORDER BY m.depth_m;
```
`intent_type: "depth_profile"`

**2. Trajectory — by float ID**
> Q: "Show me the path of float 2902123 over the last year"
```sql
SELECT p.latitude, p.longitude, p.profile_date
FROM argo_profiles p
WHERE p.float_id = '2902123'
  AND p.profile_date >= NOW() - INTERVAL '1 year'
ORDER BY p.profile_date;
```
`intent_type: "trajectory"`

**3. Time series — region, temperature**
> Q: "How has salinity changed in the Bay of Bengal over 2023?"
```sql
SELECT DATE_TRUNC('month', p.profile_date) AS month, AVG(m.salinity_psu) AS avg_salinity
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.profile_id
WHERE p.region = 'Bay of Bengal'
  AND p.profile_date BETWEEN '2023-01-01' AND '2023-12-31'
  AND m.is_valid = true
GROUP BY month
ORDER BY month;
```
`intent_type: "time_series"`

**4. Comparative / anomaly — target vs precomputed baseline**
> Q: "Was March 2023 unusually warm in the Arabian Sea?"
```sql
-- target
SELECT AVG(m.temperature_c) AS target_avg
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.profile_id
WHERE p.region = 'Arabian Sea'
  AND p.profile_date BETWEEN '2023-03-01' AND '2023-03-31'
  AND m.is_valid = true;

-- baseline (from precomputed table)
SELECT AVG(avg_temp_c) AS baseline_avg
FROM regional_monthly_avg
WHERE region = 'Arabian Sea' AND year_month LIKE '%-03';
```
`intent_type: "comparison"`

**5. Sparse-data / low-quality-data case (for uncertainty testing)**
> Q: "What was the salinity near the Andaman Islands in January 2019?"
→ Backend runs the query, then checks `qc_stats` for that region/month against **two
thresholds**:
```sql
SELECT float_count, qc_pass_ratio
FROM qc_stats
WHERE region = 'Andaman Sea' AND year_month = '2019-01';
```
- `float_count < 3` → confidence: "low", reason: "limited float coverage"
- `qc_pass_ratio < 0.7` → confidence: "low", reason: "high proportion of readings failed quality checks"
- Both conditions can fire together — surface whichever is more severe, or both, in the
  confidence note. A region can have plenty of floats but still be low-confidence if most
  of their readings are QC-flagged bad.

**6. Out-of-scope (graceful refusal)**
> Q: "What's the ocean temperature near California?"
```json
{"sql": null, "intent_type": "unsupported",
 "explanation": "This dataset covers the Indian Ocean region only."}
```

**7. Hindi round-trip**
> Q: "मुंबई के पास पिछले महीने समुद्र का तापमान कितना था?"
- Orchestrator detects `language: "hi"`, generates the same SQL pattern as example 1
  (translate intent, not literal string matching against Hindi text in SQL)
- Final answer-phrasing call (Gemini call #2) responds in Hindi, using
  Noto Sans Devanagari on the frontend per `DESIGN.md`

**8. Depth profile — single float, full record**
> Q: "Show the vertical temperature profile for float 2900226"
```sql
SELECT m.depth_m, m.temperature_c, m.salinity_psu
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.profile_id
WHERE p.float_id = '2900226'
  AND m.is_valid = true
ORDER BY m.depth_m;
```
`intent_type: "depth_profile"`

**9. Depth profile — target a specific depth bin**
> Q: "What's the temperature at 500m depth in the Bay of Bengal in March 2003?"
```sql
SELECT m.depth_m, m.temperature_c
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.profile_id
WHERE p.region = 'Bay of Bengal'
  AND p.profile_date BETWEEN '2003-03-01' AND '2003-03-31'
  AND ABS(m.depth_m - 500) < 50
  AND m.is_valid = true
ORDER BY m.depth_m;
```
`intent_type: "depth_profile"`

**10. Trajectory — full lifetime**
> Q: "Where has float 2900226 traveled since it was deployed?"
```sql
SELECT p.latitude, p.longitude, p.profile_date
FROM argo_profiles p
WHERE p.float_id = '2900226'
ORDER BY p.profile_date;
```
`intent_type: "trajectory"`

**11. Time series — salinity, since**
> Q: "How did salinity change in the Bay of Bengal after 2002?"
```sql
SELECT DATE_TRUNC('month', p.profile_date) AS month, AVG(m.salinity_psu) AS avg_salinity
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.profile_id
WHERE p.region = 'Bay of Bengal'
  AND p.profile_date >= '2002-10-01'
  AND m.is_valid = true
GROUP BY month
ORDER BY month;
```
`intent_type: "time_series"`

**12. Time series — near a city, temperature**
> Q: "What's the temperature trend off the coast of Chennai since 2002?"
```sql
SELECT DATE_TRUNC('month', p.profile_date) AS month, AVG(m.temperature_c) AS avg_temp
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.profile_id
WHERE ST_DWithin(p.location, ST_MakePoint(80.2707, 13.0827)::geography, 200000)
  AND p.profile_date >= '2002-01-01'
  AND m.is_valid = true
GROUP BY month
ORDER BY month;
```
`intent_type: "time_series"`

**13. Comparison — colder-than-average target**
> Q: "Was February 2004 colder than usual in the Bay of Bengal?"
```sql
-- target
SELECT AVG(m.temperature_c) AS target_avg
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.profile_id
WHERE p.region = 'Bay of Bengal'
  AND p.profile_date BETWEEN '2004-02-01' AND '2004-02-29'
  AND m.is_valid = true;

-- baseline (same calendar month across all years)
SELECT AVG(avg_temp_c) AS baseline_avg
FROM regional_monthly_avg
WHERE region = 'Bay of Bengal' AND year_month LIKE '%-02';
```
`intent_type: "comparison"`

**14. Metadata — float status**
> Q: "Is float 2900226 still reporting?"
```sql
SELECT float_id, deploy_date, deploy_lat, deploy_lon, status
FROM argo_floats
WHERE float_id = '2900226';
```
`intent_type: "metadata"`

**15. Metadata — active floats in a region**
> Q: "Which floats are active in the Bay of Bengal?"
```sql
SELECT f.float_id, f.deploy_date, f.deploy_lat, f.deploy_lon, f.status
FROM argo_floats f
JOIN argo_profiles p ON p.float_id = f.float_id
WHERE f.status = 'active' AND p.region = 'Bay of Bengal'
GROUP BY f.float_id, f.deploy_date, f.deploy_lat, f.deploy_lon, f.status;
```
`intent_type: "metadata"`

**16. Data quality — explicit QC question**
> Q: "How many readings failed quality checks in the Bay of Bengal in 2003?"
```sql
SELECT year_month, float_count, profile_count, total_readings,
       excluded_readings, qc_pass_ratio
FROM qc_stats
WHERE region = 'Bay of Bengal' AND year_month LIKE '2003-%'
ORDER BY year_month;
```
`intent_type: "metadata"` — note: user explicitly asked about QC, so do NOT filter `is_valid`.

**17. No-data path (graceful)**
> Q: "What was the temperature in the Arabian Sea in July 2004?"
→ Region/period exist in schema but no ingested data:
```json
{"sql": "SELECT ... (matches the depth-profile pattern above)",
 "intent_type": "depth_profile",
 "explanation": "Region/date query; backend will surface no-data gracefully."}
```
Backend handles the empty result set → graceful message, never a fabricated number.

**18. Ambiguous / unsupported intent**
> Q: "What do you think about the ocean?"
```json
{"sql": null, "intent_type": "unsupported",
 "explanation": "This question cannot be answered from the float data schema."}
```

---

## 3. Answer-Phrasing Prompt (Gemini call #2)

Separate from SQL generation — takes raw query results + confidence metadata and
produces the final natural-language answer:

```
You are phrasing a factual answer for FloatChat based on real ARGO ocean data query
results. Given: {results, confidence, region, time_range, language}.

Rules:
- State only what the data shows. Never add caveats or numbers not present in `results`.
- If confidence is "low", explicitly mention limited float coverage in the answer.
- Keep it to 1-3 sentences. Numbers should be rounded to 1 decimal place.
- Respond in the requested language ({language}).
```

Keeping SQL generation and answer phrasing as two separate calls (rather than one) makes
each easier to debug independently and keeps the explainability panel's SQL block exactly
matching what was executed — no risk of the model paraphrasing the query away.
