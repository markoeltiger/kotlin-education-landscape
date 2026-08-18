# Maintaining the Kotlin Education Landscape

This is a guide to running and maintaining the project after GSoC. I wrote it for whoever picks this up next, so it assumes you know Python and git but nothing about how this particular thing is wired together.

## The short version

The pipeline finds where Kotlin is taught — universities, MOOCs, and GitHub repos — and puts it all in one MongoDB database. A set of collector scripts pull the raw data, a normalizer merges it into a single collection, an AI step reads university pages and tags the real programs with their topics, and export scripts dump everything to JSON files that the dashboard reads.

The dashboard never talks to MongoDB. It reads static JSON files that get committed to the repo. So updating the live site means: re-run the exports, commit the JSON, push. Railway redeploys on its own.

## Setup

You need Python 3.10+, a MongoDB Atlas cluster, and a DeepSeek API key (for the AI parts). Node is only needed if you touch the dashboard frontend.

```bash
pip install pymongo python-dotenv requests playwright
playwright install chromium firefox
```

Make a `.env` in the project root:

```
MONGODB_URI=mongodb+srv://...
DEEPSEEK_API_KEY=sk-...
SERPER_API_KEY=...                       # optional, only for university search
PROXY_URL=http://user:pass@host:port     # optional, only for browser search
```

Don't commit it. It should already be in `.gitignore` — double check.

## What's in the database

The database is `kotlin_edu`. These are the collections that matter:

- `github_repos` — raw GitHub repos, ~14k
- `mooc_courses` — Coursera and Stepik courses, ~64
- `university_findings` — university course pages we found, ~445
- `serp_progress` — tracks which universities we've searched and how it went (this is what lets the search resume)
- `courses_unified` — everything merged together, the main dataset, ~14k
- `programs` — university pages the AI confirmed are real Kotlin programs, with topics/level/etc, ~327
- `baseline` — the comparison against the official kotlinlang.org list

There's also some junk you can ignore: `courses_unified_backup`, `serp_progress_backup`, `university_findings_backup` are old backups, and `courses`, `serp`, `cc_progress`, `youtube_courses` are leftovers from experiments that didn't go anywhere. Safe to delete the experiments; keep the backups around until you trust the live data.

## Running the pipeline

Each step reads from the step before it. You don't have to run all of them every time — usually you just re-export and push.

**Collecting.** The collectors upsert, so re-running them doesn't create duplicates.

```bash
python github_kotlin.py                           # -> github_repos
python mooc_kotlin.py                             # -> mooc_courses
python search_kotlin_in_universties.py --strict   # -> university_findings + serp_progress
```

The university one is the flaky part. It searches the web, and web search is rate-limited and full of CAPTCHAs. It uses free engines first and falls back to the Serper API. The Serper free credits are already used up, so a big new crawl needs either fresh Serper credits or the browser top-up (more on that below). The ~445 findings we have are fine as they are — you don't need to re-collect them.

**Normalizing.** This merges the three raw collections into `courses_unified` and works out the signal tier, learning type, cleans up country names, and resolves Stepik author IDs to real names.

```bash
python normalizer.py
```

**AI enrichment.** This is the part that reads each university page and decides if it's actually a Kotlin course (not just a page that mentions Kotlin), then pulls out the program name, topics, level, prerequisites, language, and credits.

```bash
python enrich_programs_browser.py --course-only --limit 100
```

Use this one, not the plain-HTTP version. A lot of university sites render their pages with JavaScript, so a normal HTTP fetch gets back an empty shell and the AI thinks there's no course there. This version uses a real browser (Chromium) so it actually sees the content. It skips pages it's already done, so you can stop and restart it. Results land in `programs`.

**Exporting.** This is what feeds the dashboard.

```bash
python export_for_dashboard.py public/data   # courses_unified.json, serp_progress.json, baseline_comparison.json
python export_programs.py public/data        # programs.json, topics.json
python generate_insights.py public/data      # insights.json (AI blurb per chart)
```

**Publishing.** Railway watches the repo and redeploys when you push.

```bash
git add public/data
git commit -m "refresh dataset"
git push
```

## The thing you'll actually do most often

Ninety percent of the time you just want to update the dashboard with fresh data:

```bash
python normalizer.py
python export_for_dashboard.py public/data
python export_programs.py public/data
python generate_insights.py public/data
git add public/data && git commit -m "refresh dataset" && git push
```

If you only re-ran the AI enrichment, you only need `export_programs.py` and the push.

## Other scripts worth knowing

- `stats.py` — prints a summary of everything in the database
- `which_scripts.py` — shows collection sizes and where the data came from, handy if you're trying to figure out what produced what
- `baseline_compare.py` — compares our universities against the official kotlinlang.org list
- `netnew_universities.py` — lists universities we found that aren't on the official list
- `diagnose_miss.py` — checks why a specific university didn't turn up

## The dashboard

It's a TanStack Start app (React + TypeScript) on Railway. It reads the JSON files in `public/data/` and that's it — no backend, no database connection. The files it looks for are `courses_unified.json`, `serp_progress.json`, `baseline_comparison.json`, `programs.json`, `topics.json`, and `insights.json`. If one's missing the related charts just hide themselves instead of breaking.

Change the frontend to change what's shown; re-run the exports to change the data.

## Growing the university data

This is the hard part, so here's the honest state of it. Google and the other search engines block automated searching hard, and I spent a lot of time confirming that the hard way. What actually works:

- **Serper API** — this is what got us most of the way. Clean results, no CAPTCHAs, but the free credits are gone. New credits would let the normal university search run at scale again. Easiest path if you want more data.
- **Google Programmable Search API** — official, 100 free queries a day, no CAPTCHAs. Good for topping up specific universities. It's not wired into the pipeline yet but it's the sane free option.
- **Browser search** (`firefox_capsolver_search.py`) — drives a real Firefox with a proxy and CapSolver to get through CAPTCHAs. It works but it's slow and needs supervision; a session gets about 80 searches before it needs a fresh IP. Only worth it for filling specific gaps.

The pile of other scripts — `browser_search_*.py`, `tls_search.py`, `direct_site_search.py`, the commoncrawl and opensyllabus ones — are all things I tried that didn't work out. They're still in the repo but they're not part of the pipeline. Ignore them or delete them.

## When something breaks

**University search returns nothing and CAPTCHAs right away.** That's expected, free Google scraping is blocked. Use Serper credits or the Google API instead of fighting it.

**The AI says a real course isn't a program.** The page is almost certainly JavaScript-rendered and the fetch got an empty page. Use `enrich_programs_browser.py`, which renders in a real browser.

**A dashboard chart is empty.** Its JSON file is missing from `public/data/` or didn't get committed. Re-run the export that makes it and push.

**Dashboard shows old data.** You didn't re-export or didn't push. The data only changes when you export and push — there's no live connection.

## Before handing this off

The `.env` got committed a few times during development, so the MongoDB URI, DeepSeek key, Serper key, and proxy password are all in the git history. Rotate all of them before this goes public or changes hands, and make sure `.env` is gitignored going forward. The dashboard itself is safe to be public — it's read-only and ships no credentials.

Quick checklist:

- rotate every secret and confirm `.env` is ignored
- clear out the backup and experiment collections once you trust the live data
- make sure the six JSON files in `public/data/` are current and committed
- confirm Railway is still connected to the repo
- update this file if you change any of the scripts
