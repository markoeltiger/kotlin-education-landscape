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

KOTLIN = re.compile(r"\bkotlin\b", re.I)

COURSERA_BASE = "https://api.coursera.org/api/courses.v1"
COURSERA_FIELDS = "name,slug,description,partnerIds,primaryLanguages,workload"
COURSERA_UA = {"User-Agent": "kotlin-education-landscape"}

UDEMY_SEARCH_URL = os.environ.get("UDEMY_SEARCH_URL", "https://www.udemy.com/api-2.0/courses/")
UDEMY_FIELDS = ("title,url,headline,visible_instructors,num_subscribers,avg_rating,"
                "is_paid,locale,num_published_lectures")
UDEMY_HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) "
                   "Chrome/124.0.0.0 Safari/537.36"),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.udemy.com/courses/search/?q=kotlin",
    "X-Requested-With": "XMLHttpRequest",
}


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


def upsert(coll, doc):
    res = coll.update_one(
        {"source": doc["source"], "course_id": doc["course_id"]},
        {"$setOnInsert": doc}, upsert=True)
    if res.upserted_id is not None:
        print(f"  + [{doc['source']}] {doc['title']}  {doc['providers']}")
        return 1
    return 0


def collect_coursera(coll, max_pages, page_size, delay):
    start, scanned, matched, written, total = 0, 0, 0, 0, None
    for page in range(max_pages):
        r = requests.get(COURSERA_BASE, headers=COURSERA_UA, timeout=30, params={
            "fields": COURSERA_FIELDS, "includes": "partnerIds",
            "limit": page_size, "start": start,
        })
        if r.status_code != 200:
            print(f"coursera HTTP {r.status_code} at start={start}, stopping", file=sys.stderr)
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
            if not KOTLIN.search(f"{c.get('name','')} {c.get('description','')}"):
                continue
            matched += 1
            pids = c.get("partnerIds", []) or []
            written += upsert(coll, {
                "source": "coursera",
                "course_id": c.get("id"),
                "title": c.get("name"),
                "url": f"https://www.coursera.org/learn/{c.get('slug')}" if c.get("slug") else None,
                "description": trim(c.get("description")),
                "providers": [partners.get(p) for p in pids if partners.get(p)],
                "languages": c.get("primaryLanguages"),
                "found_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            })
        nxt = (data.get("paging") or {}).get("next")
        print(f"[coursera page {page+1}] scanned={scanned}/{total} matched={matched} new={written}")
        if not nxt:
            break
        start = int(nxt)
        time.sleep(delay)
    return written


def collect_udemy(coll, query, pages, page_size, delay):
    s = requests.Session()
    s.headers.update(UDEMY_HEADERS)
    proxy = os.environ.get("PROXY_URL")
    if proxy:
        s.proxies.update({"http": proxy, "https": proxy})

    seen, written = 0, 0
    for page in range(1, pages + 1):
        try:
            r = s.get(UDEMY_SEARCH_URL, timeout=40, params={
                "search": query, "page": page, "page_size": page_size,
                "fields[course]": UDEMY_FIELDS,
            })
        except requests.RequestException as e:
            print(f"udemy request error: {e}", file=sys.stderr)
            break
        if r.status_code == 403:
            print("udemy HTTP 403 — blocked (bot protection). Set PROXY_URL in .env, or\n"
                  "copy the real XHR from DevTools and set UDEMY_SEARCH_URL/headers to match.",
                  file=sys.stderr)
            break
        if r.status_code != 200:
            print(f"udemy HTTP {r.status_code} on page {page}, stopping", file=sys.stderr)
            break
        data = r.json()
        results = data.get("results", [])
        if not results:
            break
        for c in results:
            seen += 1
            if not c.get("id"):
                continue
            instructors = [i.get("title") for i in c.get("visible_instructors", []) if i.get("title")]
            locale = (c.get("locale") or {}).get("locale")
            written += upsert(coll, {
                "source": "udemy",
                "course_id": c.get("id"),
                "title": c.get("title"),
                "url": "https://www.udemy.com" + c.get("url", "") if c.get("url") else None,
                "description": trim(c.get("headline")),
                "providers": instructors,
                "languages": [locale] if locale else None,
                "num_subscribers": c.get("num_subscribers"),
                "avg_rating": c.get("avg_rating"),
                "is_paid": c.get("is_paid"),
                "found_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            })
        print(f"[udemy page {page}] seen={seen}/{data.get('count','?')} new={written}")
        if not data.get("next"):
            break
        time.sleep(delay)
    return written


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", choices=["coursera", "udemy", "all"], default="all")
    ap.add_argument("--query", default="kotlin", help="udemy search term")
    ap.add_argument("--page-size", type=int, default=100)
    ap.add_argument("--max-pages", type=int, default=300, help="coursera catalog pages")
    ap.add_argument("--udemy-pages", type=int, default=10)
    ap.add_argument("--delay", type=float, default=0.5)
    args = ap.parse_args()

    coll = get_collection()
    total = 0
    if args.source in ("coursera", "all"):
        total += collect_coursera(coll, args.max_pages, args.page_size, args.delay)
    if args.source in ("udemy", "all"):
        total += collect_udemy(coll, args.query, args.udemy_pages,
                               min(args.page_size, 20), max(args.delay, 2.0))

    print(f"\nWrote {total} new course(s).")
    for src in ("coursera", "udemy"):
        print(f"  {src}: {coll.count_documents({'source': src})}")


if __name__ == "__main__":
    main()