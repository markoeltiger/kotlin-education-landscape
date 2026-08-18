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

## The orchestrator (`pipeline/main.py`)

The main entry point for running the entire pipeline or its individual phases is [pipeline/main.py](file:///Users/markseif/Desktop/Projects/kotlin-education-landscape/pipeline/main.py).

```bash
# Run everything
python pipeline/main.py --all

# Run specific tasks
python pipeline/main.py --scrape
python pipeline/main.py --normalize
python pipeline/main.py --enrich --limit 100
python pipeline/main.py --export
```

---

## The collectors

### `scraper/universties/search_kotlin_unis_playright.py` — university discovery
Reads a global list of universities and their domains, then searches each one for Kotlin course pages.

- **Engine fallback:** tries Google, DuckDuckGo, Bing, falling back to the Serper API when free engines are blocked.
- **Relevance filtering:** a result is kept only if it is on the university's domain, mentions Kotlin as a whole word, and shows a course signal.
- **Resumable:** status tracked in the `serp_progress` collection.

```bash
python scraper/universties/search_kotlin_unis_playright.py --strict --limit 100
```

### `scraper/github/find_kotlin_in_github.py` — GitHub repositories
Collects Kotlin educational repos and classifies each by type.

```bash
python scraper/github/find_kotlin_in_github.py
```

### `scraper/MOOCs/find_kotlin_in_moocs.py` — online courses
Unified collector for Coursera and Stepik.

```bash
python scraper/MOOCs/find_kotlin_in_moocs.py
```

---

## Processing & Exports

### `pipeline/normalizer.py`
Merges the raw collections into `courses_unified`.

```bash
python pipeline/normalizer.py
```

### `pipeline/enrich_programs.py`
Enriches university findings using AI/LLM analysis to confirm if they are real Kotlin courses and extract details.

```bash
python pipeline/enrich_programs.py --course-only --limit 50
```

### `pipeline/export_programs.py` & `export_courses_unified.py`
Exports database collections to local static JSON files in `dashboard/public/data/` for the React dashboard.

```bash
python pipeline/export_courses_unified.py dashboard/public/data
python pipeline/export_programs.py dashboard/public/data
```

### `scraper/stats.py`
Read-only summary across every collection.

```bash
python scraper/stats.py
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
# 1. Run the entire pipeline (scrape, normalize, enrich, export)
python pipeline/main.py --all

# Or run individual steps via the main orchestrator:
python pipeline/main.py --scrape
python pipeline/main.py --normalize
python pipeline/main.py --enrich --limit 100
python pipeline/main.py --export --output-dir dashboard/public/data

# 2. Inspect database collections status
python scraper/stats.py

# 3. Export Tableau CSVs
python dashboard/export_tableau.py
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