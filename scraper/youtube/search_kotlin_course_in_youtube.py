import argparse
import os
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

SEARCH = "https://www.googleapis.com/youtube/v3/search"
VIDEOS = "https://www.googleapis.com/youtube/v3/videos"


def trim(text, n=300):
    if not text:
        return None
    text = " ".join(text.split())
    return text[:n] + ("…" if len(text) > n else "")


def get_collection():
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        sys.exit("MONGODB_URI not set (check your .env)")
    client = MongoClient(uri, serverSelectionTimeoutMS=15000)
    client.admin.command("ping")
    coll = client["kotlin_edu"]["youtube_courses"]
    coll.create_index([("source", ASCENDING), ("course_id", ASCENDING)], unique=True)
    return coll


def fetch_stats(key, video_ids):
    if not video_ids:
        return {}
    r = requests.get(VIDEOS, timeout=30, params={
        "key": key, "part": "statistics", "id": ",".join(video_ids)})
    if r.status_code != 200:
        return {}
    out = {}
    for it in r.json().get("items", []):
        st = it.get("statistics", {})
        out[it["id"]] = int(st.get("viewCount", 0)) if st.get("viewCount") else None
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--query", default="kotlin course")
    ap.add_argument("--pages", type=int, default=2, help="50 results per page")
    ap.add_argument("--lang", default=None, help="optional relevanceLanguage, e.g. en")
    args = ap.parse_args()

    key = os.environ.get("YOUTUBE_API_KEY")
    if not key:
        sys.exit("YOUTUBE_API_KEY not set. Create one free in Google Cloud Console "
                 "(enable 'YouTube Data API v3') and add it to .env.")

    coll = get_collection()
    written = seen = 0
    token = None

    for page in range(args.pages):
        params = {"key": key, "part": "snippet", "q": args.query,
                  "type": "video", "maxResults": 50, "order": "relevance"}
        if args.lang:
            params["relevanceLanguage"] = args.lang
        if token:
            params["pageToken"] = token
        r = requests.get(SEARCH, params=params, timeout=30)
        if r.status_code != 200:
            print(f"youtube HTTP {r.status_code}: {r.text[:200]}", file=sys.stderr)
            break
        data = r.json()
        items = data.get("items", [])
        ids = [it["id"]["videoId"] for it in items if it.get("id", {}).get("videoId")]
        stats = fetch_stats(key, ids)

        for it in items:
            vid = it.get("id", {}).get("videoId")
            if not vid:
                continue
            seen += 1
            sn = it.get("snippet", {})
            doc = {
                "source": "youtube",
                "course_id": vid,
                "title": sn.get("title"),
                "url": f"https://www.youtube.com/watch?v={vid}",
                "description": trim(sn.get("description")),
                "providers": [sn.get("channelTitle")] if sn.get("channelTitle") else [],
                "languages": [args.lang] if args.lang else None,
                "views": stats.get(vid),
                "published": sn.get("publishedAt"),
                "found_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            res = coll.update_one({"source": "youtube", "course_id": vid},
                                  {"$setOnInsert": doc}, upsert=True)
            if res.upserted_id is not None:
                written += 1
                print(f"  + {doc['title'][:55]}  ({doc['providers']})")

        print(f"[page {page+1}] seen={seen} new={written}")
        token = data.get("nextPageToken")
        if not token:
            break
        time.sleep(1)

    print(f"\nWrote {written} new. youtube total: {coll.count_documents({'source':'youtube'})}")


if __name__ == "__main__":
    main()