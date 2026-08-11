"""
Export the courses_unified collection to JSON for the dashboard.

Writes to public/data/:
  courses_unified.json — the main dataset the dashboard reads

Run after normalizer.py:
  python export_courses_unified.py public/data
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()


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
    coll = db["courses_unified"]

    # Export all courses_unified documents
    courses = list(coll.find({}, {"_id": 0}))
    
    # Add metadata with timestamp
    output = {
        "meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_records": len(courses)
        },
        "courses": courses
    }

    mb = write(outdir / "courses_unified.json", output)

    # Report
    print(f"  courses_unified.json  {mb:.3f} MB  ({len(courses)} records)")
    print(f"\n  written to {outdir.resolve()}")


if __name__ == "__main__":
    main()