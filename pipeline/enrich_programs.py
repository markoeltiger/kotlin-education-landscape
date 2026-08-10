"""
AI enrichment (BROWSER version): renders each university page with a real browser
(Playwright) so JavaScript-heavy sites return real content, then uses DeepSeek to
classify program-vs-mention and extract structured details. Writes to 'programs'.

Why browser: many university sites (Constructor, NorthCap, etc.) render content with
JavaScript, so plain HTTP fetches return an empty shell and the AI wrongly says
"not a program". A real browser executes the JS and sees the actual course text.

Setup:
  pip install playwright pymongo python-dotenv requests
  playwright install chromium
  # .env: MONGODB_URI=...  DEEPSEEK_API_KEY=sk-...

Run:
  python enrich_programs_browser.py --course-only --limit 50
"""
import argparse
import json
import os
import re
import sys
import time

import requests
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    import sys as _sys
    _sys.exit("Playwright not installed:\n  pip install playwright\n  playwright install chromium")

load_dotenv()

DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
MODEL = "deepseek-chat"

HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

SYSTEM = """You analyze a university web page to determine if it describes an actual \
course or academic program that teaches the Kotlin programming language (as opposed to \
a page that merely mentions Kotlin — e.g. a news article, staff profile, research page, \
or library listing).

Return ONLY a JSON object, no markdown, no prose, with EXACTLY these keys:
{
  "is_program": true/false,
  "confidence": 0.0-1.0,
  "program_name": "the course/program title, or null",
  "topics": ["list of subjects taught alongside Kotlin, e.g. Android, Mobile, Coroutines, Compose, Backend"],
  "level": "undergraduate | graduate | bootcamp | professional | unknown",
  "prerequisites": "short text or null",
  "language_taught": "the human language of instruction if stated, else null",
  "credits": "credit value/ECTS if stated, else null",
  "summary": "one sentence describing what the course teaches"
}
Set is_program=false for mentions, news, blogs, staff pages, library catalogs, or if \
Kotlin is not actually taught. Be strict."""


def fetch_text_browser(page, url, timeout=25000):
    """Render the page in a real browser and return cleaned visible text."""
    try:
        resp = page.goto(url, wait_until="domcontentloaded", timeout=timeout)
        # give JS a moment to paint content
        try:
            page.wait_for_timeout(1500)
        except Exception:
            pass
        status = resp.status if resp else 0
        if status and status >= 400:
            return None, f"http_{status}"
        title = ""
        try:
            title = page.title() or ""
        except Exception:
            pass
        try:
            body = page.inner_text("body") or ""
        except Exception:
            body = ""
        body = re.sub(r"\s+", " ", body).strip()
        if len(body) < 60:
            return None, "empty_render"
        combined = (f"TITLE: {title}\n\n" if title else "") + body
        return combined[:6000], None
    except Exception as e:
        return None, type(e).__name__


