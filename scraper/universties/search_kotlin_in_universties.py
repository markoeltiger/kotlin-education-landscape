import argparse
import json
import os
import os
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from dotenv import load_dotenv

import requests
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING

load_dotenv()
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

INPUT = os.environ.get("UNI_INPUT", "world_universities_and_domains.json")
BASE = os.environ.get("SERP_URL", "http://localhost:7001")
PATH = os.environ.get("SERP_PATH", "/{engine}/search")
SERPER_URL = "https://google.serper.dev/search"
DEBUG = False
# free Serper accounts reject the site: operator -> pass domain as a plain term instead
SERPER_NO_SITE = True


def serper_key():
    return (os.environ.get("SERPER_API_KEY") or "").strip().strip('"').strip("'").strip()

ENGINES = ["google", "duck", "bing"]

COURSE_WORDS = ("course", "courses", "syllabus", "syllabi", "module", "modules",
                "curriculum", "curricula", "lecture", "lectures", "seminar",
                "semester", "bachelor", "master", "masters", "undergraduate",
                "graduate", "postgraduate", "handbook", "ects", "credit hours",
                "programme", "programmes", "program", "programs", "education",
                "degree", "degrees", "elective", "prerequisite",
                "coursework", "tutorial", "diploma", "assignment", "faculty",
                "department", "studies", "major", "minor")
COURSE_WORDS_RE = re.compile(r"\b(" + "|".join(COURSE_WORDS) + r")\b", re.I)
URL_HINTS_RE = re.compile(
    r"(course|courses|program|programme|curriculum|syllab|module|degree|"
    r"undergraduate|graduate|bachelor|master|education|faculty|department|catalog)",
    re.I)
COURSE_CODE = re.compile(r"\b[A-Z]{2,4}[-\s]?\d{3,4}\b")
KOTLIN = re.compile(r"\bkotlin\b", re.I)

# serper credit counter (shared, lock-guarded)
serper_used = {"n": 0}
serper_lock = threading.Lock()


def fetch_engine(engine, text, site, limit):
    url = BASE + PATH.format(engine=engine)
    params = {"text": text, "site": site, "limit": limit}
    try:
        r = requests.get(url, params=params, timeout=90)
        if r.status_code == 200:
            data = r.json()
            results = data.get("results", []) if isinstance(data, dict) else (data or [])
            results = [x for x in results if x.get("type", "organic") == "organic"]
            return results, True
        if DEBUG:
            print(f"  [{engine}] HTTP {r.status_code} site:{site} -> {r.text[:120]}",
                  file=sys.stderr)
        return [], False
    except requests.RequestException as e:
        if DEBUG:
            print(f"  [{engine}] error site:{site} -> {type(e).__name__}: {e}",
                  file=sys.stderr)
        return [], False


def fetch_serper(text, site, limit):
    key = serper_key()
    if not key:
        if DEBUG:
            print("  [serper] no key", file=sys.stderr)
        return [], False
    try:
        # free tier rejects the site: operator, so pass the domain as a plain term;
        # the caller's domain filter keeps only results actually on the domain
        query = f"{text} {site}" if SERPER_NO_SITE else f"{text} site:{site}"
        r = requests.post(
            SERPER_URL,
            headers={"X-API-KEY": key, "Content-Type": "application/json"},
            json={"q": query, "num": min(limit, 100)},
            timeout=40)
        if r.status_code != 200:
            print(f"  [serper] HTTP {r.status_code} for site:{site} -> {r.text[:160]}",
                  file=sys.stderr)
            return [], False
        with serper_lock:
            serper_used["n"] += 1
        organic = r.json().get("organic", [])
        if DEBUG:
            print(f"  [serper] ok {site} -> {len(organic)} organic", file=sys.stderr)
        out = [{"url": o.get("link"), "title": o.get("title"),
                "snippet": o.get("snippet"), "position": {"absolute": o.get("position")},
                "engine": "serper"} for o in organic]
        return out, True
    except requests.RequestException as e:
        print(f"  [serper] request error for site:{site} -> {type(e).__name__}: {e}",
              file=sys.stderr)
        return [], False


