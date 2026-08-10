"""
Browser Google search + CapSolver API auto-solving (MongoDB version).

When Google shows a reCAPTCHA, the script reads the sitekey off the page, asks
CapSolver's API to solve it, injects the returned token, and submits — no manual
clicking, no browser extension. Falls back to manual solve if the API can't clear it.

MongoDB: re-searches non-'found' schools, writes findings, flips no_match->found.

--- CapSolver API setup ---
1. Sign up at capsolver.com, add a few dollars of credit, copy your API key.
2. Put it in .env:   CAPSOLVER_API_KEY=CAP-XXXXXXXX
   (or pass --capsolver-key on the command line)

Setup:
  pip install playwright pymongo python-dotenv requests
  playwright install chromium

Run:
  python browser_search_capsolver_api.py --retry-statuses no_match --limit 300
"""
import argparse
import os
import random
import re
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING

load_dotenv()

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sys.exit("Playwright not installed:\n  pip install playwright\n  playwright install chromium")

import json

CAPSOLVER_BASE = "https://api.capsolver.com"

INPUT = os.environ.get("UNI_INPUT", "world_universities_and_domains.json")
PROFILE_DIR = "google_profile"

COURSE_WORDS = ("courses?", "syllabi?", "syllabus", "modules?", "curriculum", "curricula",
                "lectures?", "semester", "bachelors?", "masters?", "undergraduate",
                "graduate", "programmes?", "programs?", "degrees?", "faculty",
                "handbook", "diploma", "education", "catalog")
COURSE_RE = re.compile("(" + "|".join(COURSE_WORDS) + ")", re.I)
KOTLIN_RE = re.compile(r"\bkotlin\b", re.I)

# statuses we consider "done" and skip by default. everything else gets (re)searched.
CLEAN_DONE = {"found"}


def looks_like_course(t):
    return bool(COURSE_RE.search(t or ""))


def key_of(uni):
    return f"{uni['name']}|{uni.get('alpha_two_code') or ''}"


def capsolver_balance(key):
    try:
        r = requests.post(f"{CAPSOLVER_BASE}/getBalance", json={"clientKey": key}, timeout=20)
        return r.json().get("balance")
    except Exception:
        return None


def extract_sitekey(page):
    """Find the reCAPTCHA sitekey on the current page."""
    # common: <div class="g-recaptcha" data-sitekey="...">, or in an iframe src
    try:
        el = page.query_selector("[data-sitekey]")
        if el:
            sk = el.get_attribute("data-sitekey")
            if sk:
                return sk
    except Exception:
        pass
    # fallback: dig it out of the page HTML / iframe src (k=SITEKEY)
    try:
        html = page.content()
        m = re.search(r'data-sitekey="([^"]+)"', html) or \
            re.search(r'[?&]k=([A-Za-z0-9_\-]{20,})', html) or \
            re.search(r'sitekey["\']?\s*[:=]\s*["\']([^"\']+)', html)
        if m:
            return m.group(1)
    except Exception:
        pass
    return None


def capsolver_solve_recaptcha(key, website_url, sitekey, invisible=False):
    """Create a ReCaptchaV2 task and poll for the token. Returns token or None."""
    task = {
        "clientKey": key,
        "task": {
            "type": "ReCaptchaV2TaskProxyLess",
            "websiteURL": website_url,
            "websiteKey": sitekey,
            "isInvisible": invisible,
        },
    }
    try:
        r = requests.post(f"{CAPSOLVER_BASE}/createTask", json=task, timeout=30).json()
    except Exception as e:
        print(f"   capsolver createTask error: {e}")
        return None
    if r.get("errorId"):
        print(f"   capsolver error: {r.get('errorDescription')}")
        return None
    tid = r.get("taskId")
    if not tid:
        return None
    # poll up to ~120s
    for _ in range(40):
        time.sleep(3)
        try:
            g = requests.post(f"{CAPSOLVER_BASE}/getTaskResult",
                              json={"clientKey": key, "taskId": tid}, timeout=30).json()
        except Exception:
            continue
        if g.get("status") == "ready":
            return g.get("solution", {}).get("gRecaptchaResponse")
        if g.get("errorId"):
            print(f"   capsolver solve error: {g.get('errorDescription')}")
            return None
    print("   capsolver timed out")
    return None


