import os
import re
import sys
from collections import Counter

import requests
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING, UpdateOne

load_dotenv()

# GitHub: "primary" = genuinely course-like (NOT just any tutorial, which is often
# a personal repo) AND real classifier confidence. Tutorials -> secondary.
GH_PRIMARY_TYPES = {"course", "workshop", "book_companion"}
GH_PRIMARY_MIN_CONF = 0.75

FORMAL_MOOC = {"coursera", "stepik", "edx", "udemy"}

# cache for resolved Stepik author names: {id: name}
_stepik_cache = {}


def resolve_stepik_authors(ids):
    """Batch-resolve numeric Stepik user IDs to full names (public API, no auth)."""
    numeric = sorted({str(i) for i in ids if str(i).isdigit() and str(i) not in _stepik_cache})
    for i in range(0, len(numeric), 50):
        batch = numeric[i:i + 50]
        try:
            params = "&".join(f"ids[]={b}" for b in batch)
            r = requests.get(f"https://stepik.org/api/users?{params}",
                             headers={"User-Agent": "kotlin-edu"}, timeout=30)
            if r.status_code == 200:
                for u in r.json().get("users", []):
                    name = (u.get("full_name") or "").strip()
                    _stepik_cache[str(u.get("id"))] = name or f"Stepik user {u.get('id')}"
        except requests.RequestException:
            pass
    for b in numeric:
        _stepik_cache.setdefault(b, f"Stepik user {b}")


def norm_github(c):
    rtype = c.get("repo_type")
    conf = c.get("edu_confidence") or 0
    primary = (rtype in GH_PRIMARY_TYPES) and (conf >= GH_PRIMARY_MIN_CONF)
    owner = c.get("owner") or {}
    # github owner location is sometimes present (user profile location)
    country = c.get("country") or (owner.get("location") if isinstance(owner, dict) else None)
    return {
        "source": "github", "category": "repository",
        "signal_tier": "primary" if primary else "secondary",
        "learning_type": "informal",
        "title": c.get("full_name") or c.get("title"), "url": c.get("url"),
        "provider": c.get("owner") if isinstance(c.get("owner"), str) else owner.get("login"),
        "country": country, "language": None,
        "subtype": rtype, "popularity": c.get("stars"), "date": c.get("created_at"),
        "kotlin_confidence": c.get("edu_confidence"), "raw_id": str(c.get("_id")),
    }


def norm_mooc(c):
    src = c.get("source")
    raw_providers = c.get("providers") or []
    # resolve numeric stepik ids -> names
    providers = []
    for p in raw_providers:
        ps = str(p)
        if src == "stepik" and ps.isdigit():
            providers.append(_stepik_cache.get(ps, f"Stepik user {ps}"))
        elif p:
            providers.append(ps)
    langs = c.get("languages") or []
    learning = "formal" if src in FORMAL_MOOC else "informal"
    return {
        "source": src, "category": "online_course",
        "signal_tier": "primary", "learning_type": learning,
        "title": c.get("title"), "url": c.get("url"),
        "provider": "; ".join(providers) or None,
        "country": None, "language": langs[0] if langs else None, "subtype": "mooc",
        "popularity": c.get("num_subscribers") or c.get("views"),
        "date": c.get("found_at"), "kotlin_confidence": 1.0,
        "raw_id": str(c.get("course_id")),
    }


def norm_university(c):
    sig = bool(c.get("course_signal"))
    return {
        "source": "university_website", "category": "university_page",
        "signal_tier": "primary" if sig else "secondary",
        "learning_type": "formal",
        "title": c.get("title"), "url": c.get("url"), "provider": c.get("university"),
        "country": c.get("country"), "language": None, "subtype": c.get("content_type"),
        "popularity": None, "date": c.get("found_at"),
        "kotlin_confidence": 0.8 if sig else 0.4, "raw_id": c.get("url"),
    }


def main():
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        sys.exit("MONGODB_URI not set")

    client = MongoClient(uri, serverSelectionTimeoutMS=20000)
    client.admin.command("ping")
    db = client["kotlin_edu"]
    unified = db["courses_unified"]
    unified.create_index([("source", ASCENDING), ("raw_id", ASCENDING)], unique=True)

    # pre-resolve all stepik author ids in one pass
    stepik_ids = set()
    for m in db["mooc_courses"].find({"source": "stepik"}, {"providers": 1}):
        for p in (m.get("providers") or []):
            if str(p).isdigit():
                stepik_ids.add(str(p))
    if stepik_ids:
        print(f"resolving {len(stepik_ids)} Stepik author ids...")
        resolve_stepik_authors(stepik_ids)

    rows = []
    for coll_name, fn in (("github_repos", norm_github),
                          ("mooc_courses", norm_mooc),
                          ("university_findings", norm_university)):
        n = 0
        for doc in db[coll_name].find({}):
            row = fn(doc)
            if not row.get("url"):
                continue
            rows.append(row)
            n += 1
        print(f"read {coll_name}: {n}")

    ops = [UpdateOne({"source": r["source"], "raw_id": r["raw_id"]},
                     {"$set": r}, upsert=True) for r in rows]
    written = 0
    for i in range(0, len(ops), 1000):
        res = unified.bulk_write(ops[i:i + 1000], ordered=False)
        written += res.upserted_count
        print(f"  wrote {min(i + 1000, len(ops))}/{len(ops)}")

    total = len(rows)
    by_source = Counter(r["source"] for r in rows)
    by_tier = Counter(r["signal_tier"] for r in rows)
    by_learning = Counter(r["learning_type"] for r in rows)
    countries = Counter(r["country"] for r in rows if r["country"])
    gh_primary = sum(1 for r in rows if r["source"] == "github" and r["signal_tier"] == "primary")

    print("\n" + "=" * 50)
    print(" KOTLIN EDUCATION LANDSCAPE — UNIFIED SUMMARY")
    print("=" * 50)
    print(f" total records:        {total}")
    print(f" new this run:         {written}")
    print(f" courses_unified now:  {unified.count_documents({})}")
    print("\n learning type:")
    for t, n in by_learning.most_common():
        print(f"   {n:>6}  {t}")
    print("\n signal tier:")
    for t, n in by_tier.most_common():
        print(f"   {n:>6}  {t}")
    print(f"   (github primary now: {gh_primary}, was ~12130 before threshold)")
    print("\n by source:")
    for s, n in by_source.most_common():
        print(f"   {n:>6}  {s}")
    print("\n top countries:")
    for c, n in countries.most_common(10):
        print(f"   {n:>6}  {c}")
    print("=" * 50)
    print(f"Written to MongoDB: kotlin_edu.courses_unified ({unified.count_documents({})} docs)")


if __name__ == "__main__":
    main()