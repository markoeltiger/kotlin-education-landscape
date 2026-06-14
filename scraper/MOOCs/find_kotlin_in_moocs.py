import argparse
import os
import re
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

UA = {"User-Agent": "kotlin-education-landscape"}
BASE = "https://api.coursera.org/api/courses.v1"
FIELDS = "name,slug,description,partnerIds,primaryLanguages,workload"
KOTLIN = re.compile(r"\bkotlin\b", re.I)


def trim(text, n=300):
    if not text:
        return None
    text = " ".join(text.split())
    return text[:n] + ("…" if len(text) > n else "")


def get_collection():
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        sys.exit("MONGODB_URI not set (check your .env)")
    client = MongoClient(uri, serverSelectionTimeoutMS=15000)
    client.admin.command("ping")
    coll = client["kotlin_edu"]["mooc_courses"]
    coll.create_index([("source", ASCENDING), ("course_id", ASCENDING)], unique=True)
    return coll


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--page-size", type=int, default=100)
    ap.add_argument("--max-pages", type=int, default=300)
    ap.add_argument("--delay", type=float, default=0.5)
    args = ap.parse_args()

    coll = get_collection()
    start = 0
    scanned = 0
    matched = 0
    written = 0
    total = None

    for page in range(args.max_pages):
        r = requests.get(BASE, headers=UA, timeout=30, params={
            "fields": FIELDS, "includes": "partnerIds",
            "limit": args.page_size, "start": start,
        })
        if r.status_code != 200:
            print(f"HTTP {r.status_code} at start={start}, stopping", file=sys.stderr)
            break
        data = r.json()
        partners = {p["id"]: p.get("name")
                    for p in (data.get("linked") or {}).get("partners.v1", [])}
        elements = data.get("elements", [])
        if not elements:
            break
        if total is None:
            total = (data.get("paging") or {}).get("total")

        for c in elements:
            scanned += 1
            blob = f"{c.get('name','')} {c.get('description','')}"
            if not KOTLIN.search(blob):
                continue
            matched += 1
            pids = c.get("partnerIds", []) or []
            doc = {
                "source": "coursera",
                "course_id": c.get("id"),
                "title": c.get("name"),
                "url": f"https://www.coursera.org/learn/{c.get('slug')}" if c.get("slug") else None,
                "description": trim(c.get("description")),
                "providers": [partners.get(p) for p in pids if partners.get(p)],
                "languages": c.get("primaryLanguages"),
                "found_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            res = coll.update_one(
                {"source": "coursera", "course_id": doc["course_id"]},
                {"$setOnInsert": doc}, upsert=True)
            if res.upserted_id is not None:
                written += 1
                print(f"  + {doc['title']}  {doc['providers']}")

        nxt = (data.get("paging") or {}).get("next")
        print(f"[page {page+1}] scanned={scanned}/{total} matched={matched} new={written}")
        if not nxt:
            break
        start = int(nxt)
        time.sleep(args.delay)

    print(f"\nScanned {scanned} courses, matched {matched} kotlin, wrote {written} new.")
    print(f"mooc_courses (coursera): {coll.count_documents({'source': 'coursera'})}")


if __name__ == "__main__":
    main()