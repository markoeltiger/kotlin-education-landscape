import json
import os
import re
import sys
from collections import Counter

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

try:
    import yaml
    HAVE_YAML = True
except ImportError:
    HAVE_YAML = False


# ---------- name normalization so "MIT" ~ "Massachusetts Institute of Technology" ----------
STOP = {"the", "of", "at", "for", "and", "de", "der", "das", "die", "la", "le",
        "university", "universität", "universidad", "università", "universidade",
        "universite", "université", "college", "institute", "institut", "school",
        "polytechnic", "faculty", "department", "dept", "campus", "state"}

ABBREV = {
    "mit": "massachusetts institute technology",
    "ucla": "california los angeles",
    "nyu": "new york",
    "cmu": "carnegie mellon",
    "iit": "indian institute technology",
    "nit": "national institute technology",
    "ethz": "eth zurich",
    "tum": "technische munchen munich",
    "kit": "karlsruhe institute technology",
}


def norm_name(name):
    if not name:
        return ""
    s = name.lower().strip()
    s = ABBREV.get(s.replace(".", "").strip(), s)
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    toks = [t for t in s.split() if t and t not in STOP]
    return " ".join(sorted(set(toks)))


def domain_root(url_or_domain):
    if not url_or_domain:
        return ""
    s = url_or_domain.lower()
    s = re.sub(r"^https?://", "", s)
    s = s.split("/")[0]
    s = re.sub(r"^www\.", "", s)
    return s


def load_official(path):
    """Accept .json or .yml export of kotlinlang.org universities."""
    raw = open(path, encoding="utf-8").read()
    data = None
    # try json first
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        if HAVE_YAML:
            data = yaml.safe_load(raw)
        else:
            sys.exit("File isn't JSON and PyYAML isn't installed. pip install pyyaml")
    # the file may be a list, or a dict with a 'universities' key
    if isinstance(data, dict):
        for k in ("universities", "data", "items"):
            if k in data:
                data = data[k]
                break
    if not isinstance(data, list):
        sys.exit(f"Unexpected structure in {path}: expected a list of universities")
    unis = []
    for u in data:
        if not isinstance(u, dict):
            continue
        name = u.get("title") or u.get("name") or u.get("university")
        loc = u.get("location") or u.get("country") or ""
        # official entries sometimes have a 'geo'/'courses' with links
        url = ""
        courses = u.get("courses") or u.get("teaching") or []
        if isinstance(courses, list) and courses:
            first = courses[0]
            if isinstance(first, dict):
                url = first.get("url") or first.get("link") or ""
        url = url or u.get("url") or u.get("link") or ""
        unis.append({"name": name, "location": loc, "url": url,
                     "norm": norm_name(name), "domain": domain_root(url)})
    return [u for u in unis if u["name"]]


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: python baseline_compare.py <official_universities.json|.yml>")
    official = load_official(sys.argv[1])

    uri = os.environ.get("MONGODB_URI")
    if not uri:
        sys.exit("MONGODB_URI not set")
    db = MongoClient(uri, serverSelectionTimeoutMS=20000)["kotlin_edu"]

    # build our discovered set: unique universities from findings
    mine = {}
    for d in db["university_findings"].find({}, {"university": 1, "url": 1, "country": 1, "course_signal": 1}):
        nm = norm_name(d.get("university"))
        if not nm:
            continue
        rec = mine.setdefault(nm, {"name": d.get("university"), "domains": set(),
                                   "country": d.get("country"), "pages": 0, "course": False})
        rec["pages"] += 1
        rec["domains"].add(domain_root(d.get("url")))
        if d.get("course_signal"):
            rec["course"] = True

    # also: which universities did we ATTEMPT but not find? (for miss diagnosis)
    attempted = {}
    for p in db["serp_progress"].find({}, {"name": 1, "status": 1, "domain": 1}):
        nm = norm_name(p.get("name"))
        if nm:
            attempted[nm] = {"status": p.get("status"), "domain": p.get("domain")}

    mine_norms = set(mine.keys())

    rediscovered, netnew_missing_from_official, missed = [], [], []
    # rediscovered + missed are judged from official's perspective
    for o in official:
        if o["norm"] in mine_norms:
            rediscovered.append(o)
        else:
            # we didn't find it — why?
            att = attempted.get(o["norm"])
            reason = "not in our university list" if not att else f"searched: {att['status']}"
            o["miss_reason"] = reason
            missed.append(o)

    official_norms = {o["norm"] for o in official}
    for nm, rec in mine.items():
        if nm not in official_norms:
            netnew_missing_from_official.append(rec)

    # ---------- report ----------
    print("=" * 60)
    print(" BASELINE COMPARISON  ·  pipeline vs kotlinlang.org/education")
    print("=" * 60)
    print(f" official list:        {len(official)} universities")
    print(f" our discovered:       {len(mine)} universities")
    print("-" * 60)
    print(f" REDISCOVERED (on both):     {len(rediscovered):>4}   "
          f"{100*len(rediscovered)//max(1,len(official))}% of official list")
    print(f" NET-NEW (only ours):        {len(netnew_missing_from_official):>4}   "
          f"universities the official list is missing")
    print(f" MISSED (only official):     {len(missed):>4}   "
          f"universities we failed to discover")
    print("=" * 60)

    # miss diagnosis — the debugging value
    print("\nWHY WE MISSED THEM:")
    reasons = Counter(o["miss_reason"] for o in missed)
    for r, n in reasons.most_common():
        print(f"   {n:>4}  {r}")

    print("\nSample MISSED universities (first 25):")
    for o in missed[:25]:
        print(f"   - {o['name'][:44]:<44} [{o['miss_reason']}]")

    print("\nSample NET-NEW discoveries (first 25):")
    for r in sorted(netnew_missing_from_official, key=lambda x: -x["pages"])[:25]:
        tag = "course" if r["course"] else "page"
        print(f"   + {r['name'][:44]:<44} ({r['country'] or '?'}, {tag})")

    # write full breakdown to json for the dashboard / deeper analysis
    out = {
        "summary": {
            "official": len(official), "ours": len(mine),
            "rediscovered": len(rediscovered),
            "net_new": len(netnew_missing_from_official),
            "missed": len(missed),
            "recall_pct": round(100*len(rediscovered)/max(1, len(official)), 1),
        },
        "missed": [{"name": o["name"], "location": o["location"],
                    "reason": o["miss_reason"]} for o in missed],
        "net_new": [{"name": r["name"], "country": r["country"],
                     "pages": r["pages"], "course": r["course"]}
                    for r in netnew_missing_from_official],
        "miss_reasons": dict(reasons),
    }
    with open("baseline_comparison.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print("\nFull breakdown written to baseline_comparison.json")


if __name__ == "__main__":
    main()