def inject_and_submit(page, token):
    """Inject the reCAPTCHA token into the page and try to submit."""
    try:
        page.evaluate(
            """(tok) => {
                let ta = document.getElementById('g-recaptcha-response');
                if (!ta) {
                    ta = document.createElement('textarea');
                    ta.id = 'g-recaptcha-response';
                    ta.name = 'g-recaptcha-response';
                    ta.style = 'display:none';
                    document.body.appendChild(ta);
                }
                ta.value = tok;
                // fire common callback names google's sorry page uses
                if (typeof ___grecaptcha_cfg !== 'undefined') {
                    try {
                        Object.entries(___grecaptcha_cfg.clients).forEach(([i,c])=>{
                            Object.values(c).forEach(o=>{
                                Object.values(o).forEach(x=>{
                                    if (x && typeof x.callback === 'function') x.callback(tok);
                                });
                            });
                        });
                    } catch(e){}
                }
            }""", token)
        # the sorry page usually has a submit button / form
        for sel in ["#captcha-form button", "button[type=submit]",
                    "input[type=submit]", "#captcha-form"]:
            try:
                el = page.query_selector(sel)
                if el:
                    el.click()
                    break
            except Exception:
                continue
        time.sleep(3)
        return True
    except Exception as e:
        print(f"   token injection error: {e}")
        return False


def auto_solve(page, key):
    """Full API solve cycle for the current page. Returns True if cleared."""
    sitekey = extract_sitekey(page)
    if not sitekey:
        print("   couldn't find sitekey on the page")
        return False
    print(f"   solving via CapSolver API (sitekey {sitekey[:12]}...)")
    token = capsolver_solve_recaptcha(key, page.url, sitekey)
    if not token:
        return False
    inject_and_submit(page, token)
    return not is_captcha(page)


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
                "button:has-text('Reject all')", "button:has-text('I agree')",
                "button[aria-label*='Accept']", "button[aria-label*='Agree']"]:
        try:
            el = page.query_selector(sel)
            if el:
                el.click(); time.sleep(1); return True
        except Exception:
            continue
    return False


