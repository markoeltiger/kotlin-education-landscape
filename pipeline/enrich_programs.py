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
  python enrich_programs.py --course-only --limit 50
"""
import argparse
import json
import os
import re
import sys
import time
from collections import Counter

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


TARGETS = {
    "Android": ["android", "android development", "android app development",
                "android application development", "mobile", "mobile programming",
                "mobile app development", "mobile application development",
                "mobile development", "mobile client development", "mobile devices",
                "mobile computing", "handheld systems", "mobil uygulama geliştirme",
                "desarrollo de aplicaciones móviles"],
    "JVM server": ["jvm server", "back-end", "backend development", "backend server",
                   "backend", "server-side programming", "building services", "web services"],
    "Browser (Kotlin/JS)": ["browser", "browser (kotlin/js)", "web", "web development",
                            "progressive web apps"],
    "Desktop (JVM)": ["desktop", "desktop (jvm)"],
    "iOS (Kotlin/Native)": ["ios", "ios (kotlin/native)"],
    "Multiplatform": ["multiplatform", "kotlin multiplatform", "cross-platform code",
                      "cross-platform development", "shared module"],
    "Serverless": ["serverless", "aws-lambda"],
    "Cloud-hosted": ["cloud", "cloud computing", "cloud-based development", "aws", "azure"],
    "Library / SDK": ["library / sdk", "library development", "exposed library"],
    "Full-stack": ["full-stack", "full-stack web development", "full-stack development",
                   "full-stack applications"],
    "Containerized deployment": ["containerized deployment", "docker"],
}
DOMAINS = {
    "Data analysis": ["data analysis", "fundamentals of data analysis", "big data",
                      "data visualizations"],
    "AI / machine learning": ["ai", "machine learning", "machine intelligence",
                              "fundamentals of artificial intelligence", "tensorflow",
                              "ai-powered mobile applications"],
    "LLM application development": ["llm application development", "chatbot",
                                    "persistent chat history", "streaming interactions",
                                    "tool use", "tool integrations"],
    "Information retrieval": ["information retrieval", "retrieval systems"],
    "Scientific computing": ["scientific computing", "scientific software", "particle physics"],
    "Games and graphics": ["games and graphics", "game development", "2d graphics", "graphics"],
    "Telecom infrastructure": ["telecom infrastructure", "5g", "5g wireless",
                               "network slicing", "bandwidth estimation"],
    "Location-based services": ["location-based services", "weather services"],
}
CONCEPT_BRANCHES = {
    "Language fundamentals": {
        "Basic syntax": ["basic syntax", "syntax and conventions"],
        "Types and inference": ["type inference", "custom types", "variables, types"],
        "Primitives": ["primitives", "numbers", "strings", "booleans"],
        "Conditionals": ["conditionals", "control logic"],
        "Loops": ["loops"],
        "Pattern matching (when)": ["pattern matching with when", "pattern matching"],
        "Functions": ["functions", "fonksiyonlar"],
        "Inline functions": ["inline functions"],
        "Null safety": ["null safety", "nullability", "nullables"],
        "Collections": ["collections", "sets", "maps", "tuples", "iterables"],
        "Sequences / lazy": ["sequences and lazy evaluation", "lazy iterables", "streams",
                             "generators", "async generators"],
        "Regular expressions": ["regular expressions"],
        "Standard library": ["kotlin standard library"],
    },
    "Object-oriented Kotlin": {
        "Classes": ["classes"], "Data classes": ["data classes"],
        "Inheritance": ["inheritance"], "Encapsulation": ["encapsulation"],
        "Interfaces and delegation": ["interfaces and delegation"],
        "Composition": ["composition"], "Generics": ["generics"],
        "Sealed classes / ADTs": ["sealed classes and algebraic data types",
                                  "algebraic data types", "product types"],
        "Object-oriented programming": ["object-oriented programming", "oop"],
        "Design patterns": ["design patterns", "builder pattern", "factory pattern"],
    },
    "Functional Kotlin": {
        "Functional programming": ["functional programming"],
        "Lambdas / higher-order": ["lambdas and higher-order functions", "lambdas"],
        "Scope functions": ["scope functions"],
        "Immutability": ["side effects and immutability"],
        "DSLs": ["domain-specific languages", "dsls"],
    },
    "Concurrency and asynchrony": {
        "Concurrency": ["concurrency"], "Coroutines": ["coroutines", "kotlinx.coroutines"],
        "Structured concurrency": ["structured concurrency"], "Flow": ["flow", "reactive framework"],
        "Channels": ["channels"], "Actors": ["actors"],
        "Threading": ["threading", "multithreading"],
        "Async programming": ["asynchronous programming", "asynchronous processing"],
        "Inter-task communication": ["inter-task communication"],
    },
    "Tooling, build, interop": {
        "Gradle": ["gradle"], "Maven": ["maven central", "maven"],
        "IDE (Studio/IntelliJ)": ["android studio", "intellij idea", "android development studio"],
        "Testing": ["testing", "app testing"], "Debugging": ["debugging"],
        "Version control": ["version control", "git", "version control with git"],
        "Compiler internals": ["compiler internals"], "JVM": ["jvm", "java virtual machine"],
        "Java interop": ["java interop", "java interoperability", "interoperability"],
        "Deployment": ["deployment", "app publishing", "google play"],
    },
    "Data and persistence": {
        "Data persistence": ["data persistence", "persistence", "storage", "data storage"],
        "Databases": ["databases", "database", "database systems", "dbms/sql",
                      "database development", "database administration"],
        "SQL / NoSQL": ["sql", "nosql"],
        "Serialization / JSON": ["serialization and json parsing", "kotlinx.serialization"],
        "Persistence libraries": ["room", "sqlite", "sqldelight", "exposed", "firebase",
                                  "mongodb", "mysql", "oracle"],
    },
    "Networking and APIs": {
        "Networking": ["networking", "network communication"],
        "REST API design": ["rest api design", "restful apis", "api integration",
                            "interfaces to external services"],
        "Networking libraries": ["retrofit", "ktor client"],
    },
    "UI and presentation": {
        "Jetpack Compose": ["jetpack compose", "kotlin compose", "composeui"],
        "Compose Multiplatform": ["compose multiplatform"],
        "Declarative UI": ["declarative ui", "declarative ui design"],
        "State management": ["state management"],
        "Unidirectional data flow": ["unidirectional data flow"],
        "Navigation": ["navigation"], "Theming and styling": ["theming and styling"],
        "Animation": ["animation", "animations", "ui animation"],
        "Layouts": ["layout", "layouts", "xml", "xml layouts"],
        "Lists and scrolling": ["recyclerview", "recycler view", "listview",
                               "scrollable lists", "card view", "lists and scrolling"],
        "ViewBinding": ["viewbinding"], "WebView": ["webview"], "Menus": ["menus"],
        "UI design": ["ui design", "ui", "user interface", "user interface design", "gui"],
        "UX design": ["ux design", "ui/ux", "ui/ux design"],
        "Responsive design": ["responsive design", "responsive website design"],
    },
    "Application architecture": {
        "Architecture": ["architecture", "android architecture"],
        "MVVM": ["mvvm", "model-view-viewmodel"], "MVC": ["mvc"],
        "ViewModel": ["viewmodel"], "LiveData": ["livedata"],
        "Business logic": ["business logic"], "Data management": ["data management"],
        "Event handling": ["event handling", "events"],
    },
    "Cross-cutting concerns": {
        "Security": ["security", "cybersecurity", "android security"],
        "Accessibility": ["accessibility"], "Localization": ["localization"],
        "Performance and memory": ["performance and memory", "memory"],
    },
    "Multiplatform engineering": {
        "expect/actual": ["expect/actual declarations", "expect/actual"],
        "Shared module design": ["shared module design"],
        "Platform-specific impl": ["platform-specific implementations"],
    },
    "Server-side Kotlin": {
        "Ktor": ["ktor"], "Spring Boot": ["spring boot"],
        "Serverless functions": ["serverless functions"],
    },
    "Android platform APIs": {
        "App components": ["activities", "activity lifecycle", "fragments", "intents",
                          "services", "broadcast receivers", "app components"],
        "Permissions / background": ["permissions", "notifications", "workmanager"],
        "Inter-component communication": ["inter-component communication"],
        "Android SDK": ["android sdk"], "Jetpack": ["jetpack", "jetpack apis"],
        "Device capabilities": ["sensors", "android sensing", "bluetooth", "touch",
                               "multitouch", "audio/video", "device capabilities"],
        "Location and maps": ["location", "gps", "maps", "google maps", "location and maps"],
    },
}


def _norm(label):
    return re.sub(r"\s+", " ", (label or "").strip().lower())


def _build_lookup():
    lut = {}
    for canon, variants in TARGETS.items():
        for v in variants + [canon]:
            lut[_norm(v)] = ("target", canon, None)
    for canon, variants in DOMAINS.items():
        for v in variants + [canon]:
            lut[_norm(v)] = ("domain", canon, None)
    for branch, canons in CONCEPT_BRANCHES.items():
        for canon, variants in canons.items():
            for v in variants + [canon]:
                lut[_norm(v)] = ("concept", canon, branch)
    return lut


_LOOKUP = _build_lookup()


def classify_topic(raw):
    return _LOOKUP.get(_norm(raw), ("other", raw, None))


def categorize(raw_topics):
    """Split a program's raw topics into canonical target/domain/concept/other."""
    targets, domains, concepts, other, canonical = [], [], [], [], set()
    for label in raw_topics or []:
        cat, canon, branch = classify_topic(label)
        if cat == "target":
            targets.append(canon); canonical.add(canon)
        elif cat == "domain":
            domains.append(canon); canonical.add(canon)
        elif cat == "concept":
            concepts.append({"topic": canon, "branch": branch}); canonical.add(canon)
        else:
            other.append(canon)
    seen, cdd = set(), []
    for c in concepts:
        keyc = (c["topic"], c["branch"])
        if keyc not in seen:
            seen.add(keyc); cdd.append(c)
    return {
        "topics_targets": sorted(set(targets)),
        "topics_domains": sorted(set(domains)),
        "topics_concepts": cdd,
        "topics_other": sorted(set(other)),
        "topics_canonical": sorted(canonical),
    }


