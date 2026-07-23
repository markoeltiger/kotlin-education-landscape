# Kotlin Education Landscape — data export

The dashboard reads three static JSON files from `public/data/`:

- `courses_unified.json` (required) — array of records
- `serp_progress.json` (required) — array of crawl events
- `baseline_comparison.json` (optional) — single object

Replace the shipped sample files with your real Mongo export using the snippets below.

## `courses_unified.json`

```python
import json, os
from pymongo import MongoClient

client = MongoClient(os.environ["MONGODB_URI"])
db = client.kotlin_edu

fields = {"_id": 0, "source": 1, "category": 1, "signal_tier": 1,
          "learning_type": 1, "title": 1, "url": 1, "provider": 1,
          "country": 1, "language": 1, "subtype": 1, "popularity": 1,
          "kotlin_confidence": 1}

rows = list(db.courses_unified.find({}, fields))
with open("public/data/courses_unified.json", "w") as f:
    json.dump(rows, f, separators=(",", ":"))
```

## `serp_progress.json`

```python
fields = {"_id": 0, "name": 1, "country": 1, "domain": 1,
          "status": 1, "engine": 1, "raw_results": 1, "kept": 1, "dropped": 1}
rows = list(db.serp_progress.find({}, fields))
with open("public/data/serp_progress.json", "w") as f:
    json.dump(rows, f, separators=(",", ":"))
```

## `baseline_comparison.json`

Single object with these keys (all integers):

```json
{
  "rediscovered": 53,
  "net_new": 192,
  "missed": 355,
  "missed_not_in_input": 158,
  "missed_searched_no_match": 197
}
```

## Notes

- Files are served as static assets. Keep them under a few MB for fast load; the sample courses file (~14k rows) is ~4 MB and loads in well under a second.
- All filtering and aggregation happen client-side, so the dashboard works entirely offline once the JSON is fetched.
- To go live against MongoDB later, port these queries into TanStack server routes and store `MONGODB_URI` as a secret — the dashboard's data hook is the only file that needs to change.