def fetch(text, site, limit, use_serper=True):
    # free engines first: google -> duck -> bing (first that returns results wins)
    responded = False
    for engine in ENGINES:
        results, ok = fetch_engine(engine, text, site, limit)
        if results:
            return results, engine
        if ok:
            responded = True
    # all free engines failed/empty -> spend a Serper credit (clean Google)
    if use_serper and serper_key():
        results, ok = fetch_serper(text, site, limit)
        if results:
            return results, "serper"
        if ok:
            responded = True
    return [], (ENGINES[0] if responded else None)


def parse(r):
    url = r.get("url") or r.get("link") or ""
    title = r.get("title", "")
    snippet = r.get("snippet") or r.get("description") or ""
    content_type = (r.get("classification") or {}).get("content_type")
    if not content_type and url.lower().endswith((".pdf", ".doc", ".docx")):
        content_type = "document"
    rank = (r.get("position") or {}).get("absolute") or r.get("rank")
    engine = r.get("engine")
    return url, title, snippet, content_type, rank, engine


def course_signal(title, snippet, content_type, url=""):
    if content_type == "document":
        return True
    if COURSE_CODE.search(title) or COURSE_CODE.search(snippet):
        return True
    if COURSE_WORDS_RE.search(f"{title} {snippet}"):
        return True
    return bool(URL_HINTS_RE.search(url))


