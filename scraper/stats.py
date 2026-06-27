import os
import sys
from collections import Counter

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()


def bar(n, total, width=30):
    if not total:
        return ""
    return "█" * int(width * n / total)


def section(title):
    print("\n" + "=" * 56)
    print(f" {title}")
    print("=" * 56)


def top(counter, label, n=12):
    print(f"\n{label}:")
    for k, v in counter.most_common(n):
        print(f"   {v:>6}  {str(k)[:40]}")


def main():
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        sys.exit("MONGODB_URI not set")
    db = MongoClient(uri, serverSelectionTimeoutMS=20000)["kotlin_edu"]

    section("COLLECTION SIZES")
    for c in ("github_repos", "mooc_courses", "university_findings",
              "serp_progress", "courses_unified"):
        print(f"   {db[c].count_documents({}):>7}  {c}")

    # ---------- GitHub ----------
    gh = list(db["github_repos"].find({}, {"repo_type": 1, "stars": 1, "edu_confidence": 1}))
    if gh:
        section(f"GITHUB  ({len(gh)} repos)")
        top(Counter(r.get("repo_type") for r in gh), "by repo type")
        conf = [r.get("edu_confidence", 0) for r in gh]
        hi = sum(1 for c in conf if c and c >= 0.7)
        print(f"\n   high-confidence educational (>=0.7): {hi}")
        print(f"   low-confidence / library noise (<0.3): {sum(1 for c in conf if (c or 0) < 0.3)}")

    # ---------- MOOCs ----------
    mooc = list(db["mooc_courses"].find({}, {"source": 1, "providers": 1, "languages": 1}))
    if mooc:
        section(f"MOOCS  ({len(mooc)} courses)")
        top(Counter(m.get("source") for m in mooc), "by platform")
        provs = Counter()
        for m in mooc:
            for p in (m.get("providers") or []):
                if p:
                    provs[p] += 1
        top(provs, "top providers", 8)

    # ---------- Universities ----------
    uni = list(db["university_findings"].find(
        {}, {"country": 1, "course_signal": 1, "discovery": 1, "university": 1}))
    if uni:
        section(f"UNIVERSITY FINDINGS  ({len(uni)} pages)")
        cs = sum(1 for u in uni if u.get("course_signal"))
        print(f"\n   course-signal (looks like a course): {cs}")
        print(f"   non-course supporting pages:        {len(uni) - cs}")
        top(Counter(u.get("country") for u in uni if u.get("country")), "top countries", 12)
        top(Counter(u.get("university") for u in uni if u.get("university")),
            "top universities (watch for over-scrape)", 10)
        top(Counter((u.get("discovery") or "").replace("serp:", "") for u in uni),
            "by engine", 6)

    # ---------- serp_progress outcomes ----------
    prog = list(db["serp_progress"].find({}, {"status": 1, "country": 1, "engine": 1}))
    if prog:
        section(f"CRAWL OUTCOMES  ({len(prog)} universities attempted)")
        st = Counter(p.get("status") for p in prog)
        for s in ("found", "no_match", "empty", "failed"):
            n = st.get(s, 0)
            print(f"   {n:>6}  {s:<10} {bar(n, len(prog))}")
        top(Counter(p.get("engine") for p in prog if p.get("engine")), "served by engine", 6)
        # failures by country = where blocking concentrated
        fail_c = Counter(p.get("country") for p in prog
                         if p.get("status") == "failed" and p.get("country"))
        if fail_c:
            top(fail_c, "failures by country", 8)

    print()


if __name__ == "__main__":
    main()