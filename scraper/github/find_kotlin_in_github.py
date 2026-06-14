import argparse
import json
import os
import sys
import time
from datetime import date, timedelta
from pathlib import Path
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
API = "https://api.github.com"
JSON_FALLBACK = "findings_github.json"

SEED_QUERIES = [
    "topic:kotlin topic:course",
    "topic:kotlin topic:tutorial",
    "topic:kotlin-tutorial",
    "topic:kotlin topic:education",
    "topic:kotlin topic:workshop",
    "kotlin course in:name,description language:Kotlin",
    "kotlin tutorial in:name,description language:Kotlin",
    "kotlin workshop in:name,description language:Kotlin",
    "kotlin exercises in:name,description language:Kotlin",
    "learn kotlin in:name,description language:Kotlin",
    "android kotlin course in:name,description",
]

COURSE_TERMS = ("course", "curriculum", "syllabus", "lecture", "lectures",
                "semester", "cs50", "module", "assignment", "homework")
TUTORIAL_TERMS = ("tutorial", "guide", "getting started", "step by step", "learn",
                  "beginners", "beginner")
WORKSHOP_TERMS = ("workshop", "bootcamp", "codelab", "hands-on", "hands on")
SELF_TERMS = ("my journey", "100 days", "playground", "practice", "learning kotlin",
              "notes", "sandbox", "scratch", "study")
BOOK_TERMS = ("kotlin in action", "head first kotlin", "atomic kotlin",
              "big nerd ranch", "joy of kotlin", "programming kotlin")


