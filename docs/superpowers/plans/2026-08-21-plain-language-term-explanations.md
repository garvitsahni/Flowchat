# Plain-language Term Explanations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add plain-language explanations for scientific terms (ARGO floats, QC flag 4, readings, usable %, calculation) in the answer output — a brief strip under the answer and gloss sub-lines in the "How I got this" panel.

**Architecture:** Reuse existing `explanations` dict in `Explainability.explanations` (contract-safe, additive keys). Expand backend `_build_explanations` with 5 new gloss keys (en + hi). Frontend: render gloss sub-lines in `EvidencePanel` and a headline strip in `AnswerCard` based on chart type.

**Tech Stack:** FastAPI (Python), React + TypeScript + Vite, Recharts, Tailwind CSS

---

## Global Constraints

- Response contract LOCKED per ARCHITECTURE.md §4 — no shape changes, only additive dict keys in `explanations`
- DESIGN.md color palette (Abyssal) — reuse existing muted mono styling for gloss text
- Bilingual: all new glosses must have both `en` and `hi` strings in `_build_explanations`
- No new API fields, no new LLM calls — deterministic dict only
- Windows/PowerShell: use `;` not `&&`, Python urllib for HTTP tests, `python -m pytest` for tests

---

## File Structure

| File | Responsibility |
|------|----------------|
| `backend/app/main.py:349` | `_build_explanations` — returns dict with gloss keys |
| `frontend/src/components/chat/EvidencePanel.tsx` | Renders "How I got this" panel — add gloss sub-lines |
| `frontend/src/components/chat/AnswerCard.tsx` | Renders answer + confidence + DataContext + EvidencePanel — add answer strip |

---

## Task 1: Expand Backend `_build_explanations`

**Files:**
- Modify: `backend/app/main.py:349-365`

**Interfaces:**
- Consumes: `(floats_used: list[str], qc_excluded_count: int, time_range: str, language: Literal["en","hi"])`
- Produces: `dict[str, str]` with keys: `floats_used`, `readings`, `qc_excluded`, `usable`, `calculation`, `time_range`, `sql`

- [ ] **Step 1.1: Write failing test for new gloss keys**

```python
# backend/tests/test_explanations.py (create if not exists)
from app.main import _build_explanations

def test_build_explanations_contains_all_keys_en():
    floats = ["2900226", "2900227"]
    result = _build_explanations(floats, 123, "2023-01 to 2023-12", "en")
    assert set(result.keys()) >= {"floats_used", "readings", "qc_excluded", "usable", "calculation", "time_range", "sql"}
    assert "robotic ocean sensors" in result["floats_used"].lower()
    assert "single depth" in result["readings"].lower()
    assert "QC flag 4" in result["qc_excluded"]
    assert "passed quality checks" in result["usable"].lower()
    assert "mean (average)" in result["calculation"].lower()
    assert "dates the data spans" in result["time_range"].lower()

def test_build_explanations_contains_all_keys_hi():
    floats = ["2900226"]
    result = _build_explanations(floats, 42, "2023", "hi")
    assert "readings" in result
    assert "usable" in result
    assert "calculation" in result
    # Hindi strings present (non-empty)
    assert result["readings"]
    assert result["usable"]
    assert result["calculation"]
```

- [ ] **Step 1.2: Run test to verify it fails**

```bash
cd C:\Users\Garvi\Desktop\Projects\FloatChat\backend
python -m pytest tests/test_explanations.py -v
# Expected: FAIL (keys missing, gloss text missing)
```

- [ ] **Step 1.3: Implement expanded `_build_explanations`**

Edit `backend/app/main.py:349-365` — replace the function with expanded dict:

