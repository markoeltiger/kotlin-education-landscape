import csv
import os
import sys

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

# Tableau-friendly flat schema. One row per record, geographic fields clean.
FIELDS = ["source", "category", "signal_tier", "learning_type",
          "title", "provider", "country", "language", "subtype",
          "popularity", "kotlin_confidence", "url"]

# map common country variants -> names Tableau geocodes cleanly
COUNTRY_FIX = {
    "United States": "United States", "USA": "United States", "US": "United States",
    "Russian Federation": "Russia", "Korea, Republic of": "South Korea",
    "Iran, Islamic Republic of": "Iran", "Viet Nam": "Vietnam",
    "Tanzania, United Republic of": "Tanzania", "Bolivia, Plurinational State of": "Bolivia",
    "Venezuela, Bolivarian Republic of": "Venezuela", "Czechia": "Czech Republic",
    "Türkiye": "Turkey", "Turkiye": "Turkey", "Syrian Arab Republic": "Syria",
    "Moldova, Republic of": "Moldova", "Brunei Darussalam": "Brunei",
    "Lao People's Democratic Republic": "Laos", "Macedonia": "North Macedonia",
}


def clean_country(c):
    if not c:
        return None
    c = c.strip()
    return COUNTRY_FIX.get(c, c)


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "kotlin_education_tableau.csv"
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        sys.exit("MONGODB_URI not set")
    db = MongoClient(uri, serverSelectionTimeoutMS=20000)["kotlin_edu"]

    rows = list(db["courses_unified"].find({}))
    written = 0
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        for r in rows:
            w.writerow({
                "source": r.get("source"),
                "category": r.get("category"),
                "signal_tier": r.get("signal_tier"),
                "learning_type": r.get("learning_type"),
                "title": (r.get("title") or "")[:200],
                "provider": r.get("provider"),
                "country": clean_country(r.get("country")),
                "language": r.get("language"),
                "subtype": r.get("subtype"),
                "popularity": r.get("popularity"),
                "kotlin_confidence": r.get("kotlin_confidence"),
                "url": r.get("url"),
            })
            written += 1

    # also a universities-only file (clean geo) for the map sheet
    uni_path = out_path.replace(".csv", "_universities.csv")
    with open(uni_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        uni = 0
        for r in rows:
            if r.get("source") != "university_website":
                continue
            w.writerow({
                "source": r.get("source"), "category": r.get("category"),
                "signal_tier": r.get("signal_tier"), "learning_type": r.get("learning_type"),
                "title": (r.get("title") or "")[:200], "provider": r.get("provider"),
                "country": clean_country(r.get("country")), "language": r.get("language"),
                "subtype": r.get("subtype"), "popularity": r.get("popularity"),
                "kotlin_confidence": r.get("kotlin_confidence"), "url": r.get("url"),
            })
            uni += 1

    print(f"wrote {written} rows -> {out_path}")
    print(f"wrote {uni} university rows -> {uni_path}")
    print("\nTableau tips:")
    print("  - country -> set Geographic Role = Country/Region for the map")
    print("  - filter signal_tier = 'primary' for the educational core")
    print("  - use the _universities file for the map sheet (clean geo)")


if __name__ == "__main__":
    main()