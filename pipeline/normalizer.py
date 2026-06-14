import argparse
import csv
import os
import sys
from collections import Counter
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING

load_dotenv()

UNIFIED_FIELDS = ["source", "category", "title", "url", "provider", "country",
                  "language", "subtype", "popularity", "date", "kotlin_confidence", "raw_id"]


def norm_github(c):
    return {
        "source": "github",
        "category": "repository",
        "title": c.get("full_name") or c.get("title"),
        "url": c.get("url"),
        "provider": c.get("owner"),
        "country": c.get("country"),
        "language": None,
        "subtype": c.get("repo_type"),
        "popularity": c.get("stars"),
        "date": c.get("created_at"),
        "kotlin_confidence": c.get("edu_confidence"),
        "raw_id": str(c.get("_id")),
    }


def norm_mooc(c):
    providers = c.get("providers") or []
    langs = c.get("languages") or []
    return {
        "source": c.get("source"),
        "category": "online_course",
        "title": c.get("title"),
        "url": c.get("url"),
        "provider": "; ".join(p for p in providers if p) or None,
        "country": None,
        "language": langs[0] if langs else None,
        "subtype": "mooc",
        "popularity": c.get("num_subscribers"),
        "date": c.get("found_at"),
        "kotlin_confidence": 1.0,
        "raw_id": str(c.get("course_id")),
    }


def norm_university(c):
    return {
        "source": "university_website",
        "category": "university_page",
        "title": c.get("title"),
        "url": c.get("url"),
        "provider": c.get("university"),
        "country": c.get("country"),
        "language": None,
        "subtype": c.get("content_type"),
        "popularity": None,
        "date": c.get("found_at"),
        "kotlin_confidence": 0.8 if c.get("course_signal") else 0.4,
        "raw_id": c.get("url"),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="output/kotlin_courses_unified.csv")
    args = ap.parse_args()

    uri = os.environ.get("MONGODB_URI")
    if not uri:
        sys.exit("MONGODB_URI not set")

    client = MongoClient(uri, serverSelectionTimeoutMS=20000)
    client.admin.command("ping")
    db = client["kotlin_edu"]
    unified = db["courses_unified"]
    unified.create_index([("source", ASCENDING), ("raw_id", ASCENDING)], unique=True)

    rows = []
    sources = {
        "github_repos": norm_github,
        "mooc_courses": norm_mooc,
        "university_findings": norm_university,
    }
    for coll_name, fn in sources.items():
        n = 0
        for doc in db[coll_name].find({}):
            row = fn(doc)
            if not row.get("url"):
                continue
            rows.append(row)
            n += 1
        print(f"read {coll_name}: {n}")

    written = 0
    for row in rows:
        res = unified.update_one(
            {"source": row["source"], "raw_id": row["raw_id"]},
            {"$set": row}, upsert=True)
        if res.upserted_id is not None:
            written += 1

    Path(args.csv).parent.mkdir(parents=True, exist_ok=True)
    with open(args.csv, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=UNIFIED_FIELDS)
        w.writeheader()
        for row in rows:
            w.writerow(row)

    # ---- summary for the run log ----
    total = len(rows)
    by_source = Counter(r["source"] for r in rows)
    by_category = Counter(r["category"] for r in rows)
    countries = Counter(r["country"] for r in rows if r["country"])
    providers = Counter(r["provider"] for r in rows if r["provider"])

    print("\n" + "=" * 48)
    print(" KOTLIN EDUCATION LANDSCAPE — UNIFIED SUMMARY")
    print("=" * 48)
    print(f" total records:        {total}")
    print(f" new this run:         {written}")
    print(f" unified collection:   {unified.count_documents({})}")
    print("\n by source:")
    for s, n in by_source.most_common():
        print(f"   {n:>6}  {s}")
    print("\n by category:")
    for c, n in by_category.most_common():
        print(f"   {n:>6}  {c}")
    print("\n top countries (university pages):")
    for c, n in countries.most_common(8):
        print(f"   {n:>6}  {c}")
    print("\n top providers:")
    for p, n in providers.most_common(8):
        print(f"   {n:>6}  {p[:40]}")
    print("=" * 48)
    print(f"CSV written: {args.csv} ({total} rows)")


if __name__ == "__main__":
    main()