def wait_until_clear(page, label="Google", cap_key=None):
    dismiss_consent(page)
    if not is_captcha(page):
        return
    # 1) try CapSolver API
    if cap_key:
        print(f" CAPTCHA on {label} — solving via CapSolver API...")
        for attempt in range(2):
            if auto_solve(page, cap_key):
                print(" CapSolver cleared it — continuing.\n")
                return
            print(f"   attempt {attempt+1} didn't clear it")
        print(" CapSolver couldn't solve — falling back to manual.")
    # 2) manual fallback
    print("\n" + "!" * 60)
    print(f" CAPTCHA on {label}. Solve it in the browser window.")
    print("!" * 60)
    while True:
        input(" >> Press Enter after solving... ")
        dismiss_consent(page)
        if not is_captcha(page):
            print(" cleared — continuing.\n")
            return


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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--retry-statuses", nargs="*", default=None,
                    help="only re-search schools whose current status is in this list "
                         "(e.g. no_match failed empty). default: everything not 'found'.")
    ap.add_argument("--min-pause", type=float, default=2.5)
    ap.add_argument("--max-pause", type=float, default=6.0)
    ap.add_argument("--course-only", action="store_true")
    ap.add_argument("--capsolver-key", default=os.environ.get("CAPSOLVER_API_KEY"),
                    help="CapSolver API key (or set CAPSOLVER_API_KEY in .env)")
    args = ap.parse_args()

    cap_key = args.capsolver_key
    if cap_key:
        bal = capsolver_balance(cap_key)
        print(f"CapSolver API: {'balance $'+str(bal) if bal is not None else 'key set (balance check failed)'}")
    else:
        print("CapSolver: no key — CAPTCHAs will need manual solving")

    uri = os.environ.get("MONGODB_URI")
    if not uri:
        sys.exit("MONGODB_URI not set (.env)")
    client = MongoClient(uri, serverSelectionTimeoutMS=15000)
    client.admin.command("ping")
    db = client["kotlin_edu"]
    findings = db["university_findings"]
    progress = db["serp_progress"]
    findings.create_index([("url", ASCENDING)], unique=True)

    # figure out which schools to (re)search
    # a school is "done" if its progress status is 'found' (clean success).
    # everything else — no_match, empty, failed, captcha, blocked, error, or never
    # searched — is eligible.
    prog = {d["_id"]: d for d in progress.find({}, {"status": 1})}
    if args.retry_statuses:
        want = set(args.retry_statuses)
        eligible_keys = {k for k, v in prog.items() if v.get("status") in want}
        # also include never-searched? only if 'missing' explicitly requested
        include_missing = "missing" in want
    else:
        # default: not a clean success  -> retry
        eligible_keys = {k for k, v in prog.items() if v.get("status") not in CLEAN_DONE}
        include_missing = True

    unis_all = json.loads(Path(INPUT).read_text(encoding="utf-8"))
    unis_all = [u for u in unis_all if u.get("domains")]

    unis = []
    for u in unis_all:
        k = key_of(u)
        if k in eligible_keys:
            unis.append(u)
        elif include_missing and k not in prog:
            unis.append(u)   # never searched before

    if args.limit:
        unis = unis[:args.limit]

    status_counts = {}
    for u in unis:
        st = prog.get(key_of(u), {}).get("status", "missing")
        status_counts[st] = status_counts.get(st, 0) + 1
    print(f"{len(unis)} universities to (re)search")
    print(f"  by current status: {status_counts}")
    print(f"  session profile: ./{PROFILE_DIR}/ (persists across runs)\n")

    written = 0
    outcomes = {"found": 0, "no_match": 0, "captcha_solved": 0, "error": 0, "flipped": 0}

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            PROFILE_DIR, headless=False,
            args=["--disable-blink-features=AutomationControlled"],
            user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"),
            viewport={"width": 1366, "height": 800}, locale="en-US")
        ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")
        page = ctx.pages[0] if ctx.pages else ctx.new_page()

        print("Warming up session — opening Google...")
        page.goto("https://www.google.com/search?q=kotlin", wait_until="domcontentloaded", timeout=30000)
        wait_until_clear(page, "warm-up", cap_key)

        for i, uni in enumerate(unis, 1):
            name = uni["name"]
            domain = uni["domains"][0]
            k = key_of(uni)
            prev = prog.get(k, {}).get("status", "missing")
            q = f"kotlin site:{domain}"
            surl = ("https://www.google.com/search?q=" +
                    q.replace(" ", "+").replace(":", "%3A") + "&num=20")
            try:
                page.goto(surl, wait_until="domcontentloaded", timeout=30000)
            except Exception as e:
                outcomes["error"] += 1
                progress.update_one({"_id": k},
                    {"$set": {"name": name, "status": "error",
                              "detail": type(e).__name__,
                              "last_run": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}},
                    upsert=True)
                print(f"[{i}/{len(unis)}] {name:<28.28} ERROR {type(e).__name__}")
                continue

            if is_captcha(page):
                wait_until_clear(page, f"search #{i}", cap_key)
                outcomes["captcha_solved"] += 1
                page.goto(surl, wait_until="domcontentloaded", timeout=30000)

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
                res = findings.update_one(
                    {"url": r["url"]},
                    {"$setOnInsert": {
                        "url": r["url"], "university": name, "country": uni.get("country"),
                        "alpha_two_code": uni.get("alpha_two_code"), "title": r["title"],
                        "course_signal": is_course, "source": "university_website",
                        "discovery": "browser:google",
                        "found_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    }}, upsert=True)
                kept += 1
                if res.upserted_id is not None:
                    written += 1

            status = "found" if kept else "no_match"
            if status == "found" and prev not in CLEAN_DONE:
                outcomes["flipped"] += 1   # a previously-missed school now yields results
            outcomes[status] += 1
            progress.update_one({"_id": k},
                {"$set": {"name": name, "country": uni.get("country"),
                          "alpha_two_code": uni.get("alpha_two_code"),
                          "domain": domain, "status": status, "engine": "browser:google",
                          "kept": kept, "raw_results": len(results),
                          "last_run": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}},
                upsert=True)
            flip = "  <- flipped from " + prev if (status == "found" and prev not in CLEAN_DONE) else ""
            print(f"[{i}/{len(unis)}] {name:<28.28} {status} kept={kept} raw={len(results)}{flip}")
            time.sleep(random.uniform(args.min_pause, args.max_pause))

        ctx.close()

    print("\n" + "=" * 50 + "\n OUTCOMES")
    for kk, v in outcomes.items():
        if v:
            print(f"   {v:>5}  {kk}")
    total = findings.count_documents({})
    print(f"\n wrote {written} new findings | university_findings now {total}")
    if outcomes["flipped"]:
        print(f" {outcomes['flipped']} schools flipped from no_match/failed -> found this run")


if __name__ == "__main__":
    main()