```python
def _build_explanations(
    floats_used: list[str], qc_excluded_count: int, time_range: str, language: str
) -> dict[str, str]:
    """Build simple explanations for explainability terms."""
    if language == "hi":
        return {
            "floats_used": f"{len(floats_used)} फ्लोट्स (समुद्री डेटा एकत्र करने वाले उपकरण) का उपयोग किया गया",
            "readings": "रीडिंग एक माप है जो किसी विशेष गहराई और समय पर फ्लोट द्वारा ली जाती है।",
            "qc_excluded": f"{qc_excluded_count} रीडिंग्स गुणवत्ता जांच में विफल होने के कारण बाहर रखी गईं",
            "usable": "यह उन रीडिंग्स का प्रतिशत है जो गुणवत्ता जांच पास कर चुकी हैं और उपयोग की जा सकती हैं।",
            "calculation": "दिखाया गया मूल्य सभी वैध रीडिंग्स का माध्य (औसत) है।",
            "time_range": f"डेटा अवधि: {time_range}" if time_range else "कोई विशिष्ट समय सीमा नहीं",
            "sql": "यह वह डेटाबेस क्वेरी है जिसका उपयोग डेटा प्राप्त करने के लिए किया गया",
        }
    return {
        "floats_used": f"{len(floats_used)} ARGO floats (ocean data collectors) were used for this answer",
        "readings": "A reading is one measurement taken at a single depth and time by a float.",
        "qc_excluded": f"{qc_excluded_count} readings were excluded because they failed quality checks (QC flag 4 at ingestion)",
        "usable": "The share of readings that passed quality checks and could be used.",
        "calculation": "The value shown is the mean (average) computed across all valid readings.",
        "time_range": f"Data covers: {time_range}" if time_range else "No specific time range",
        "sql": "This is the database query used to fetch the data",
    }
```

- [ ] **Step 1.4: Run test to verify it passes**

```bash
cd C:\Users\Garvi\Desktop\Projects\FloatChat\backend
python -m pytest tests/test_explanations.py -v
# Expected: PASS
```

- [ ] **Step 1.5: Commit**

```bash
git add backend/app/main.py backend/tests/test_explanations.py
git commit -m "backend: expand explanations glossary with readings, usable, calculation"
```

---

## Task 2: Add Gloss Sub-lines in EvidencePanel

**Files:**
- Modify: `frontend/src/components/chat/EvidencePanel.tsx`

**Interfaces:**
- Consumes: `info: Explainability` (has `explanations?: Record<string,string>`), optional `region`, `observations`, `quality`, `calculation`
- Produces: Renders rows with optional muted sub-line from `info.explanations[key]`

- [ ] **Step 2.1: Write failing test for EvidencePanel gloss rendering**

```tsx
// frontend/src/components/chat/EvidencePanel.test.tsx (create)
import { render, screen } from "@testing-library/react";
import { EvidencePanel } from "./EvidencePanel";

const mockExplainability = {
  sql: "SELECT ...",
  floats_used: ["2900226"],
  qc_excluded_count: 123,
  time_range_queried: "2023-01",
  explanations: {
    floats_used: "ARGO floats are robotic ocean sensors...",
    readings: "A reading is one measurement...",
    qc_excluded: "123 readings excluded...",
    usable: "Share of readings that passed...",
    calculation: "The value is the mean...",
    time_range: "Data covers: 2023-01",
  },
};

test("renders gloss sub-lines under rows when explanations exist", () => {
  render(<EvidencePanel info={mockExplainability} observations={500} quality={85} calculation="monthly mean" />);
  // Open panel
  fireEvent.click(screen.getByText("How I got this"));
  // Check gloss sub-lines exist
  expect(screen.getByText(/robotic ocean sensors/i)).toBeInTheDocument();
  expect(screen.getByText(/single measurement/i)).toBeInTheDocument();
  expect(screen.getByText(/passed quality checks/i)).toBeInTheDocument();
  expect(screen.getByText(/mean \(average\)/i)).toBeInTheDocument();
});
```

- [ ] **Step 2.2: Run test to verify it fails**

```bash
cd C:\Users\Garvi\Desktop\Projects\FloatChat\frontend
npm test -- src/components/chat/EvidencePanel.test.tsx
# Expected: FAIL (no gloss sub-lines rendered)
```

- [ ] **Step 2.3: Implement EvidencePanel with gloss sub-lines**

Edit `EvidencePanel.tsx` — map rows to `explanationKey`, render sub-line if `info.explanations[key]` exists:

