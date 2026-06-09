import json
import time
import requests
from pymongo import MongoClient
from dotenv import load_dotenv
import os
from bs4 import BeautifulSoup
load_dotenv()


MONGO_URI      = os.getenv("MONGO_URI", "mongodb://localhost:27017")

HIPO_FILE = "world_universities_and_domains.json"

def search_kotlin(domain):
    query = f"kotlin site:{domain}"
    url   = "https://html.duckduckgo.com/html/"
    resp  = requests.get(
        url,
        params={"q": query},
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=15
    )
    soup    = BeautifulSoup(resp.text, "html.parser")
    results = []
    for a in soup.select(".result__a")[:5]:
        results.append({
            "title": a.get_text(strip=True),
            "link":  a.get("href", ""),
        })
    return results


def main():
    with open(HIPO_FILE, "r", encoding="utf-8") as f:
        universities = json.load(f)

    client = MongoClient(MONGO_URI)
    col    = client["kotlin_edu"]["universities"]

    batch = universities[:100]
    print(f"Processing {len(batch)} universities...\n")

    for i, uni in enumerate(batch):
        name    = uni.get("name", "")
        domain  = (uni.get("domains") or [""])[0]
        country = uni.get("country", "")
        website = (uni.get("web_pages") or [""])[0]

        if not domain:
            print(f"[{i+1}/100] {name} — no domain, skipping")
            continue

        print(f"[{i+1}/100] {name} ({domain})")

        results = search_kotlin(domain)

        record = {
            "name":           name,
            "country":        country,
            "website":        website,
            "domain":         domain,
            "kotlin_found":   len(results) > 0,
            "kotlin_urls":    [r.get("link") for r in results],
            "kotlin_titles":  [r.get("title") for r in results],
            "search_query":   f"kotlin site:{domain}",
        }

        col.update_one(
            {"domain": domain},
            {"$set": record},
            upsert=True
        )

        if results:
            print(f"  ✓ Found {len(results)} Kotlin result(s)")
            for r in results:
                print(f"    - {r.get('title')}")
                print(f"      {r.get('link')}")
        else:
            print(f"  ✗ No Kotlin found")

        time.sleep(1)

    found = col.count_documents({"kotlin_found": True})
    print(f"\nDone! {found} universities mention Kotlin.")
    client.close()


if __name__ == "__main__":
    main()