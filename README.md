# Kotlin Education Landscape

Mapping where and how Kotlin is taught worldwide — across universities, MOOCs,
and open-source platforms. Built for the Kotlin Foundation (Google Summer of Code 2026).

The project collects Kotlin teaching data from multiple sources, normalizes it
into one open dataset, and visualizes it in a Tableau dashboard.

## Pipeline

```
collect (scrapers) ──> MongoDB ──> normalize ──> unified dataset (CSV) ──> Tableau
```

- **Collection** writes raw findings into MongoDB (one collection per source).
- **Normalization** merges them into a single `courses_unified` schema + CSV.
- **Analysis / dashboard** read from the unified dataset.

## Data sources

| Source | What it covers | Access |
|---|---|---|
| GitHub | Kotlin course / tutorial / workshop repositories | API (no blocking) |
| Coursera | Kotlin MOOCs + provider universities | Public API |
| Stepik | Kotlin courses incl. JetBrains Academy / Hyperskill | Public API |
| Udemy | Kotlin marketplace courses | Scrape (API discontinued 2025) |
| University websites | Kotlin courses / syllabi / module handbooks | Search + crawl |
| Open Syllabus | Syllabi assigning Kotlin textbooks | Explorer / API |

### University data sources

- **Hipo university-domains-list**(https://github.com/hipo/university-domains-list) — 10,249 universities (name, domain, country) (fetch latst update when rebuild).


### Scraping / collection libraries

- `requests` — HTTP for all API collectors.
- `pymongo` — MongoDB storage.
- `python-dotenv` — load secrets from `.env`.
- `cdx_toolkit` — query the Common Crawl index (university web pages).
- `OpenSERP`(https://github.com/karust/openserp) (self-hosted) — search-engine results with reliable `site:` scoping.

## Project structure

```
data/        static inputs (Hipo, CSRankings)
scrapers/    collection scripts (github, moocs, universities, opensyllabus)
pipeline/    normalize.py — unify sources into one dataset
.github/     GitHub Actions workflow (collect + normalize on demand)
output/      generated unified CSV
```

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env        # then fill in MONGODB_URI (and optional keys)
```

## Usage

```bash
# collect
python scrapers/github/find_kotlin_in_github.py
python scrapers/moocs/find_kotlin_in_moocs.py 
python scrapers/universities/find_kotlin_in_universities.py

# normalize into the unified dataset + CSV
python pipeline/normalize.py
```

The GitHub Actions workflow (Actions tab → "Run workflow") runs the GitHub
collector and normalizer on demand and uploads the unified CSV as an artifact.

## Notes

- API sources (GitHub, Coursera, Stepik) run anywhere, including CI.
- Scraping sources (Udemy, university search) run locally — datacenter IPs get
  blocked, so these are not run in CI.
- Course descriptions are stored truncated; the dataset holds metadata + links,
  not republished copyrighted text.