# FloatChat — Demo Script & Pitch Narrative
**Internal Hackathon | Target runtime: 6-8 minutes**

---

## 1. Narrative Arc

Most teams will structure their pitch as: *problem → solution → demo → tech stack*.
FloatChat's pitch inverts the usual demo order — **lead with a hard case, not an easy
win** — because the differentiators (trust, honesty, insight) only land if judges see
the system handle difficulty gracefully before they see it handle the easy stuff well.

**Arc: Problem → Trust-first demo → Insight demo → Vernacular beat → Architecture → Close**

---

## 2. Opening (30-45 sec)

> "ARGO ocean floats generate scientifically critical data — but it's locked in NetCDF
> files only trained oceanographers can query. Every team building this problem statement
> will show you a chatbot that answers ocean questions. We're going to show you something
> different: a chatbot that **knows when not to trust itself** — because a scientist would
> never trust a black-box AI with real ocean data, and we didn't want to build one they
> couldn't trust either."

Do not explain every feature up front. Let the demo reveal them.

---

## 3. Demo Beat 1 — Lead with the Hard Case (90 sec)

**Ask a deliberately sparse/low-quality-data question live.**

> "Let's start somewhere most demos wouldn't dare — a region with genuinely thin data."

Type: *"What was the salinity near the Andaman Islands in January 2019?"*

- FloatChat returns an answer **with a visible low-confidence badge**
- Say out loud: *"Notice it didn't just give us a confident-looking number. It's telling
  us exactly why to be skeptical — float coverage was thin, or **QC failure rate was
  high**. Most systems would silently interpolate and hand you a clean chart anyway."*

**Then show an out-of-scope refusal.**

Type: *"What's the ocean temperature near California?"*

> "And when a question is genuinely outside our dataset, it says so — it doesn't
> fabricate an answer to seem helpful."

**Why this beat first:** it immediately differentiates you before judges get demo
fatigue from watching 15 teams show a chart appear after a question.

---

## 4. Demo Beat 2 — Trust Mechanics on a Real Answer (90 sec)

Type: *"What was the temperature at different depths near Mumbai in December 2023?"*

- Depth-profile chart renders
- Click **"How I got this"** — expand the explainability drawer live
- Narrate: *"This is the actual SQL query generated from natural language, the specific
  float IDs used, and how many readings we excluded for failing quality checks. Nothing
  here is a black box."*

This is the single most memorable beat if delivered well — pause on it, don't rush past.

---

## 5. Demo Beat 3 — Insight, Not Just Retrieval (90 sec)

Type: *"Was March 2023 unusually warm in the Arabian Sea?"*

- Comparison chart renders: target period vs. 5-year baseline
- Narrate: *"This isn't a lookup anymore — it's telling us something happened. This is
  the kind of question a climate analyst actually asks, not just 'what was the number.'"*

Tie explicitly to MoES's mandate: *"This is directly useful for the kind of ocean-climate
monitoring this ministry already cares about."*

---

## 6. Demo Beat 4 — Vernacular Access (45-60 sec)

Type in Hindi: *"मुंबई के पास पिछले महीने समुद्र का तापमान कितना था?"*

- Full round trip: Hindi in, Hindi-language answer + chart out
- Narrate: *"Ocean data affects coastal and fishing communities directly, and most of them
  don't query databases in English. This isn't a translation bolt-on — it's a first-class
  path through the same trust pipeline you just watched."*

---

## 7. Architecture Beat (45 sec, 1 slide)

Show the architecture diagram (from `ARCHITECTURE.md`) for ~30-45 seconds max — judges
skim this, don't narrate every box:

> "Real ARGO NetCDF data, ingested and quality-filtered upfront — not at query time. A
> guardrail layer that never lets the LLM touch the database directly — it only ever
> generates SQL that's validated, restricted, and executed read-only. That separation is
> what makes the trust story possible — it's not just UI polish, it's architectural."

---

## 8. Close (30 sec)

> "Every team here will show you a chatbot that answers ocean questions. We built one
> that tells you when to doubt it, explains every answer it gives, and speaks the
> language of the people this data should actually reach. That's FloatChat."

---

## 9. Q&A Prep — Likely Judge Questions

| Question | Answer direction |
|---|---|
| "How do you handle hallucination?" | Two-call separation (SQL generation vs. answer phrasing), guardrail layer, explainability panel, plus "the model never has raw DB access" |
| "Is this real data or synthetic?" | Point to source (INCOIS/Ifremer), specific region/date range ingested, mention any validation against known events if you did it |
| "How does this scale beyond the Indian Ocean?" | Schema and pipeline are region-agnostic; scope was deliberately narrowed for data quality and demo reliability, not a technical ceiling |
| "What happens with an ambiguous question?" | Show/describe the unsupported-intent path — graceful refusal, not a guess |
| "Why not just use [existing ARGO tool]?" | Existing tools (Ocean Data View, Argovis) require domain expertise to operate; FloatChat's entire value is removing that barrier via natural language, while keeping the trust guarantees a scientist would require |

---

## 10. Rehearsal Checklist

- [ ] Run the exact 4 demo beats live, 3x in a row, no manual intervention
- [ ] Confirm low-confidence badge and refusal message trigger reliably on the chosen queries
- [ ] Time the full run — trim beats if over 8 minutes, don't rush delivery to compress
- [ ] Assign one speaker per beat if presenting as a team, or one speaker + one "driver" typing queries
- [ ] Have the architecture slide ready as a static backup image in case of live rendering issues
