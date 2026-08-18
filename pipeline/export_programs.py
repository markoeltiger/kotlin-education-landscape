"""
Export the AI-analyzed `programs` collection to JSON files the dashboard reads.

Writes two files to public/data/:
  programs.json  — array of confirmed programs (is_program=true) with all fields
  topics.json    — precomputed distributions, split by category:
                   targets / domains / concepts (+ by branch), plus level/language/country

Run after enrich_programs_browser.py:
  python export_programs.py public/data
"""
import json
import os
import sys
from collections import Counter
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

COUNTRY_FIX = {
    "USA": "United States", "US": "United States",
    "Russian Federation": "Russia", "Korea, Republic of": "South Korea",
    "Iran, Islamic Republic of": "Iran", "Viet Nam": "Vietnam",
    "Czechia": "Czech Republic", "Türkiye": "Turkey", "Turkiye": "Turkey",
    "Bolivia, Plurinational State of": "Bolivia",
    "Venezuela, Bolivarian Republic of": "Venezuela",
}


def clean_country(c):
    if not c:
        return None
    c = str(c).strip()
    return COUNTRY_FIX.get(c, c) or None


def write(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    return os.path.getsize(path) / 1e6


def dist(counter):
    return [{"topic": t, "count": c} for t, c in counter.most_common()]


def main():
    outdir = Path(sys.argv[1] if len(sys.argv) > 1 else "public/data")
    outdir.mkdir(parents=True, exist_ok=True)

    uri = os.environ.get("MONGODB_URI")
    if not uri:
        sys.exit("MONGODB_URI not set")
    db = MongoClient(uri, serverSelectionTimeoutMS=20000)["kotlin_edu"]
    coll = db["programs"]

    # ---- 1. programs.json ----
    programs = []
    for p in coll.find({"is_program": True}, {"_id": 0}):
        programs.append({
            "university": p.get("university"),
            "country": clean_country(p.get("country")),
            "program_name": p.get("program_name"),
            "topics": p.get("topics") or [],
            "topics_targets": p.get("topics_targets") or [],
            "topics_domains": p.get("topics_domains") or [],
            "topics_concepts": p.get("topics_concepts") or [],
            "topics_canonical": p.get("topics_canonical") or [],
            "level": p.get("level"),
            "prerequisites": p.get("prerequisites"),
            "language_taught": p.get("language_taught"),
            "credits": p.get("credits"),
            "summary": p.get("summary"),
            "confidence": p.get("ai_confidence"),
            "url": p.get("url"),
        })
    programs.sort(key=lambda x: (x["country"] or "zzz", x["university"] or "", x["program_name"] or ""))
    mb1 = write(outdir / "programs.json", programs)

    # ---- 2. topics.json : categorized distributions ----
    targets_c, domains_c, concepts_c = Counter(), Counter(), Counter()
    concepts_by_branch = {}
    level_c, language_c, country_c = Counter(), Counter(), Counter()
    targets_by_country = {}

    for p in programs:
        for t in p["topics_targets"]:
            targets_c[t] += 1
        for t in p["topics_domains"]:
            domains_c[t] += 1
        for c in p["topics_concepts"]:
            topic = c.get("topic"); branch = c.get("branch") or "Other"
            if topic:
                concepts_c[topic] += 1
                concepts_by_branch.setdefault(branch, Counter())[topic] += 1
        if p["level"]:
            level_c[p["level"]] += 1
        if p["language_taught"]:
            language_c[p["language_taught"]] += 1
        if p["country"]:
            country_c[p["country"]] += 1
            tbc = targets_by_country.setdefault(p["country"], Counter())
            for t in p["topics_targets"]:
                tbc[t] += 1

    topics_out = {
        "total_programs": len(programs),
        "targets": dist(targets_c),
        "domains": dist(domains_c),
        "concepts": dist(concepts_c),
        "concepts_by_branch": {
            branch: dist(counter) for branch, counter in
            sorted(concepts_by_branch.items(), key=lambda kv: -sum(kv[1].values()))
        },
        "by_level": [{"level": k, "count": v} for k, v in level_c.most_common()],
        "by_language": [{"language": k, "count": v} for k, v in language_c.most_common()],
        "by_country": [{"country": k, "count": v} for k, v in country_c.most_common()],
        "top_targets_by_country": {
            country: dist(tc) for country, tc in
            sorted(targets_by_country.items(), key=lambda kv: -sum(kv[1].values()))[:15]
        },
    }
    mb2 = write(outdir / "topics.json", topics_out)

    # ---- report ----
    analyzed = coll.count_documents({})
    print(f"  programs.json   {mb1:.3f} MB  ({len(programs)} confirmed programs)")
    print(f"  topics.json     {mb2:.3f} MB")
    print(f"\n  analyzed total: {analyzed}  |  confirmed programs: {len(programs)}")
    print(f"\n  targets:  {[t['topic'] for t in topics_out['targets'][:6]]}")
    print(f"  domains:  {[t['topic'] for t in topics_out['domains'][:6]]}")
    print(f"  concepts: {[t['topic'] for t in topics_out['concepts'][:6]]}")
    print(f"\n  written to {outdir.resolve()}")


if __name__ == "__main__":
    main()