# Kotlin Education Landscape

An automated pipeline that discovers **where and how Kotlin is taught worldwide** — across university websites, online course platforms (MOOCs), and open-source repositories — and unifies the results into a single queryable dataset with an interactive dashboard.

GSoC 2026 · Kotlin Foundation

---

## Why this exists

The Kotlin Foundation maintains a list of universities teaching Kotlin at
[kotlinlang.org/education](https://kotlinlang.org/education/). That list is **manually curated and opt-in** — a university appears only when an educator emails the Foundation. It is accurate but inherently incomplete: any institution teaching Kotlin that never reached out is invisible.

This project takes the opposite approach: **automated discovery**. Instead of waiting for schools to self-report, it searches the open web for evidence of Kotlin education and assembles the results programmatically. The goal is to complement (and eventually help expand) the manual list by surfacing courses, repositories, and programs it doesn't yet know about.

---

## What it collects

| Source | What | Approx. volume |
|--------|------|----------------|
| **Universities** | Course/syllabus pages on university domains | ~10,200 institutions searched → ~217 with Kotlin teaching found |
| **GitHub** | Educational repositories (courses, workshops, tutorials, book companions) | ~13,600 repos, classified by type |
| **MOOCs** | Online courses on Coursera and Stepik | 64 courses |

All sources flow into one unified collection (`courses_unified`) with a consistent schema, so the whole landscape can be queried and visualized together.

---

## Architecture

```
   collectors                 storage              processing          output
 ┌──────────────┐         ┌──────────────┐     ┌──────────────┐   ┌──────────────┐
 │ universities │──┐      │              │     │              │   │  dashboard   │
 │ github       │──┼────► │  MongoDB     │───► │ normalizer   │──►│  (HTML)      │
 │ moocs        │──┘      │  kotlin_edu  │     │              │   │  Tableau CSV │
 └──────────────┘         └──────────────┘     └──────────────┘   └──────────────┘
```

1. **Collect** — each source has its own collector that writes raw findings to MongoDB.
2. **Normalize** — merges the three raw collections into `courses_unified` with shared fields (`source`, `signal_tier`, `learning_type`, `country`, `provider`, …).
3. **Visualize** — export to CSV and open the dashboard, or connect the CSV to Tableau.

---

## The collectors

### `search_kotlin_in_universties.py` — university discovery
The core of the project. Reads a global list of universities and their domains, then searches each one for Kotlin course pages.

- **Engine fallback:** tries Google → DuckDuckGo → Bing (via a local [OpenSERP](https://github.com/karust/openserp) server), falling back to the **Serper API** only when all three free engines are blocked — conserving Serper credits for the hard cases.
- **Relevance filtering:** a result is kept only if it is on the university's domain, mentions Kotlin as a whole word, **and** shows a course signal (course/syllabus/module/curriculum/degree terms in the title, snippet, or URL path). Word-boundary matching avoids false positives.
- **Resumable:** every attempt is recorded in `serp_progress` with a status (`found` / `no_match` / `empty` / `failed`). Re-running skips completed schools; `--retry-failed` re-attempts only those where engines failed.

```bash
python search_kotlin_in_universties.py --strict --workers 4
python search_kotlin_in_universties.py --strict --retry-failed --workers 4
```

Key flags: `--strict` (require a course signal), `--workers N` (parallelism), `--retry-failed`, `--no-serper`, `--debug`.

### `github_kotlin.py` — GitHub repositories
Collects Kotlin educational repos and classifies each by type (course, workshop, tutorial, book companion, library, personal). Assigns an `edu_confidence` score used later for tiering.

### `mooc_kotlin.py` — online courses
Unified collector for Coursera and Stepik. Coursera is paged from the full catalog and filtered locally; Stepik uses its public search API. (Udemy's API was discontinued and is effectively unavailable.)

### `proxy_rotator.py` — proxy helper (optional)
A small local rotator that cycles a pool of residential proxies behind a single endpoint, for use with OpenSERP when running the university collector at scale.

---

## Processing

### `normalizer.py`
Merges the three raw collections into `courses_unified`. It:

- assigns **`signal_tier`** — `primary` for genuinely course-like content (university course pages; GitHub course/workshop/book repos with confidence ≥ 0.75; all MOOCs), `secondary` for supporting material (tutorials, libraries, non-course pages);
- assigns **`learning_type`** — `formal` (universities, structured MOOC platforms) vs `informal` (GitHub, community content);
- resolves **Stepik author IDs to names** via Stepik's public API;
- pulls **country** where available (university findings, GitHub owner location).

```bash
python normalizer.py
```

### `stats.py`
Read-only summary across every collection: sizes, GitHub breakdown by type/confidence, MOOC providers, university countries and top institutions, and crawl outcomes. Run it any time to see the current state of the data.

```bash
python stats.py
```

---

## Output

### `kotlin_dashboard.html` — interactive dashboard
A self-contained HTML file (no server, no build step). Open it, load the exported CSV, and explore:

- a **world map** shaded by universities discovered per country;
- **breakdowns** by source, signal tier, learning type, GitHub repo type, and MOOC platform;
- **top countries and providers**;
- a **sortable data table** of all records;
- **filters** — primary-only toggle, source, tier, popularity/stars range, live search, and **click-a-country-to-filter** on the map.

### `export_tableau.py`
Exports `courses_unified` to Tableau-ready CSVs (a full file and a universities-only file with cleaned country names for reliable geocoding).

```bash
python export_tableau.py
```

---

## Data schema (`courses_unified`)

| Field | Description |
|-------|-------------|
| `source` | `university_website`, `github`, `coursera`, `stepik` |
| `category` | `university_page`, `repository`, `online_course` |
| `signal_tier` | `primary` (course-like) or `secondary` (supporting) |
| `learning_type` | `formal` or `informal` |
| `title`, `url`, `provider` | identifying fields |
| `country` | institution country (where known) |
| `subtype` | repo type, content type, or `mooc` |
| `popularity` | GitHub stars / course enrolment where available |
| `kotlin_confidence` | classifier confidence |

---

## Setup

```bash
pip install -r requirements.txt
```

Create a `.env` file (never commit it):

```
MONGODB_URI=mongodb+srv://...
SERPER_API_KEY=...        # optional — only used as a university-search fallback
```

For the university collector you also need a running OpenSERP server:

```bash
go install github.com/karust/openserp@latest
openserp serve -p 7001
```

---

## Typical workflow

```bash
# 1. collect (each can run independently / resume)
python github_kotlin.py
python mooc_kotlin.py --source all
python search_kotlin_in_universties.py --strict --workers 4

# 2. inspect
python stats.py

# 3. unify
python normalizer.py

# 4. export + visualize
python export_tableau.py
open kotlin_dashboard.html      # then load the exported CSV
```

---

## Current status

- **Collection:** complete across all three sources. University crawl covered ~10,200 institutions with 0 failures remaining.
- **Data quality:** clean global distribution (US, India, Germany, Brazil, Russia, Indonesia leading), no single-source over-scraping, honest primary/secondary split (~5,900 primary / ~8,200 secondary).
- **Dashboard:** working, with map, breakdowns, filters, and data table.

### Next steps

- **Baseline comparison** — diff the discovered universities against the official kotlinlang.org list to quantify how many are rediscovered vs net-new vs missed. This is the headline deliverable.
- **Localization** — current course-term filtering is English-only, which biases toward English-speaking countries; adding multilingual course vocabulary (e.g. *Kurs*, *curso*, *cours*, *課程*) would surface non-English course pages.
- **YouTube** — a built collector for the YouTube Data API, not yet integrated.
- **GitHub classification** — further tighten the confidence model to reduce noise among "course" repositories.

---

## Notes on limitations

- **Discovery, not census.** The pipeline finds *discoverable* Kotlin education. Courses with no public web page, behind logins, or documented only in PDFs or non-English pages may be missed.
- **Search-engine constraints.** Free search engines rate-limit and CAPTCHA at scale; the Serper fallback mitigates but does not eliminate this. The university source is best treated as a strong sample rather than an exhaustive count.
- **Reproducibility.** API collectors (GitHub, Coursera, Stepik) are fully reproducible. The university search depends on external search engines and an optional paid fallback, so exact re-runs may vary; results are stored in MongoDB as the source of truth.