def load_universities(done):
    unis = json.loads(Path(INPUT).read_text(encoding="utf-8"))
    unis = [u for u in unis if u.get("domains")]
    return [u for u in unis
            if f"{u['name']}|{u.get('alpha_two_code') or ''}" not in done]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--query", default="kotlin")
    ap.add_argument("--results", type=int, default=100)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--course-only", action="store_true")
    ap.add_argument("--strict", action="store_true",
                    help="require kotlin AND a course/syllabus term")
    ap.add_argument("--retry-failed", action="store_true",
                    help="re-run universities whose engines previously failed")
    ap.add_argument("--no-serper", action="store_true",
                    help="disable the Serper fallback (free engines only)")
    ap.add_argument("--debug", action="store_true",
                    help="print full reason for every engine/serper failure")
    args = ap.parse_args()

    global DEBUG
    DEBUG = args.debug

    uri = os.environ.get("MONGODB_URI")
    if not uri:
        sys.exit("MONGODB_URI not set (check your .env)")

    key = serper_key()
    use_serper = bool(key) and not args.no_serper

    client = MongoClient(uri, serverSelectionTimeoutMS=15000, maxPoolSize=args.workers + 4)
    client.admin.command("ping")
    db = client["kotlin_edu"]
    findings = db["university_findings"]
    progress = db["serp_progress"]
    findings.create_index([("url", ASCENDING)], unique=True)

    host = uri.split("@")[-1].split("/")[0]
    if use_serper:
        serper_state = f"ON (key …{key[-4:]})"
    elif not key:
        serper_state = "OFF (no key found in .env)"
    else:
        serper_state = "OFF (--no-serper)"
    print(f"connected to {host} | engines: google->duck->bing | serper: {serper_state}")
    print(f"starting count={findings.count_documents({})}\n")

    # 'done' = schools we should NOT reprocess.
    # normally: anything already in progress.
    # with --retry-failed: everything EXCEPT failed ones (so failed get retried).
    if args.retry_failed:
        done = {d["_id"] for d in progress.find({"status": {"$ne": "failed"}}, {"_id": 1})}
    else:
        done = {d["_id"] for d in progress.find({}, {"_id": 1})}
    unis = load_universities(done)
    n_total = len(unis)
    failed_pending = progress.count_documents({"status": "failed"})
    print(f"processing {n_total} universities with {args.workers} workers "
          f"({failed_pending} previously-failed will "
          f"{'retry' if args.retry_failed else 'be skipped unless --retry-failed'})\n")

    counter = {"i": 0, "written": 0}
    lock = threading.Lock()

    def work(uni):
        name = uni["name"]
        domains = uni.get("domains", [])
        results, used_engine = fetch(args.query, domains[0], args.results, use_serper)
        raw = len(results)
        new = hits = dropped = 0
        for r in results:
            url, title, snippet, ctype, rank, engine = parse(r)
            if not any(d in url for d in domains):
                dropped += 1
                continue
            if not KOTLIN.search(f"{title} {snippet} {url}"):
                dropped += 1
                continue
            is_course = course_signal(title, snippet, ctype, url)
            if (args.course_only or args.strict) and not is_course:
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

        if used_engine is None:
            status = "failed"
        elif raw == 0:
            status = "empty"
        elif hits == 0:
            status = "no_match"
        else:
            status = "found"

        progress.update_one(
            {"_id": f"{name}|{uni.get('alpha_two_code') or ''}"},
            {"$set": {
<<<<<<< HEAD
                "name": name, "countr"""
Browser-based Google search for `kotlin site:<domain>` across universities.

HONEST WARNING: Google aggressively CAPTCHAs automated browsers. This script uses
slow, human-like pacing and anti-detection flags to last as long as possible, but
expect CAPTCHAs after some number of queries from a single IP. It is fully
resumable — every result is saved immediately, and when Google blocks you, stop
the script and rerun later (or from another network); it skips what's done.

Run headful (visible browser) so you can solve a CAPTCHA by hand if you want to
keep a session alive:  python browser_search.py --headful
"""
import argparse
import json
import os
import random
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING

load_dotenv()

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sys.exit("Playwright not installed. Run:\n  pip install playwright\n  playwright install chromium")

INPUT = os.environ.get("UNI_INPUT", "world_universities_and_domains.json")

COURSE_WORDS = ("course", "syllabus", "module", "curriculum", "lecture", "semester",
                "bachelor", "master", "undergraduate", "graduate", "programme",
                "program", "degree", "faculty", "handbook", "diploma")


def human_pause(a=2.5, b=6.0):
    time.sleep(random.uniform(a, b))


def looks_like_course(text):
    t = (text or "").lower()
    return any(w in t for w in COURSE_WORDS)


def parse_results(page):
    """Extract organic results from a Google results page."""
    out = []
    # Google's result blocks — this selector drifts over time; adjust if it breaks
    anchors = page.query_selector_all("a:has(h3)")
    for a in anchors:
        try:
            href = a.get_attribute("href") or ""
            h3 = a.query_selector("h3")
            title = h3.inner_text() if h3 else ""
            if href.startswith("http") and "google." not in href:
                out.append({"url": href, "title": title})
        except Exception:
            continue
    return out


def is_captcha(page):
    url = page.url.lower()
    if "sorry/index" in url or "/sorry" in url:
        return True
    try:
        if page.query_selector("form#captcha-form, iframe[src*='recaptcha']"):
            return True
        body = (page.inner_text("body") or "").lower()
        if "unusual traffic" in body or "not a robot" in body:
            return True
    except Exception:
        pass
    return False


def load_universities(done):
    unis = json.loads(Path(INPUT).read_text(encoding="utf-8"))
    unis = [u for u in unis if u.get("domains")]
    return [u for u in unis
            if f"{u['name']}|{u.get('alpha_two_code') or ''}" not in done]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--headful", action="store_true",
                    help="show the browser (lets you solve CAPTCHAs by hand)")
    ap.add_argument("--limit", type=int, default=0, help="max universities this run (0 = all)")
    ap.add_argument("--min-pause", type=float, default=3.0)
    ap.add_argument("--max-pause", type=float, default=8.0)
    ap.add_argument("--course-only", action="store_true")
    args = ap.parse_args()

    uri = os.environ.get("MONGODB_URI")
    if not uri:
        sys.exit("MONGODB_URI not set")
    client = MongoClient(uri, serverSelectionTimeoutMS=15000)
    client.admin.command("ping")
    db = client["kotlin_edu"]
    findings = db["university_findings"]
    progress = db["serp_progress"]
    findings.create_index([("url", ASCENDING)], unique=True)

    done = {d["_id"] for d in progress.find({"status": {"$ne": "failed"}}, {"_id": 1})}
    unis = load_universities(done)
    if args.limit:
        unis = unis[:args.limit]
    print(f"{len(unis)} universities to search (browser mode)\n")

    written = captchas = searched = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=not args.headful,
            args=["--disable-blink-features=AutomationControlled",
                  "--no-sandbox", "--disable-dev-shm-usage"])
        ctx = browser.new_context(
            user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/125.0.0.0 Safari/537.36"),
            viewport={"width": 1366, "height": 768},
            locale="en-US")
        # light stealth: hide webdriver flag
        ctx.add_init_script(
            "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")
        page = ctx.new_page()

        for i, uni in enumerate(unis, 1):
            name = uni["name"]
            domain = uni["domains"][0]
            q = f"kotlin site:{domain}"
            try:
                page.goto("https://www.google.com/search?q=" +
                          q.replace(" ", "+").replace(":", "%3A"),
                          wait_until="domcontentloaded", timeout=30000)
            except Exception as e:
                print(f"[{i}/{len(unis)}] {name:<32.32} nav error: {type(e).__name__}")
                continue

            searched += 1
            if is_captcha(page):
                captchas += 1
                print(f"[{i}/{len(unis)}] {name:<32.32} !! CAPTCHA")
                if args.headful:
                    print("   >> Solve the CAPTCHA in the browser window, then press Enter here...")
                    input()
                    if is_captcha(page):
                        print("   still blocked — stopping. progress saved.")
                        break
                else:
                    print("   Google is blocking automated search. Progress saved.")
                    print("   Try: --headful to solve by hand, wait a few hours, or switch networks.")
                    break

            results = parse_results(page)
            kept = 0
            for r in results:
                if domain not in r["url"]:
                    continue
                if "kotlin" not in (r["title"] + r["url"]).lower():
                    continue
                is_course = looks_like_course(r["title"])
                if args.course_only and not is_course:
                    continue
                res = findings.update_one(
                    {"url": r["url"]},
                    {"$setOnInsert": {
                        "url": r["url"], "university": name,
                        "country": uni.get("country"),
                        "alpha_two_code": uni.get("alpha_two_code"),
                        "title": r["title"], "course_signal": is_course,
                        "source": "university_website", "discovery": "browser:google",
                        "found_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    }}, upsert=True)
                kept += 1
                if res.upserted_id is not None:
                    written += 1

            status = "found" if kept else "no_match"
            progress.update_one(
                {"_id": f"{name}|{uni.get('alpha_two_code') or ''}"},
                {"$set": {"name": name, "country": uni.get("country"),
                          "status": status, "engine": "browser:google",
                          "kept": kept, "last_run": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}},
                upsert=True)
            print(f"[{i}/{len(unis)}] {name:<32.32} kept={kept}")
            human_pause(args.min_pause, args.max_pause)

        browser.close()

    print(f"\nsearched {searched} · wrote {written} new findings · {captchas} captcha(s)")
    if captchas:
        print("Google blocked automated search (expected). Everything found is saved.")


if __name__ == "__main__":
    main()y": uni.get("country"),
=======
                "name": name, "country": uni.get("country"),
>>>>>>> 3070bbde996f25b601c5c7f20d05d9a450f1cc52
                "alpha_two_code": uni.get("alpha_two_code"),
                "domain": domains[0] if domains else None,
                "status": status, "engine": used_engine,
                "raw_results": raw, "kept": hits, "dropped": dropped,
                "last_run": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }}, upsert=True)

        with lock:
            counter["i"] += 1
            counter["written"] += new
            counter[status] = counter.get(status, 0) + 1
            eng = f"[{used_engine}]" if used_engine else "[none]"
            tag = (f"{eng} kept={hits} new={new} dropped={dropped}"
                   if (hits or dropped) else f"{eng} {status}")
            print(f"[{counter['i']}/{n_total}] {name:<34.34} {tag}")

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = [ex.submit(work, u) for u in unis]
        for f in as_completed(futures):
            f.result()

    total = findings.count_documents({})
    courses = findings.count_documents({"course_signal": True})
    print(f"\nWrote {counter['written']} new doc(s) this run.")
    print("run status breakdown:")
    for st in ("found", "no_match", "empty", "failed"):
        if counter.get(st):
            print(f"   {counter[st]:>6}  {st}")
    if use_serper:
        print(f"\nSerper credits used this run: {serper_used['n']}")
    print(f"Findings now in mongo: {total}  (course-signal: {courses})")
    still_failed = progress.count_documents({"status": "failed"})
    if still_failed:
        print(f"{still_failed} universities still 'failed' — rerun with --retry-failed.")


if __name__ == "__main__":
    main()