def session(token):
    s = requests.Session()
    s.headers.update({
        "Accept": "application/vnd.github+json",
        "User-Agent": "kotlin-edu-landscape",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    if token:
        s.headers["Authorization"] = f"Bearer {token}"
    return s


def gh_get(s, path, params=None):
    url = path if path.startswith("http") else f"{API}{path}"
    for attempt in range(6):
        r = s.get(url, params=params)
        if r.status_code == 200:
            remaining = int(r.headers.get("X-RateLimit-Remaining", 1))
            if remaining == 0:
                reset = int(r.headers.get("X-RateLimit-Reset", time.time() + 60))
                wait = max(reset - int(time.time()) + 2, 2)
                print(f"  rate limit reached, sleeping {wait}s", file=sys.stderr)
                time.sleep(wait)
            return r.json()
        if r.status_code in (403, 429):
            reset = r.headers.get("X-RateLimit-Reset")
            if reset:
                wait = max(int(reset) - int(time.time()) + 2, 2)
            else:
                wait = 2 ** attempt * 5
            print(f"  throttled ({r.status_code}), sleeping {wait}s", file=sys.stderr)
            time.sleep(wait)
            continue
        r.raise_for_status()
    raise RuntimeError(f"giving up on {url}")


def search_count(s, q):
    data = gh_get(s, "/search/repositories", {"q": q, "per_page": 1})
    return data.get("total_count", 0)


def paginate(s, q):
    page = 1
    while page <= 10:
        data = gh_get(s, "/search/repositories",
                      {"q": q, "per_page": 100, "page": page,
                       "sort": "updated", "order": "desc"})
        items = data.get("items", [])
        if not items:
            break
        for it in items:
            yield it
        if len(items) < 100:
            break
        page += 1
        time.sleep(2)


def search_window(s, q, since, until):
    scoped = f"{q} created:{since}..{until}"
    total = search_count(s, scoped)
    if total == 0:
        return
    if total <= 1000 or since == until:
        yield from paginate(s, scoped)
        return
    mid = since + (until - since) // 2
    yield from search_window(s, q, since, mid)
    yield from search_window(s, q, mid + timedelta(days=1), until)


def classify(repo):
    blob = " ".join(filter(None, [
        repo.get("name", ""),
        repo.get("description", ""),
        " ".join(repo.get("topics", [])),
    ])).lower()

    if any(t in blob for t in BOOK_TERMS):
        return "book_companion", 0.8
    if any(t in blob for t in COURSE_TERMS):
        return "course", 0.85
    if any(t in blob for t in WORKSHOP_TERMS):
        return "workshop", 0.8
    if any(t in blob for t in TUTORIAL_TERMS):
        conf = 0.55 if any(t in blob for t in SELF_TERMS) else 0.7
        return "tutorial", conf
    if any(t in blob for t in SELF_TERMS):
        return "personal_learning", 0.3
    return "library_or_app", 0.1


def shape(repo):
    rtype, conf = classify(repo)
    owner = repo.get("owner") or {}
    return {
        "_id": repo["id"],
        "full_name": repo["full_name"],
        "url": repo["html_url"],
        "owner": owner.get("login"),
        "owner_type": owner.get("type"),
        "description": repo.get("description"),
        "topics": repo.get("topics", []),
        "language": repo.get("language"),
        "stars": repo.get("stargazers_count", 0),
        "forks": repo.get("forks_count", 0),
        "created_at": repo.get("created_at"),
        "pushed_at": repo.get("pushed_at"),
        "license": (repo.get("license") or {}).get("spdx_id"),
        "repo_type": rtype,
        "edu_confidence": conf,
        "university": None,
        "source": "github",
    }


def get_store(uri):
    if not uri:
        return None
    from pymongo import MongoClient, ASCENDING
    client = MongoClient(uri, serverSelectionTimeoutMS=15000)
    client.admin.command("ping")
    coll = client["kotlin_edu"]["github_repos"]
    coll.create_index([("repo_type", ASCENDING), ("stars", ASCENDING)])
    coll.create_index([("edu_confidence", ASCENDING)])
    return coll


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", default="2013-01-01")
    ap.add_argument("--until", default=date.today().isoformat())
    ap.add_argument("--min-confidence", type=float, default=0.0)
    args = ap.parse_args()

    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        print("GITHUB_TOKEN not set. Authenticated search is required for a real run "
              "(unauthenticated is rate-limited to ~10/min).", file=sys.stderr)
    s = session(token)

    coll = get_store(os.environ.get("MONGODB_URI"))
    local = []
    if coll is None and Path(JSON_FALLBACK).exists():
        local = json.loads(Path(JSON_FALLBACK).read_text())
    seen = {r["_id"] for r in local} if coll is None else set()

    since = date.fromisoformat(args.since)
    until = date.fromisoformat(args.until)

    kept = 0
    for q in SEED_QUERIES:
        total = search_count(s, q)
        print(f"\n{q}  (~{total} repos)")
        batch = 0
        for repo in search_window(s, q, since, until):
            doc = shape(repo)
            if doc["edu_confidence"] < args.min_confidence:
                continue
            if coll is not None:
                coll.update_one({"_id": doc["_id"]}, {"$set": doc}, upsert=True)
            else:
                if doc["_id"] in seen:
                    continue
                seen.add(doc["_id"])
                local.append(doc)
            batch += 1
            kept += 1
        print(f"  kept {batch}")
        if coll is None:
            Path(JSON_FALLBACK).write_text(json.dumps(local, ensure_ascii=False, indent=1))

    if coll is not None:
        total_docs = coll.count_documents({})
        print(f"\n{kept} repos processed this run; collection now {total_docs}.")
        breakdown = list(coll.aggregate([
            {"$group": {"_id": "$repo_type", "n": {"$sum": 1}}},
            {"$sort": {"n": -1}},
        ]))
        for b in breakdown:
            print(f"  {b['n']:>6}  {b['_id']}")
    else:
        print(f"\n{len(local)} unique repos in {JSON_FALLBACK}.")
        by_type = {}
        for r in local:
            by_type[r["repo_type"]] = by_type.get(r["repo_type"], 0) + 1
        for t, n in sorted(by_type.items(), key=lambda x: -x[1]):
            print(f"  {n:>6}  {t}")


if __name__ == "__main__":
    main()