```tsx
// Inside EvidencePanel component, replace rows array construction:
const rows: { label: string; value: string; explanationKey?: string }[] = [
  { label: "data source", value: info.floats_used.length ? `ARGO float(s): ${info.floats_used.join(", ")}` : "no float attributed", explanationKey: "floats_used" },
  ...(observations ? [{ label: "observations", value: observations.toLocaleString(), explanationKey: "readings" }] : []),
  { label: "date range", value: info.time_range_queried || "\u2014", explanationKey: "time_range" },
  ...(region ? [{ label: "region", value: region, explanationKey: undefined }] : []),
  { label: "quality checks", value: `${info.qc_excluded_count.toLocaleString()} readings excluded (QC flag 4 at ingestion)`, explanationKey: "qc_excluded" },
  ...(calculation ? [{ label: "calculation", value: calculation, explanationKey: "calculation" }] : []),
  ...(quality ? [{ label: "usable readings", value: `${quality}%`, explanationKey: "usable" }] : []),
];

// In the JSX map, add sub-line rendering:
{rows.map(({ label, value, explanationKey }) => (
  <div key={label} className="font-mono text-xs">
    <span className="mr-2 text-muted-foreground/60">{label}:</span>
    <span className="text-foreground">{value}</span>
    {explanationKey && info.explanations?.[explanationKey] && (
      <div className="mt-0.5 text-[11px] text-muted-foreground/70 leading-relaxed">
        {info.explanations[explanationKey]}
      </div>
    )}
  </div>
))}
```

- [ ] **Step 2.4: Run test to verify it passes**

```bash
cd C:\Users\Garvi\Desktop\Projects\FloatChat\frontend
npm test -- src/components/chat/EvidencePanel.test.tsx
# Expected: PASS
```

- [ ] **Step 2.5: Commit**

```bash
git add frontend/src/components/chat/EvidencePanel.tsx frontend/src/components/chat/EvidencePanel.test.tsx
git commit -m "fe: add gloss sub-lines to EvidencePanel"
```

---

## Task 3: Add Answer Strip in AnswerCard

**Files:**
- Modify: `frontend/src/components/chat/AnswerCard.tsx`

**Interfaces:**
- Consumes: `text: string`, `response: QueryResponse` (has `chart_type`, `explainability.explanations`)
- Produces: Renders brief gloss strip under answer text for headline term per chart type

- [ ] **Step 3.1: Write failing test for AnswerCard answer strip**

```tsx
// frontend/src/components/chat/AnswerCard.test.tsx (create)
import { render, screen } from "@testing-library/react";
import { AnswerCard } from "./AnswerCard";

const mockResponse = {
  answer_text: "Temperature is 25°C",
  language: "en",
  chart_type: "depth_profile",
  chart_data: { type: "depth_profile", depths_m: [10, 100], temperatures_c: [25, 20], salinities_psu: [35, 35] },
  confidence: "high",
  confidence_note: "",
  refusal_reason: "",
  explainability: {
    sql: "SELECT ...",
    floats_used: ["2900226"],
    qc_excluded_count: 5,
    time_range_queried: "2023",
    explanations: {
      floats_used: "ARGO floats are robotic ocean sensors that drift and measure temperature/salinity.",
      readings: "A reading is one measurement...",
      qc_excluded: "5 readings excluded...",
      usable: "Share...",
      calculation: "Mean...",
      time_range: "Data covers: 2023",
    },
  },
};

test("renders answer strip with floats gloss for depth_profile", () => {
  render(<AnswerCard text="Temperature is 25°C" response={mockResponse} />);
  expect(screen.getByText(/robotic ocean sensors/i)).toBeInTheDocument();
});

test("renders answer strip with readings gloss for time_series", () => {
  const tsResponse = { ...mockResponse, chart_type: "time_series", chart_data: { type: "time_series", months: ["2023-01"], values: [25], unit: "°C", label: "Temp" } };
  render(<AnswerCard text="Temp rose" response={tsResponse} />);
  expect(screen.getByText(/single measurement/i)).toBeInTheDocument();
});

test("does not render strip when chart_type is none", () => {
  const noneResponse = { ...mockResponse, chart_type: "none", chart_data: { type: "none" } };
  render(<AnswerCard text="No data" response={noneResponse} />);
  expect(screen.queryByText(/robotic ocean sensors/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 3.2: Run test to verify it fails**

```bash
cd C:\Users\Garvi\Desktop\Projects\FloatChat\frontend
npm test -- src/components/chat/AnswerCard.test.tsx
# Expected: FAIL (no answer strip rendered)
```

- [ ] **Step 3.3: Implement AnswerCard answer strip**

Edit `AnswerCard.tsx` — add strip rendering logic after `highlightNumbers(text)` paragraph, before `ConfidenceBadge`:

```tsx
// Add near top of AnswerCard:
function getHeadlineGlossKey(chartType: ChartType): string | null {
  switch (chartType) {
    case "depth_profile":
    case "trajectory":
    case "metadata": return "floats_used";
    case "time_series":
    case "heatmap": return "readings";
    case "comparison": return "calculation";
    default: return null;
  }
}

