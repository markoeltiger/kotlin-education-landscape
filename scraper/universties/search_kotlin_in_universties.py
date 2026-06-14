import argparse
import json
import os
import re
import sys
import time
import requests
from pymongo import MongoClient, ASCENDING
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

INPUT = "world_universities_and_domains.json"
BASE = os.environ.get("SERP_URL", "http://localhost:7001")
PATH = os.environ.get("SERP_PATH", "/{engine}/search")

COURSE_WORDS = ("course", "syllab", "module", "curriculum", "lecture", "semester",
                "bachelor", "master", "undergraduate", "handbook", "ects", "credits")
COURSE_CODE = re.compile(r"\b[A-Z]{2,4}[-\s]?\d{3}\b")


def fetch(engine, text, site, limit, retries=3):
    url = BASE + PATH.format(engine=engine)
    params = {"text": text, "site": site, "limit": limit}
    for attempt in range(retries):
        try:
            r = requests.get(url, params=params, timeout=90)
            if r.status_code == 200:
                data = r.json()
                return data.get("results", []) if isinstance(data, dict) else (data or [])
            if r.status_code in (429, 503):
                time.sleep(10 * (attempt + 1))
                continue
            return []
        except requests.RequestException:
            time.sleep(5 * (attempt + 1))
    return []


def parse(r):
    url = r.get("url") or r.get("link") or ""
    title = r.get("title", "")
    snippet = r.get("snippet") or r.get("description") or ""
    content_type = (r.get("classification") or {}).get("content_type")
    rank = r.get("rank") or (r.get("position") or {}).get("absolute")
    engine = r.get("engine")
    return url, title, snippet, content_type, rank, engine


def course_signal(title, snippet, content_type):
    if content_type == "document":
        return True
    if COURSE_CODE.search(title) or COURSE_CODE.search(snippet):
        return True
    blob = f"{title} {snippet}".lower()
    return any(w in blob for w in COURSE_WORDS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", default="google")
    ap.add_argument("--query", default="kotlin")
    ap.add_argument("--tier", type=int, default=1)
    ap.add_argument("--limit", type=int, default=600)
    ap.add_argument("--results", type=int, default=10)
    ap.add_argument("--delay", type=float, default=3.0)
    args = ap.parse_args()

    uri = os.environ.get("MONGODB_URI")
    if not uri:
        sys.exit("MONGODB_URI not set (check your .env)")

    client = MongoClient(uri, serverSelectionTimeoutMS=15000)
    client.admin.command("ping")
    db = client["kotlin_edu"]
    findings = db["university_findings"]
    progress = db["serp_progress"]
    findings.create_index([("url", ASCENDING)], unique=True)

    host = uri.split("@")[-1].split("/")[0]
    print(f"connected to {host} | db=kotlin_edu coll=university_findings | "
          f"starting count={findings.count_documents({})}\n")

    unis = json.loads(Path(INPUT).read_text(encoding="utf-8"))
    if args.tier:
        unis = [u for u in unis ]
    unis = [u for u in unis if u.get("domains")]

    done = {d["_id"] for d in progress.find({}, {"_id": 1})}
    processed = 0
    total_written = 0

    for uni in unis:
        if processed >= args.limit:
            break
        name = uni["name"]
        key = f"{name}|{uni.get('alpha_two_code') or ''}"
        if key in done:
            continue
        domains = uni.get("domains", [])

        hits = 0
        new = 0
        dropped = 0
        for r in fetch(args.engine, args.query, domains[0], args.results):
            url, title, snippet, ctype, rank, engine = parse(r)
            if not any(d in url for d in domains):
                dropped += 1
                continue
            res = findings.update_one(
                {"url": url},
                {"$setOnInsert": {
                    "url": url,
                    "university": name,
                    "country": uni.get("country"),
                    "alpha_two_code": uni.get("alpha_two_code"),
                    "title": title,
                    "snippet": snippet,
                    "content_type": ctype,
                    "rank": rank,
                    "course_signal": course_signal(title, snippet, ctype),
                    "source": "university_website",
                    "discovery": f"serp:{engine or args.engine}",
                    "found_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }},
                upsert=True,
            )
            hits += 1
            if res.upserted_id is not None:
                new += 1
                total_written += 1

        progress.update_one({"_id": key}, {"$set": {"name": name}}, upsert=True)
        processed += 1
        print(f"[{processed}] {name:<40.40} kept={hits:<2} new={new:<2} "
              f"dropped={dropped:<2}" if (hits or dropped)
              else f"[{processed}] {name:<40.40} -")
        time.sleep(args.delay)

    total = findings.count_documents({})
    courses = findings.count_documents({"course_signal": True})
    print(f"\nWrote {total_written} new doc(s) this run.")
    print(f"Findings now in mongo: {total}  (course-signal: {courses})")


if __name__ == "__main__":
    main()