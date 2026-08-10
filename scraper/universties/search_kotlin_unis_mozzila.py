r"""
Firefox + CapSolver extension + residential proxy — Google search for Kotlin.

Uses Playwright's Firefox with a PERSISTENT profile, so the CapSolver extension you
install stays installed across runs. On the first run it PAUSES with the browser
open so you can install the CapSolver extension and paste your API key; after that
CapSolver auto-solves reCAPTCHAs in-page. The residential proxy reduces how often
Google challenges you in the first place.

Goal: push the university findings past 500.

MongoDB: re-searches non-'found' schools, writes findings, flips no_match -> found.

--- FIRST RUN: installing CapSolver ---
When the Firefox window opens and the script says "INSTALL CAPSOLVER NOW":
  1. In the Firefox window, go to  about:addons
  2. Or open https://addons.mozilla.org and search "CapSolver", click Add to Firefox
     (temporary-install alternative: about:debugging -> This Firefox ->
      Load Temporary Add-on -> pick the CapSolver .xpi)
  3. Open the CapSolver extension, paste your API key, enable reCAPTCHA auto-solve.
  4. Come back to the terminal and press Enter.
The profile is saved to ./firefox_profile/ so you only do this once.

Setup:
  pip install playwright pymongo python-dotenv
  playwright install firefox
Run:
  python firefox_capsolver_search.py --retry-statuses no_match failed --limit 400
"""
import argparse
import json
import os
import random
import re
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING

load_dotenv()

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sys.exit("Playwright not installed:\n  pip install playwright pymongo python-dotenv\n  playwright install firefox")

INPUT = os.environ.get("UNI_INPUT", "world_universities_and_domains.json")
PROFILE_DIR = "firefox_profile"
CLEAN_DONE = {"found"}

KOTLIN_RE = re.compile(r"\bkotlin\b", re.I)
COURSE_WORDS = ("courses?", "syllabi?", "syllabus", "modules?", "curriculum", "curricula",
                "lectures?", "semester", "bachelors?", "masters?", "undergraduate",
                "graduate", "programmes?", "programs?", "degrees?", "faculty",
                "handbook", "diploma", "education", "catalog")
COURSE_RE = re.compile("(" + "|".join(COURSE_WORDS) + ")", re.I)


def looks_like_course(t):
    return bool(COURSE_RE.search(t or ""))


def key_of(u):
    return f"{u['name']}|{u.get('alpha_two_code') or ''}"


def parse_proxy(proxy_url):
    if not proxy_url:
        return None
    m = re.match(r'(?:(https?)://)?(?:([^:@]+):([^@]+)@)?([^:/]+):(\d+)', proxy_url)
    if not m:
        return None
    scheme, user, pw, host, port = m.groups()
    cfg = {"server": f"{scheme or 'http'}://{host}:{port}"}
    if user and pw:
        cfg["username"] = user
        cfg["password"] = pw
    return cfg


def is_captcha(page):
    try:
        if "/sorry/" in page.url.lower():
            return True
        if page.query_selector("form#captcha-form, iframe[src*='recaptcha'], iframe[title*='captcha']"):
            return True
        body = (page.inner_text("body") or "").lower()
        if any(s in body for s in ("unusual traffic", "not a robot", "systems have detected")):
            return True
    except Exception:
        pass
    return False


def dismiss_consent(page):
    for sel in ["#L2AGLb", "button:has-text('Accept all')", "button:has-text('Alles accepteren')",
                "button:has-text('Reject all')", "button:has-text('I agree')"]:
        try:
            el = page.query_selector(sel)
            if el:
                el.click(); time.sleep(1); return True
        except Exception:
            continue
    return False


def wait_until_clear(page, label, auto_wait):
    dismiss_consent(page)
    if not is_captcha(page):
        return
    print(f" CAPTCHA on {label} — waiting up to {auto_wait}s for CapSolver extension...")
    waited = 0
    while waited < auto_wait:
        time.sleep(3); waited += 3
        dismiss_consent(page)
        if not is_captcha(page):
            print(f" solved in ~{waited}s.\n")
            return
    print("\n" + "!" * 56)
    print(f" CapSolver didn't clear {label}. Solve it in Firefox by hand.")
    print("!" * 56)
    while True:
        input(" >> Press Enter after solving... ")
        dismiss_consent(page)
        if not is_captcha(page):
            print(" cleared.\n"); return