def call_deepseek(key, page_text, url):
    try:
        r = requests.post(
            DEEPSEEK_URL,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM},
                    {"role": "user", "content": f"URL: {url}\n\nPAGE CONTENT:\n{page_text}"},
                ],
                "temperature": 0.1,
                "max_tokens": 400,
                "response_format": {"type": "json_object"},
            },
            timeout=60)
        if r.status_code != 200:
            return None, f"deepseek_http_{r.status_code}"
        content = r.json()["choices"][0]["message"]["content"].strip()
        # strip accidental code fences
        content = re.sub(r"^```(?:json)?|```$", "", content).strip()
        return json.loads(content), None
    except json.JSONDecodeError:
        return None, "bad_json"
    except Exception as e:
        return None, type(e).__name__


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--pause", type=float, default=1.0, help="seconds between pages")
    ap.add_argument("--course-only", action="store_true",
                    help="only process findings already flagged course_signal=True")
    ap.add_argument("--redo", action="store_true", help="re-analyze already-processed links")
    args = ap.parse_args()

    uri = os.environ.get("MONGODB_URI")
    key = os.environ.get("DEEPSEEK_API_KEY")
    if not uri:
        sys.exit("MONGODB_URI not set")
    if not key:
        sys.exit("DEEPSEEK_API_KEY not set")

    client = MongoClient(uri, serverSelectionTimeoutMS=20000, maxPoolSize=8)
    client.admin.command("ping")
    db = client["kotlin_edu"]
    findings = db["university_findings"]
    programs = db["programs"]
    programs.create_index([("url", ASCENDING)], unique=True)

    # which links are already processed (in programs, or logged rejected)?
    done = set()
    if not args.redo:
        done = {d["url"] for d in programs.find({}, {"url": 1})}

    query = {"course_signal": True} if args.course_only else {}
    todo = []
    for d in findings.find(query, {"url": 1, "university": 1, "country": 1,
                                   "alpha_two_code": 1, "title": 1, "course_signal": 1}):
        if d.get("url") and d["url"] not in done:
            todo.append(d)
    if args.limit:
        todo = todo[:args.limit]

    print(f"{len(todo)} links to analyze | {len(done)} already processed\n")

    counter = {"i": 0, "programs": 0, "rejected": 0, "errors": 0}
    n = len(todo)

    def process(page, d):
        url = d["url"]
        page_text, ferr = fetch_text_browser(page, url)
        if ferr:
            counter["i"] += 1; counter["errors"] += 1
            print(f"[{counter['i']}/{n}] fetch fail ({ferr}) {url[:50]}")
            programs.update_one({"url": url}, {"$set": {
                "url": url, "university": d.get("university"), "is_program": False,
                "status": "fetch_error", "detail": ferr,
                "analyzed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}}, upsert=True)
            return

        ai, aerr = call_deepseek(key, page_text, url)
        if aerr or not isinstance(ai, dict):
            counter["i"] += 1; counter["errors"] += 1
            print(f"[{counter['i']}/{n}] ai fail ({aerr}) {url[:50]}")
            return

        is_prog = bool(ai.get("is_program"))
        rec = {
            "url": url, "university": d.get("university"), "country": d.get("country"),
            "alpha_two_code": d.get("alpha_two_code"),
            "is_program": is_prog, "status": "program" if is_prog else "not_program",
            "program_name": ai.get("program_name"), "topics": ai.get("topics") or [],
            "level": ai.get("level"), "prerequisites": ai.get("prerequisites"),
            "language_taught": ai.get("language_taught"), "credits": ai.get("credits"),
            "summary": ai.get("summary"), "ai_confidence": ai.get("confidence"),
            "source_title": d.get("title"),
            "analyzed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        programs.update_one({"url": url}, {"$set": rec}, upsert=True)
        counter["i"] += 1
        if is_prog:
            counter["programs"] += 1
        else:
            counter["rejected"] += 1
        tag = "PROGRAM" if is_prog else "not-prog"
        nm = (ai.get("program_name") or "")[:32]
        topics = ",".join((ai.get("topics") or [])[:3])
        print(f"[{counter['i']}/{n}] {tag:<8} {d.get('university','')[:22]:<22} {nm:<32} [{topics}]")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"])
        ctx = browser.new_context(
            user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"),
            ignore_https_errors=True,   # recover the SSLError cases
            viewport={"width": 1366, "height": 800})
        page = ctx.new_page()
        for d in todo:
            process(page, d)
            time.sleep(args.pause)
        browser.close()

    print("\n" + "=" * 50)
    print(f" analyzed:   {counter['i']}")
    print(f" PROGRAMS:   {counter['programs']}")
    print(f" not program:{counter['rejected']}")
    print(f" errors:     {counter['errors']}")
    print(f" programs collection now: {programs.count_documents({'is_program': True})} real programs")

    # quick topic tally across confirmed programs
    topic_counts = {}
    for p in programs.find({"is_program": True}, {"topics": 1}):
        for t in (p.get("topics") or []):
            topic_counts[t] = topic_counts.get(t, 0) + 1
    if topic_counts:
        print("\n top topics across programs:")
        for t, c in sorted(topic_counts.items(), key=lambda x: -x[1])[:15]:
            print(f"   {c:>4}  {t}")


if __name__ == "__main__":
    main()
    