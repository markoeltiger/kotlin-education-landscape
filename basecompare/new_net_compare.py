import csv
import json
import os
import re
import sys
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

# ---- name normalization: collapse "MIT" ~ "Massachusetts Institute of Technology" ----
STOP = {"the","of","at","for","and","de","der","das","die","la","le","in",
        "university","universität","universidad","università","universidade",
        "universite","université","universitat","college","institute","institut",
        "school","polytechnic","faculty","department","dept","campus","state",
        "technology","science","sciences","technical","national","international"}

ABBREV = {
    "mit":"massachusetts","ucla":"california los angeles","nyu":"new york",
    "cmu":"carnegie mellon","epfl":"lausanne","tum":"munich munchen",
    "ucsd":"california san diego","ucsb":"california santa barbara",
    "kaist":"korea advanced","nus":"singapore","ntu":"nanyang",
}

def norm(name):
    if not name: return ""
    s = name.lower().strip()
    # strip trailing " - alt name" the official list uses
    s = re.split(r"\s[-–]\s", s)[0]
    s = ABBREV.get(s.replace(".","").strip(), s)
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    toks = [t for t in s.split() if t and t not in STOP]
    return " ".join(sorted(set(toks)))

def load_official(path):
    """Parse the official list. Accepts the tab-separated text you pasted, OR the JSON."""
    names = set()
    raw = open(path, encoding="utf-8").read()
    # try JSON first
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            for k in ("universities","data","items"):
                if k in data: data = data[k]; break
        for u in data:
            nm = u.get("title") or u.get("name") if isinstance(u, dict) else None
            if nm: names.add(norm(nm))
        return names
    except json.JSONDecodeError:
        pass
    # else: tab/multi-space separated text (University <tab> City <tab> Country <tab> Course)
    for line in raw.splitlines():
        line = line.rstrip()
        if not line: continue
        # first column up to first tab or 2+ spaces
        first = re.split(r"\t|\s{2,}", line, maxsplit=1)[0].strip()
        if first and not first.startswith("http") and first.lower() != "university title aissms":
            names.add(norm(first))
    names.discard("")
    return names

def main():
    if len(sys.argv) < 2:
        sys.exit("usage: python netnew_universities.py <new_net_unis.txt|.json>")
    official = load_official(sys.argv[1])
    print(f"official list: {len(official)} unique universities")

    uri = os.environ.get("MONGODB_URI")
    if not uri: sys.exit("MONGODB_URI not set")
    db = MongoClient(uri, serverSelectionTimeoutMS=20000)["kotlin_edu"]

    # our discovered universities — ONLY course-signal pages (real programs, not stray mentions)
    mine = {}
    for d in db["university_findings"].find({"course_signal": True},
                                            {"university":1,"country":1,"url":1}):
        nm = norm(d.get("university"))
        if not nm: continue
        rec = mine.setdefault(nm, {"name": d.get("university"),
                                   "country": d.get("country"), "urls": set()})
        if d.get("url"): rec["urls"].add(d["url"])

    print(f"our discovered (course-signal only): {len(mine)} universities")

    # net-new = ours NOT on official
    netnew = [rec for nm, rec in mine.items() if nm not in official]
    netnew.sort(key=lambda r: (r["country"] or "zzz", r["name"]))

    print(f"NET-NEW (found by pipeline, not on official list): {len(netnew)}\n")

    # write CSV
    with open("netnew_universities.csv","w",newline="",encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["university","country","example_url"])
        for r in netnew:
            w.writerow([r["name"], r["country"] or "", next(iter(r["urls"]), "")])

    # print grouped by country
    from collections import defaultdict
    by_country = defaultdict(list)
    for r in netnew: by_country[r["country"] or "Unknown"].append(r["name"])
    for country in sorted(by_country, key=lambda c: -len(by_country[c])):
        print(f"\n{country} ({len(by_country[country])}):")
        for n in sorted(by_country[country]):
            print(f"   + {n}")

    print(f"\n\nWritten to netnew_universities.csv ({len(netnew)} universities)")

if __name__ == "__main__":
    main()