SYSTEM = """You analyze a university web page to decide whether it is related to \
teaching or using the Kotlin programming language in an educational context.

Count it as a program (is_program=true) if the page is a course, module, lab, \
workshop, bootcamp, seminar, degree, or any structured teaching where Kotlin is \
taught OR used as a tool — even if Kotlin is only part of a broader course (e.g. a \
mobile development or programming-languages course that uses Kotlin). When in doubt \
and there is genuine teaching content involving Kotlin, lean towards is_program=true.

Only set is_program=false when the page clearly is NOT teaching material — e.g. a \
news article, a staff/faculty profile, a pure research paper, a job posting, or a \
library catalog entry, with no course content.

Return ONLY a JSON object, no markdown, with EXACTLY these keys:
{
  "is_program": true/false,
  "confidence": 0.0-1.0,
  "program_name": "the course/program title, or null",
  "topics": ["subjects taught, e.g. Android, Coroutines, Jetpack Compose, Backend, MVVM"],
  "level": "undergraduate | graduate | bootcamp | professional | unknown",
  "prerequisites": "short text or null",
  "language_taught": "human language of instruction if stated, else null",
  "credits": "credit value/ECTS if stated, else null",
  "summary": "one sentence describing what the course teaches"
}
For topics, prefer common canonical names (Android, Mobile, Coroutines, Flow, \
Jetpack Compose, Backend, Multiplatform, MVVM, Testing, Networking, Databases, etc.)."""