def extract_results(page):
    out = []
    try:
        for a in page.query_selector_all("a:has(h3)"):
            href = a.get_attribute("href") or ""
            h3 = a.query_selector("h3")
            title = h3.inner_text() if h3 else ""
            if href.startswith("http"):
                parts = href.split("/")
                host = parts[2] if len(parts) > 2 else ""
                if "google." not in host:
                    out.append({"url": href, "title": title})
    except Exception:
        pass
    return out


def build_session(p, proxy_cfg, first_run, skip_install, solve_wait):
    """Launch a fresh Firefox session, verify proxy, warm up past any CAPTCHA."""
    ctx = p.firefox.launch_persistent_context(
        PROFILE_DIR, headless=False, proxy=proxy_cfg,
        viewport={"width": 1366, "height": 800}, locale="en-US",
        user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) "
                    "Gecko/20100101 Firefox/125.0"))
    page = ctx.pages[0] if ctx.pages else ctx.new_page()

    if proxy_cfg:
        try:
            page.goto("https://api.ipify.org?format=json", timeout=20000)
            print("  exit IP via proxy:", page.inner_text("body")[:80])
        except Exception as e:
            print(f"  proxy IP check failed ({type(e).__name__})")

    if first_run and not skip_install:
        page.goto("about:addons")
        print("\n" + "#" * 60)
        print(" INSTALL CAPSOLVER NOW (first run only)")
        print(" 1. In the Firefox window: install the CapSolver extension")
        print("    (addons.mozilla.org -> search CapSolver -> Add to Firefox)")
        print(" 2. Open CapSolver, paste your API key, enable reCAPTCHA solving")
        print("#" * 60)
        input(" >> Press Enter when CapSolver is installed and configured... ")

    print("  warming up — opening Google...")
    page.goto("https://www.google.com/search?q=kotlin", wait_until="domcontentloaded", timeout=30000)
    wait_until_clear(page, "warm-up", solve_wait)
    return ctx, page


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--retry-statuses", nargs="*", default=None)
    ap.add_argument("--solve-wait", type=int, default=45)
    ap.add_argument("--min-pause", type=float, default=2.5)
    ap.add_argument("--max-pause", type=float, default=6.0)
    ap.add_argument("--course-only", action="store_true")
    ap.add_argument("--proxy", default=None, help="proxy URL (or PROXY_URL in .env)")
    ap.add_argument("--skip-install", action="store_true",
                    help="skip the extension-install pause (after first run)")
    ap.add_argument("--fresh-on-captcha", action="store_true", default=True,
                    help="tear down and rebuild the session on first CAPTCHA (default on)")
    ap.add_argument("--no-fresh-on-captcha", dest="fresh_on_captcha", action="store_false")
    ap.add_argument("--research", action="store_true",
                    help="re-run schools the browser tool already searched (default: skip them)")
    args = ap.parse_args()

    uri = os.environ.get("MONGODB_URI")
    if not uri:
        sys.exit("MONGODB_URI not set (.env)")
    client = MongoClient(uri, serverSelectionTimeoutMS=15000)
    client.admin.command("ping")
    db = client["kotlin_edu"]
    findings = db["university_findings"]
    progress = db["serp_progress"]
    findings.create_index([("url", ASCENDING)], unique=True)

    # pull status + a permanent 'browser_done' marker. once the browser tool has
    # searched a school, browser_done=True is stored, and we NEVER revisit it on
    # restart (regardless of time) unless --research is passed.
    prog = {d["_id"]: d for d in progress.find({}, {"status": 1, "browser_done": 1})}

    if args.retry_statuses:
        want = set(args.retry_statuses)
        eligible = {k for k, v in prog.items() if v.get("status") in want}
        include_missing = "missing" in want
    else:
        eligible = {k for k, v in prog.items() if v.get("status") not in CLEAN_DONE}
        include_missing = True

    unis_all = [u for u in json.loads(Path(INPUT).read_text(encoding="utf-8")) if u.get("domains")]
    unis = []
    skipped_done = 0
    for u in unis_all:
        k = key_of(u)
        rec = prog.get(k)
        is_eligible = (k in eligible) or (include_missing and k not in prog)
        if not is_eligible:
            continue
        # PERMANENT resume: if the browser tool already searched this school, skip it
        # forever (unless --research). This is the real progress tracking.
        if rec and rec.get("browser_done") and not args.research:
            skipped_done += 1
            continue
        unis.append(u)
    if args.limit:
        unis = unis[:args.limit]

    have = findings.count_documents({})
    print(f"currently {have} findings")
    print(f"{len(unis)} to search | skipped {skipped_done} already searched by browser tool\n")

    proxy_cfg = parse_proxy(args.proxy or os.environ.get("PROXY_URL"))
    if proxy_cfg:
        print(f"proxy: {proxy_cfg['server']}" + (" (auth)" if "username" in proxy_cfg else ""))
    first_run = not Path(PROFILE_DIR).exists()

    written = 0
    outcomes = {"found": 0, "no_match": 0, "session_resets": 0, "error": 0, "flipped": 0}
    n = len(unis)

    with sync_playwright() as p:
        ctx, page = build_session(p, proxy_cfg, first_run, args.skip_install, args.solve_wait)
        session_captchas = 0   # CAPTCHAs seen in the CURRENT session (warm-up counts as 0)

        i = 0
        while i < n:
            uni = unis[i]
            name = uni["name"]; domain = uni["domains"][0]; k = key_of(uni)
            prev = prog.get(k, {}).get("status", "missing")
            q = f"kotlin site:{domain}"
            surl = ("https://www.google.com/search?q=" +
                    q.replace(" ", "+").replace(":", "%3A") + "&num=20")
            try:
                page.goto(surl, wait_until="domcontentloaded", timeout=30000)
            except Exception as e:
                outcomes["error"] += 1
                progress.update_one({"_id": k}, {"$set": {"name": name, "status": "error",
                    "detail": type(e).__name__, "last_run": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}},
                    upsert=True)
                print(f"[{i+1}/{n}] {name:<26.26} ERROR {type(e).__name__}")
                i += 1
                continue

            # ---- CAPTCHA handling ----
            # First CAPTCHA in a session: solve it and keep going (normal startup cost).
            # Any FURTHER CAPTCHA in the same session: the session is burning out ->
            # tear down and start a fresh one (new IP) for another clean ~80.
            if is_captcha(page):
                session_captchas += 1
                if session_captchas == 1 or not args.fresh_on_captcha:
                    print(f"  first CAPTCHA this session (#{i+1}) — solving, keeping session...")
                    wait_until_clear(page, f"search #{i+1}", args.solve_wait)
                    page.goto(surl, wait_until="domcontentloaded", timeout=30000)
                else:
                    print(f"\n  !! CAPTCHA #{session_captchas} this session (search #{i+1})"
                          f" — session burning out.")
                    print("  tearing down and starting a FRESH session (new IP)...\n")
                    outcomes["session_resets"] += 1
                    try:
                        ctx.close()
                    except Exception:
                        pass
                    time.sleep(random.uniform(5, 12))
                    ctx, page = build_session(p, proxy_cfg, False, True, args.solve_wait)
                    session_captchas = 0   # fresh session, reset the counter
                    continue   # retry the SAME university on the fresh session

            results = extract_results(page)
            kept = 0
            for r in results:
                if domain not in r["url"]:
                    continue
                if not KOTLIN_RE.search(r["title"] + " " + r["url"]):
                    continue
                is_course = looks_like_course(r["title"] + " " + r["url"])
                if args.course_only and not is_course:
                    continue
                res = findings.update_one({"url": r["url"]},
                    {"$setOnInsert": {"url": r["url"], "university": name, "country": uni.get("country"),
                        "alpha_two_code": uni.get("alpha_two_code"), "title": r["title"],
                        "course_signal": is_course, "source": "university_website",
                        "discovery": "firefox:google",
                        "found_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}}, upsert=True)
                kept += 1
                if res.upserted_id is not None:
                    written += 1

            status = "found" if kept else "no_match"
            if status == "found" and prev not in CLEAN_DONE:
                outcomes["flipped"] += 1
            outcomes[status] += 1
            progress.update_one({"_id": k}, {"$set": {"name": name, "country": uni.get("country"),
                "alpha_two_code": uni.get("alpha_two_code"), "domain": domain,
                "status": status, "engine": "firefox:google", "kept": kept,
                "raw_results": len(results), "browser_done": True,
                "last_run": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}},
                upsert=True)
            flip = f"  <- flipped from {prev}" if (status == "found" and prev not in CLEAN_DONE) else ""
            print(f"[{i+1}/{n}] {name:<24.24} {status} kept={kept} raw={len(results)} | total={have+written}{flip}")
            i += 1
            time.sleep(random.uniform(args.min_pause, args.max_pause))

        try:
            ctx.close()
        except Exception:
            pass

    print("\n" + "=" * 50 + "\n OUTCOMES")
    for kk, v in outcomes.items():
        if v:
            print(f"   {v:>5}  {kk}")
    total = findings.count_documents({})
    print(f"\n wrote {written} new findings | total now {total}")
    if total >= 500:
        print(" 500+ findings reached.")
    if outcomes["flipped"]:
        print(f" {outcomes['flipped']} schools flipped -> found")


if __name__ == "__main__":
    main()