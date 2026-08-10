"""
Export the AI-analyzed `programs` collection to JSON files the dashboard reads.

Writes two files to public/data/:
  programs.json        — array of confirmed programs (is_program=true) with all fields
  topics.json          — topic distribution + level/language rollups (precomputed)

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


def main():
    outdir = Path(sys.argv[1] if len(sys.argv) > 1 else "public/data")
    outdir.mkdir(parents=True, exist_ok=True)

    uri = os.environ.get("MONGODB_URI")
    if not uri:
        sys.exit("MONGODB_URI not set")
    db = MongoClient(uri, serverSelectionTimeoutMS=20000)["kotlin_edu"]
    coll = db["programs"]

    # ---- 1. programs.json : confirmed programs only ----
    programs = []
    for p in coll.find({"is_program": True}, {"_id": 0}):
        programs.append({
            "university": p.get("university"),
            "country": clean_country(p.get("country")),
            "program_name": p.get("program_name"),
            "topics": p.get("topics") or [],
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

    # ---- 2. topics.json : precomputed distributions for charts ----
    topic_counts = Counter()
    topic_by_country = {}
    level_counts = Counter()
    language_counts = Counter()
    country_counts = Counter()

    for p in programs:
        for t in p["topics"]:
            topic_counts[t] += 1
        if p["level"]:
            level_counts[p["level"]] += 1
        if p["language_taught"]:
            language_counts[p["language_taught"]] += 1
        if p["country"]:
            country_counts[p["country"]] += 1
            tc = topic_by_country.setdefault(p["country"], Counter())
            for t in p["topics"]:
                tc[t] += 1

    topics_out = {
        "total_programs": len(programs),
        "topics": [{"topic": t, "count": c} for t, c in topic_counts.most_common()],
        "by_level": [{"level": k, "count": v} for k, v in level_counts.most_common()],
        "by_language": [{"language": k, "count": v} for k, v in language_counts.most_common()],
        "by_country": [{"country": k, "count": v} for k, v in country_counts.most_common()],
        "top_topics_by_country": {
            country: [{"topic": t, "count": c} for t, c in tc.most_common(8)]
            for country, tc in sorted(topic_by_country.items(),
                                      key=lambda kv: -sum(kv[1].values()))[:15]
        },
    }
    mb2 = write(outdir / "topics.json", topics_out)

    # ---- report ----
    analyzed = coll.count_documents({})
    confirmed = len(programs)
    print(f"  programs.json   {mb1:.3f} MB  ({confirmed} confirmed programs)")
    print(f"  topics.json     {mb2:.3f} MB  ({len(topic_counts)} distinct topics)")
    print(f"\n  analyzed total: {analyzed}  |  confirmed programs: {confirmed}")
    print(f"  countries with programs: {len(country_counts)}")
    print("\n  top topics:")
    for t, c in topic_counts.most_common(12):
        print(f"    {c:>4}  {t}")
    print(f"\n  written to {outdir.resolve()}")


if __name__ == "__main__":
    main()