def fetch_text_browser(page, url, timeout=25000):
    try:
        resp = page.goto(url, wait_until="domcontentloaded", timeout=timeout)
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
        raw_topics = ai.get("topics") or []
        rec = {
            "url": url, "university": d.get("university"), "country": d.get("country"),
            "alpha_two_code": d.get("alpha_two_code"),
            "is_program": is_prog, "status": "program" if is_prog else "not_program",
            "program_name": ai.get("program_name"), "topics": raw_topics,
            "level": ai.get("level"), "prerequisites": ai.get("prerequisites"),
            "language_taught": ai.get("language_taught"), "credits": ai.get("credits"),
            "summary": ai.get("summary"), "ai_confidence": ai.get("confidence"),
            "source_title": d.get("title"),
            "analyzed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        # add canonical categorized topics for confirmed programs
        if is_prog:
            rec.update(categorize(raw_topics))
        programs.update_one({"url": url}, {"$set": rec}, upsert=True)
        counter["i"] += 1
        if is_prog:
            counter["programs"] += 1
        else:
            counter["rejected"] += 1
        tag = "PROGRAM" if is_prog else "not-prog"
        nm = (ai.get("program_name") or "")[:32]
        topics = ",".join((rec.get("topics_canonical") or raw_topics)[:3])
        print(f"[{counter['i']}/{n}] {tag:<8} {d.get('university','')[:22]:<22} {nm:<32} [{topics}]")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"])
        ctx = browser.new_context(
            user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"),
            ignore_https_errors=True,
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

    canon = Counter()
    for pr in programs.find({"is_program": True}, {"topics_canonical": 1, "topics": 1}):
        for t in (pr.get("topics_canonical") or pr.get("topics") or []):
            canon[t] += 1
    if canon:
        print("\n top canonical topics across programs:")
        for t, c in canon.most_common(15):
            print(f"   {c:>4}  {t}")


if __name__ == "__main__":
    main()