// In the JSX, after the <p> with highlightNumbers(text):
{(() => {
  const key = getHeadlineGlossKey(response.chart_type);
  const gloss = key ? response.explainability.explanations?.[key] : null;
  return gloss ? (
    <div className="mt-2 mb-1 px-3.5 text-[12px] leading-relaxed text-muted-foreground/70 font-mono">
      {gloss}
    </div>
  ) : null;
})()}
```

Place it inside the outer `<article>` but before the `ConfidenceBadge` div.

- [ ] **Step 3.4: Run test to verify it passes**

```bash
cd C:\Users\Garvi\Desktop\Projects\FloatChat\frontend
npm test -- src/components/chat/AnswerCard.test.tsx
# Expected: PASS
```

- [ ] **Step 3.5: Commit**

```bash
git add frontend/src/components/chat/AnswerCard.tsx frontend/src/components/chat/AnswerCard.test.tsx
git commit -m "fe: add answer strip with headline gloss per chart type"
```

---

## Task 4: End-to-end Smoke Test

**Files:**
- None new

**Interfaces:**
- Consumes: Full stack running (backend + frontend)

- [ ] **Step 4.1: Start backend**

```bash
cd C:\Users\Garvi\Desktop\Projects\FloatChat\backend
python run_server.py
```

- [ ] **Step 4.2: Test /query for each chart type (en + hi)**

```bash
python -c "
import json, urllib.request
tests = [
  ('depth_profile', 'Show temperature profile for float 2900226'),
  ('trajectory', 'Trajectory of float 2900226'),
  ('time_series', 'Average temperature in Bay of Bengal 2023'),
  ('comparison', 'Compare Arabian Sea temp March 2023 vs baseline'),
  ('metadata', 'Status of float 2900226'),
]
for ct, q in tests:
  for lang in ['en', 'hi']:
    url = 'http://localhost:8000/query'
    data = json.dumps({'question': q, 'language': lang}).encode()
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
      res = json.loads(r.read().decode())
      keys = set(res['explainability'].get('explanations', {}).keys())
      expected = {'floats_used', 'readings', 'qc_excluded', 'usable', 'calculation', 'time_range', 'sql'}
      assert expected.issubset(keys), f'{ct} {lang} missing {expected - keys}'
      print(f'✓ {ct} {lang}: all {len(keys)} keys present')
"
```

- [ ] **Step 4.3: Build frontend and verify no TypeScript errors**

```bash
cd C:\Users\Garvi\Desktop\Projects\FloatChat\frontend
npm run build
# Expected: builds successfully
```

- [ ] **Step 4.4: Manual dev-server verification**

```bash
cd C:\Users\Garvi\Desktop\Projects\FloatChat\frontend
npm run dev
# Open http://localhost:5173
# Test each query: strip under answer appears; "How I got this" panel shows gloss sub-lines
```

- [ ] **Step 4.5: Commit**

```bash
git add -A
git commit -m "feat: plain-language term explanations (answer strip + panel glosses)"
```

---

## Self-Review Checklist (run after writing plan)

- [ ] **Spec coverage:** All 5 terms (floats, readings, QC, usable, calculation) covered in backend + panel + strip
- [ ] **Placeholder scan:** No TBD/TODO — all code blocks are concrete
- [ ] **Type consistency:** `explanations` dict keys match between backend and frontend; `Explainability` type already has `explanations?`
- [ ] **Contract safety:** Only additive dict keys, no response shape change
- [ ] **Bilingual:** Hindi glosses included for all 5 new keys
- [ ] **Testability:** Each task has failing-test-first flow, independently runnable