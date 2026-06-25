import argparse
import json
import os
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

INPUT = os.environ.get("UNI_INPUT", "world_universities_and_domains.json")
BASE = os.environ.get("SERP_URL", "http://localhost:7001")
PATH = os.environ.get("SERP_PATH", "/{engine}/search")

ENGINES = ["google", "duck", "bing"]

COURSE_WORDS = ("course", "courses", "syllabus", "syllabi", "module", "modules",
                "curriculum", "curricula", "lecture", "lectures", "seminar",
                "semester", "bachelor", "master", "masters", "undergraduate",
                "graduate", "postgraduate", "handbook", "ects", "credit hours",
                "programme", "degree", "elective", "prerequisite",
                "coursework", "tutorial", "diploma", "assignment")
COURSE_WORDS_RE = re.compile(r"\b(" + "|".join(COURSE_WORDS) + r")\b", re.I)
COURSE_CODE = re.compile(r"\b[A-Z]{2,4}[-\s]?\d{3,4}\b")
KOTLIN = re.compile(r"\bkotlin\b", re.I)


def fetch_engine(engine, text, site, limit):
    url = BASE + PATH.format(engine=engine)
    params = {"text": text, "site": site, "limit": limit}
    try:
        r = requests.get(url, params=params, timeout=90)
        if r.status_code == 200:
            data = r.json()
            results = data.get("results", []) if isinstance(data, dict) else (data or [])
            return results, True          # responded cleanly
        return [], False                  # error / captcha / 429 -> try next engine
    except requests.RequestException:
        return [], False


def fetch(text, site, limit):
    # try google first, then duck, then bing; first engine that RETURNS RESULTS wins,
    # otherwise the first that responds at all
    responded = False
    for engine in ENGINES:
        results, ok = fetch_engine(engine, text, site, limit)
        if results:
            return results, engine
        if ok:
            responded = True
    return [], (ENGINES[0] if responded else None)


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
    return bool(COURSE_WORDS_RE.search(f"{title} {snippet}"))


def load_universities(done):
    unis = json.loads(Path(INPUT).read_text(encoding="utf-8"))
    unis = [u for u in unis if u.get("domains")]
    return [u for u in unis
            if f"{u['name']}|{u.get('alpha_two_code') or ''}" not in done]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--query", default="kotlin")
    ap.add_argument("--results", type=int, default=10)
    ap.add_argument("--workers", type=int, default=8, help="parallel searches")
    ap.add_argument("--course-only", action="store_true",
                    help="only store results that look like courses (course_signal must be true)")
    ap.add_argument("--strict", action="store_true",
                    help="require BOTH kotlin AND a course/syllabus term in title+snippet")
    args = ap.parse_args()

    uri = os.environ.get("MONGODB_URI")
    if not uri:
        sys.exit("MONGODB_URI not set (check your .env)")

    client = MongoClient(uri, serverSelectionTimeoutMS=15000, maxPoolSize=args.workers + 4)
    client.admin.command("ping")
    db = client["kotlin_edu"]
    findings = db["university_findings"]
    progress = db["serp_progress"]
    findings.create_index([("url", ASCENDING)], unique=True)

    host = uri.split("@")[-1].split("/")[0]
    print(f"connected to {host} | coll=university_findings | "
          f"engines: google -> duck -> bing | starting count={findings.count_documents({})}\n")

    done = {d["_id"] for d in progress.find({}, {"_id": 1})}
    unis = load_universities(done)
    n_total = len(unis)
    print(f"processing ALL {n_total} remaining universities with {args.workers} workers\n")

    counter = {"i": 0, "written": 0}
    lock = threading.Lock()

    def work(uni):
        name = uni["name"]
        domains = uni.get("domains", [])
        results, used_engine = fetch(args.query, domains[0], args.results)
        new = hits = dropped = 0
        for r in results:
            url, title, snippet, ctype, rank, engine = parse(r)
            if not any(d in url for d in domains):
                dropped += 1
                continue
            if not KOTLIN.search(f"{title} {snippet} {url}"):
                dropped += 1
                continue
            is_course = course_signal(title, snippet, ctype)
            if args.course_only and not is_course:
                dropped += 1
                continue
            if args.strict and not is_course:
                dropped += 1
                continue
            res = findings.update_one(
                {"url": url},
                {"$setOnInsert": {
                    "url": url, "university": name, "country": uni.get("country"),
                    "alpha_two_code": uni.get("alpha_two_code"), "title": title,
                    "snippet": snippet, "content_type": ctype, "rank": rank,
                    "course_signal": is_course,
                    "source": "university_website",
                    "discovery": f"serp:{engine or used_engine}",
                    "found_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }}, upsert=True)
            hits += 1
            if res.upserted_id is not None:
                new += 1
        progress.update_one({"_id": f"{name}|{uni.get('alpha_two_code') or ''}"},
                            {"$set": {"name": name}}, upsert=True)
        with lock:
            counter["i"] += 1
            counter["written"] += new
            eng = f"[{used_engine}]" if used_engine else "[none]"
            tag = f"{eng} kept={hits} new={new} dropped={dropped}" if (hits or dropped) else f"{eng} -"
            print(f"[{counter['i']}/{n_total}] {name:<36.36} {tag}")

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = [ex.submit(work, u) for u in unis]
        for f in as_completed(futures):
            f.result()

    total = findings.count_documents({})
    courses = findings.count_documents({"course_signal": True})
    print(f"\nWrote {counter['written']} new doc(s) this run.")
    print(f"Findings now in mongo: {total}  (course-signal: {courses})")


if __name__ == "__main__":
    main()