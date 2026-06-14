
import argparse
import json
import re
import sys
import time
from pathlib import Path

import cdx_toolkit

INPUT = "world_universities_and_domains.json"
OUTPUT = "findings_commoncrawl.json"
PROGRESS = "cc_progress.json"      

# URL slugs that suggest a course/catalog page (cheap pre-filter, saves fetches)
CANDIDATE_URL = re.compile(
    r"(course|courses|syllab|module|curricul|catalog|catalogue|"
    r"bachelor|master|undergrad|module|class|teaching|lecture|"
    r"cs\d|comp\W?sci|informat|program(me|ming)?)", re.I)

# Page must mention Kotlin...
KOTLIN = re.compile(r"\bkotlin\b", re.I)
# ...AND at least one course marker, to confirm it's actually a course/syllabus.
COURSE_MARKER = re.compile(
    r"(syllab|prerequisit|credit hours?|\bECTS\b|semester|lecture|"
    r"learning outcome|assessment|instructor|course code|"
    r"\b[A-Z]{2,4}\s?\d{3}\b)", re.I)


def load_universities(tier, limit):
    unis = json.loads(Path(INPUT).read_text(encoding="utf-8"))
    if tier:
        unis = [u for u in unis if u.get("priority_tier") == tier]
    unis = [u for u in unis if u.get("domains")]
    unis.sort(key=lambda u: u.get("crawl_order", 1 << 30))
    return unis[:limit]


def extract_snippet(text, term=KOTLIN, radius=160):
    m = term.search(text)
    if not m:
        return ""
    a, b = max(0, m.start() - radius), min(len(text), m.end() + radius)
    return re.sub(r"\s+", " ", text[a:b]).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=50, help="max universities this run")
    ap.add_argument("--tier", type=int, default=1, help="priority tier to process")
    ap.add_argument("--crawls", type=int, default=2,
                    help="how many recent monthly crawls to span")
    ap.add_argument("--max-captures", type=int, default=400,
                    help="cap CDX captures pulled per domain (politeness)")
    ap.add_argument("--debug", action="store_true",
                    help="show fetched/kotlin_only diagnostics per university")
    args = ap.parse_args()

    cdx = cdx_toolkit.CDXFetcher(source="cc")

    progress = set()
    if Path(PROGRESS).exists():
        progress = set(json.loads(Path(PROGRESS).read_text()))

    findings = []
    if Path(OUTPUT).exists():
        findings = json.loads(Path(OUTPUT).read_text(encoding="utf-8"))
    seen_urls = {f["url"] for f in findings}

    unis = load_universities(args.tier, args.limit + len(progress))
    unis = [u for u in unis
            if (u["name"] + "|" + (u.get("alpha_two_code") or "")) not in progress][:args.limit]
    print(f"Processing {len(unis)} universities (tier {args.tier}, "
          f"{args.crawls} crawl(s) each)\n")

    for i, uni in enumerate(unis, 1):
        name = uni["name"]
        uni_key = name + "|" + (uni.get("alpha_two_code") or "")
        hits_here = 0
        candidates_seen = 0
        kotlin_only = 0          # diagnostic: Kotlin present but no course marker
        fetched = 0              # diagnostic: candidate pages whose text we read
        errored = False

        for domain in uni["domains"]:            # try every domain (alias coverage)
            try:
                for cap in cdx.iter(f"{domain}/*", limit=args.max_captures,
                                    crawl=[str(args.crawls)],
                                    filter=["status:200", "mime:text/html"]):
                    url = cap.data.get("url", "")
                    if not CANDIDATE_URL.search(url):
                        continue
                    candidates_seen += 1
                    if url in seen_urls:
                        continue
                    try:
                        text = cap.text or ""      # archived page text (free)
                    except Exception:
                        continue
                    fetched += 1
                    has_kotlin = bool(KOTLIN.search(text))
                    if has_kotlin and COURSE_MARKER.search(text):
                        rec = {
                            "url": url,
                            "university": name,
                            "country": uni.get("country"),
                            "alpha_two_code": uni.get("alpha_two_code"),
                            "priority_tier": uni.get("priority_tier"),
                            "source_type": "university_website",
                            "discovery": "common_crawl",
                            "crawl_timestamp": cap.data.get("timestamp"),
                            "snippet": extract_snippet(text),
                            "found_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        }
                        findings.append(rec)
                        seen_urls.add(url)
                        hits_here += 1
                    elif has_kotlin:
                        kotlin_only += 1
            except Exception as e:                  # noqa: BLE001
                print(f"  ! {name} ({domain}): {e}", file=sys.stderr)
                errored = True

        # only mark complete if nothing errored — otherwise retry on next run
        if not errored:
            progress.add(uni_key)
        # checkpoint every uni so long runs are fully resumable
        Path(OUTPUT).write_text(json.dumps(findings, ensure_ascii=False, indent=1))
        Path(PROGRESS).write_text(json.dumps(sorted(progress)))
        flag = f"{hits_here} HIT(S)" if hits_here else "-"
        diag = f"fetched={fetched:<3} kotlin_only={kotlin_only}" if args.debug else ""
        print(f"[{i}/{len(unis)}] {name:<42.42} cand={candidates_seen:<4} "
              f"{flag:<9} {diag}")

    print(f"\nDone. {len(findings)} total findings in {OUTPUT}.")
    by_country = {}
    for f in findings:
        by_country[f["country"]] = by_country.get(f["country"], 0) + 1
    top = sorted(by_country.items(), key=lambda x: -x[1])[:10]
    if top:
        print("Top countries by Kotlin course pages found:")
        for c, n in top:
            print(f"  {n:>4}  {c}")


if __name__ == "__main__":
    main()