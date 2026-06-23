import argparse
import os
import sys
from collections import Counter

from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING

load_dotenv()

GH_PRIMARY = {"course", "tutorial", "workshop", "book_companion"}
# formal = structured, institution-backed; informal = self-directed / community
FORMAL_MOOC = {"coursera", "stepik", "edx", "udemy"}


def norm_github(c):
    rtype = c.get("repo_type")
    # GitHub is community/self-directed by nature -> informal, even "course" repos
    return {
        "source": "github", "category": "repository",
        "signal_tier": "primary" if rtype in GH_PRIMARY else "secondary",
        "learning_type": "informal",
        "title": c.get("full_name") or c.get("title"), "url": c.get("url"),
        "provider": c.get("owner"), "country": c.get("country"), "language": None,
        "subtype": rtype, "popularity": c.get("stars"), "date": c.get("created_at"),
        "kotlin_confidence": c.get("edu_confidence"), "raw_id": str(c.get("_id")),
    }


def norm_mooc(c):
    src = c.get("source")
    providers = c.get("providers") or []
    langs = c.get("languages") or []
    # structured platforms = formal; youtube = informal
    learning = "formal" if src in FORMAL_MOOC else "informal"
    return {
        "source": src, "category": "online_course",
        "signal_tier": "primary", "learning_type": learning,
        "title": c.get("title"), "url": c.get("url"),
        "provider": "; ".join(p for p in providers if p) or None,
        "country": None, "language": langs[0] if langs else None, "subtype": "mooc",
        "popularity": c.get("num_subscribers") or c.get("views"),
        "date": c.get("found_at"), "kotlin_confidence": 1.0,
        "raw_id": str(c.get("course_id")),
    }


def norm_university(c):
    sig = bool(c.get("course_signal"))
    # universities are institutional -> formal
    return {
        "source": "university_website", "category": "university_page",
        "signal_tier": "primary" if sig else "secondary",
        "learning_type": "formal",
        "title": c.get("title"), "url": c.get("url"), "provider": c.get("university"),
        "country": c.get("country"), "language": None, "subtype": c.get("content_type"),
        "popularity": None, "date": c.get("found_at"),
        "kotlin_confidence": 0.8 if sig else 0.4, "raw_id": c.get("url"),
    }


def main():
    ap = argparse.ArgumentParser()
    args = ap.parse_args()

    uri = os.environ.get("MONGODB_URI")
    if not uri:
        sys.exit("MONGODB_URI not set")

    client = MongoClient(uri, serverSelectionTimeoutMS=20000)
    client.admin.command("ping")
    db = client["kotlin_edu"]
    unified = db["courses_unified"]
    unified.create_index([("source", ASCENDING), ("raw_id", ASCENDING)], unique=True)

    rows = []
    for coll_name, fn in (("github_repos", norm_github),
                          ("mooc_courses", norm_mooc),
                          ("university_findings", norm_university)):
        n = 0
        for doc in db[coll_name].find({}):
            row = fn(doc)
            if not row.get("url"):
                continue
            rows.append(row)
            n += 1
        print(f"read {coll_name}: {n}")

    from pymongo import UpdateOne
    ops = [UpdateOne({"source": r["source"], "raw_id": r["raw_id"]},
                     {"$set": r}, upsert=True) for r in rows]
    written = 0
    for i in range(0, len(ops), 1000):
        res = unified.bulk_write(ops[i:i + 1000], ordered=False)
        written += res.upserted_count
        print(f"  wrote {min(i + 1000, len(ops))}/{len(ops)}")

    total = len(rows)
    by_source = Counter(r["source"] for r in rows)
    by_tier = Counter(r["signal_tier"] for r in rows)
    by_learning = Counter(r["learning_type"] for r in rows)
    countries = Counter(r["country"] for r in rows if r["country"])

    print("\n" + "=" * 50)
    print(" KOTLIN EDUCATION LANDSCAPE — UNIFIED SUMMARY")
    print("=" * 50)
    print(f" total records:        {total}")
    print(f" new this run:         {written}")
    print(f" courses_unified now:  {unified.count_documents({})}")
    print("\n learning type:")
    for t, n in by_learning.most_common():
        print(f"   {n:>6}  {t}")
    print("\n signal tier:")
    for t, n in by_tier.most_common():
        print(f"   {n:>6}  {t}")
    print("\n by source:")
    for s, n in by_source.most_common():
        print(f"   {n:>6}  {s}")
    print("\n top countries:")
    for c, n in countries.most_common(8):
        print(f"   {n:>6}  {c}")
    print("=" * 50)
    print(f"Written to MongoDB: kotlin_edu.courses_unified ({unified.count_documents({})} docs)")


if __name__ == "__main__":
    main()