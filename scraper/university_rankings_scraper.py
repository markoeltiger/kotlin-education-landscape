=

import logging
import os
import re
import time

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config — all secrets from .env, never hardcoded
# ---------------------------------------------------------------------------
load_dotenv()

MONGO_URI   = os.getenv("MONGO_URI", "mongodb://localhost:27017")
PROXY_USER  = os.getenv("PROXY_USER", "")
PROXY_PASS  = os.getenv("PROXY_PASS", "")
PROXY_HOST  = os.getenv("PROXY_HOST", "geo.iproyal.com")
PROXY_PORT  = os.getenv("PROXY_PORT", "12321")

PROXY_URL = f"http://{PROXY_USER}:{PROXY_PASS}@{PROXY_HOST}:{PROXY_PORT}"

PROXIES = {
    "http":  PROXY_URL,
    "https": PROXY_URL,
} if PROXY_USER and PROXY_PASS else {}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

# ---------------------------------------------------------------------------
# Region mapping
# ---------------------------------------------------------------------------
COUNTRY_TO_REGION = {
    "United States": "North America", "Canada": "North America", "Mexico": "North America",
    "United Kingdom": "Europe", "Germany": "Europe", "France": "Europe",
    "Netherlands": "Europe", "Sweden": "Europe", "Switzerland": "Europe",
    "Denmark": "Europe", "Finland": "Europe", "Norway": "Europe",
    "Belgium": "Europe", "Italy": "Europe", "Spain": "Europe",
    "Poland": "Europe", "Russia": "Europe", "Ireland": "Europe",
    "Portugal": "Europe", "Czech Republic": "Europe", "Austria": "Europe",
    "China": "Asia-Pacific", "Japan": "Asia-Pacific", "South Korea": "Asia-Pacific",
    "Australia": "Asia-Pacific", "Singapore": "Asia-Pacific", "India": "Asia-Pacific",
    "Hong Kong SAR": "Asia-Pacific", "Taiwan": "Asia-Pacific", "New Zealand": "Asia-Pacific",
    "Malaysia": "Asia-Pacific", "Indonesia": "Asia-Pacific", "Thailand": "Asia-Pacific",
    "Brazil": "Latin America", "Argentina": "Latin America", "Chile": "Latin America",
    "Colombia": "Latin America", "Peru": "Latin America",
    "Saudi Arabia": "Middle East", "United Arab Emirates": "Middle East",
    "Israel": "Middle East", "Turkey": "Middle East", "Egypt": "Middle East",
    "Qatar": "Middle East", "Jordan": "Middle East", "Lebanon": "Middle East",
    "South Africa": "Africa", "Nigeria": "Africa", "Kenya": "Africa",
    "Ghana": "Africa", "Ethiopia": "Africa",
}

ISO2_TO_COUNTRY = {
    "us": "United States", "gb": "United Kingdom", "cn": "China",
    "de": "Germany", "fr": "France", "au": "Australia", "ca": "Canada",
    "jp": "Japan", "kr": "South Korea", "sg": "Singapore", "in": "India",
    "hk": "Hong Kong SAR", "tw": "Taiwan", "ch": "Switzerland", "se": "Sweden",
    "nl": "Netherlands", "dk": "Denmark", "fi": "Finland", "no": "Norway",
    "be": "Belgium", "it": "Italy", "es": "Spain", "pl": "Poland",
    "ru": "Russia", "ie": "Ireland", "nz": "New Zealand", "my": "Malaysia",
    "id": "Indonesia", "br": "Brazil", "ar": "Argentina", "cl": "Chile",
    "co": "Colombia", "pe": "Peru", "sa": "Saudi Arabia", "ae": "United Arab Emirates",
    "il": "Israel", "tr": "Turkey", "eg": "Egypt", "qa": "Qatar",
    "jo": "Jordan", "lb": "Lebanon", "za": "South Africa", "ng": "Nigeria",
    "ke": "Kenya", "gh": "Ghana", "et": "Ethiopia", "mx": "Mexico",
    "pt": "Portugal", "cz": "Czech Republic", "at": "Austria", "th": "Thailand",
}


def get_region(country: str) -> str:
    return COUNTRY_TO_REGION.get(country, "Other")


def make_record(name, country="", website="", rank_qs="", rank_the="", rank_arwu="", sources=None):
    return {
        "name":       name.strip(),
        "country":    country.strip(),
        "region":     get_region(country.strip()),
        "website":    website.strip(),
        "rank_qs":    str(rank_qs).strip(),
        "rank_the":   str(rank_the).strip(),
        "rank_arwu":  str(rank_arwu).strip(),
        "sources":    sources or [],
    }


# ===========================================================================
# SOURCE 1 — QS (no proxy needed — works fine without it)
# ===========================================================================
def scrape_qs() -> list:
    logger.info("=== Scraping QS Rankings ===")
    records = []

    try:
        resp = requests.get(
            "https://www.topuniversities.com/rankings/endpoint",
            params={
                "nid": "3816",
                "page": "0",
                "items_per_page": "500",
                "tab": "indicators",
                "region": "", "countries": "", "stars": "", "search": "",
            },
            headers={
                **HEADERS,
                "Accept": "application/json",
                "Referer": "https://www.topuniversities.com/university-rankings/university-subject-rankings/2024/computer-science-information-systems",
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

        for node in data.get("score_nodes", []):
            name = (node.get("title") or "").strip()
            if not name:
                continue
            records.append(make_record(
                name=name,
                country=(node.get("country") or "").strip(),
                website=(node.get("url") or "").strip(),
                rank_qs=str(node.get("rank_display") or ""),
                sources=["QS"],
            ))

        logger.info("QS: collected %d records", len(records))

    except Exception as e:
        logger.error("QS failed: %s", e)

    time.sleep(2)
    return records


# ===========================================================================
# SOURCE 2 — THE via static JSON (proxy used, no Selenium needed)
# ===========================================================================

# THE hosts static JSON files for each ranking — much more reliable than scraping the page
THE_JSON_URLS = [
    # Try multiple years/filenames — THE changes the hash part occasionally
    "https://www.timeshighereducation.com/sites/default/files/the_data_rankings/computer_science_2024_0__e2cbe4e8d05a3105b4f9b30f31b54cd1.json",
    "https://www.timeshighereducation.com/sites/default/files/the_data_rankings/computer_science_2023_0__e2cbe4e8d05a3105b4f9b30f31b54cd1.json",
]

def scrape_the() -> list:
    logger.info("=== Scraping THE Rankings ===")
    records = []

    for url in THE_JSON_URLS:
        try:
            logger.info("THE: trying %s", url)
            resp = requests.get(
                url,
                headers={**HEADERS, "Accept": "application/json"},
                proxies=PROXIES,
                timeout=30,
            )
            if resp.status_code != 200:
                logger.warning("THE: HTTP %d for %s", resp.status_code, url)
                continue

            data = resp.json()
            entries = data.get("data", [])
            logger.info("THE: got %d entries", len(entries))

            for item in entries:
                name = (item.get("name") or "").strip()
                if not name:
                    continue
                records.append(make_record(
                    name=name,
                    country=(item.get("location") or "").strip(),
                    website=(item.get("url") or "").strip(),
                    rank_the=str(item.get("rank") or ""),
                    sources=["THE"],
                ))

            if records:
                logger.info("THE: collected %d records", len(records))
                break  # success — no need to try next URL

        except Exception as e:
            logger.warning("THE: failed on %s — %s", url, e)
            continue

    # Fallback: scrape the HTML rankings page with proxy if JSON failed
    if not records:
        logger.info("THE: JSON failed — trying HTML fallback with proxy")
        records = scrape_the_html_fallback()

    time.sleep(2)
    return records


def scrape_the_html_fallback() -> list:
    """Scrape THE rankings page HTML as last resort."""
    records = []
    try:
        resp = requests.get(
            "https://www.timeshighereducation.com/world-university-rankings/2024/subject-ranking/computer-science",
            headers=HEADERS,
            proxies=PROXIES,
            timeout=30,
        )
        soup = BeautifulSoup(resp.text, "html.parser")

        # THE renders a <table> with class "ranking-list-wrap" or similar
        rows = soup.select("table tr")
        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 2:
                continue
            rank = cells[0].get_text(strip=True)
            name_el = row.find(class_=re.compile(r"name|institution|title", re.I)) or cells[1]
            name = name_el.get_text(strip=True)
            country_el = row.find(class_=re.compile(r"country|location", re.I))
            country = country_el.get_text(strip=True) if country_el else ""
            if name and len(name) > 3:
                records.append(make_record(name=name, country=country, rank_the=rank, sources=["THE"]))

        logger.info("THE HTML fallback: got %d records", len(records))
    except Exception as e:
        logger.error("THE HTML fallback failed: %s", e)

    return records


# ===========================================================================
# SOURCE 3 — ARWU via HTML table (proxy used, no Selenium, no payload parsing)
# ===========================================================================
ARWU_URLS = [
    "https://www.shanghairanking.com/rankings/gras/2024/RS0210",
    "https://www.shanghairanking.com/rankings/gras/2023/RS0210",
]

def scrape_arwu() -> list:
    logger.info("=== Scraping ARWU Rankings ===")
    records = []

    for url in ARWU_URLS:
        try:
            logger.info("ARWU: trying %s", url)
            resp = requests.get(
                url,
                headers=HEADERS,
                proxies=PROXIES,
                timeout=30,
            )
            if resp.status_code != 200:
                logger.warning("ARWU: HTTP %d", resp.status_code)
                continue

            soup = BeautifulSoup(resp.text, "html.parser")

            # ARWU renders a table with class "rk-table" or similar
            rows = soup.select("table tbody tr")
            logger.info("ARWU: found %d table rows", len(rows))

            for row in rows:
                try:
                    cells = row.find_all("td")
                    if len(cells) < 2:
                        continue

                    rank = cells[0].get_text(strip=True)

                    # University name is usually in a link or dedicated cell
                    name_el = (
                        row.find("a")
                        or row.find(class_=re.compile(r"name|university|institution", re.I))
                        or cells[1]
                    )
                    name = name_el.get_text(strip=True)

                    # Country — look for flag img alt text or country cell
                    country = ""
                    flag = row.find("img")
                    if flag:
                        country_code = (flag.get("alt") or flag.get("title") or "").lower().strip()
                        country = ISO2_TO_COUNTRY.get(country_code, country_code)

                    if not country and len(cells) > 2:
                        country = cells[2].get_text(strip=True)

                    if name and len(name) > 3:
                        records.append(make_record(
                            name=name,
                            country=country,
                            rank_arwu=rank,
                            sources=["ARWU"],
                        ))
                except Exception as e:
                    logger.warning("ARWU: row parse error — %s", e)

            if records:
                logger.info("ARWU: collected %d records", len(records))
                break

        except Exception as e:
            logger.warning("ARWU: failed on %s — %s", url, e)
            continue

    if not records:
        logger.warning("ARWU: all URLs failed — skipping")

    time.sleep(2)
    return records


# ===========================================================================
# Merge & Deduplicate
# ===========================================================================
def merge_records(all_records: list) -> list:
    logger.info("Merging %d raw records...", len(all_records))
    merged = {}

    for rec in all_records:
        key = rec["name"].lower().strip()

        if key not in merged:
            merged[key] = rec.copy()
        else:
            existing = merged[key]

            # Add ranks from this source if missing
            for rank_field in ("rank_qs", "rank_the", "rank_arwu"):
                if not existing.get(rank_field) and rec.get(rank_field):
                    existing[rank_field] = rec[rank_field]

            # Merge sources list
            existing["sources"] = sorted(set(existing.get("sources", [])) | set(rec.get("sources", [])))

            # Fill in missing country / website
            if not existing.get("country") and rec.get("country"):
                existing["country"] = rec["country"]
                existing["region"]  = rec["region"]
            if not existing.get("website") and rec.get("website"):
                existing["website"] = rec["website"]

    result = list(merged.values())
    logger.info("After deduplication: %d unique universities", len(result))
    return result


# ===========================================================================
# MongoDB Upsert
# ===========================================================================
def save_to_mongodb(records: list) -> tuple:
    logger.info("Connecting to MongoDB...")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10_000)
    db     = client["kotlin_edu"]
    col    = db["universities"]

    # Case-insensitive unique index on name
    col.create_index(
        [("name", 1)],
        unique=True,
        collation={"locale": "en", "strength": 2},
    )

    ops = [
        UpdateOne(
            {"name": {"$regex": f"^{re.escape(r['name'])}$", "$options": "i"}},
            {"$set": r},
            upsert=True,
        )
        for r in records
    ]

    inserted = modified = 0
    try:
        result   = col.bulk_write(ops, ordered=False)
        inserted = result.upserted_count
        modified = result.modified_count
        logger.info("MongoDB: %d inserted, %d updated", inserted, modified)
    except BulkWriteError as e:
        logger.error("MongoDB BulkWriteError: %s", e.details)
        inserted = e.details.get("nUpserted", 0)
        modified = e.details.get("nModified", 0)
    finally:
        client.close()

    return inserted, modified


# ===========================================================================
# Summary
# ===========================================================================
def print_summary(qs, the, arwu, merged, inserted, modified):
    print("\n" + "=" * 55)
    print("  UNIVERSITY RANKINGS SCRAPER — SUMMARY")
    print("=" * 55)
    print(f"\n  Records per source:")
    print(f"    QS   : {len(qs)}")
    print(f"    THE  : {len(the)}")
    print(f"    ARWU : {len(arwu)}")
    print(f"    Raw total       : {len(qs) + len(the) + len(arwu)}")
    print(f"    After dedup     : {len(merged)}")
    print(f"\n  MongoDB:")
    print(f"    Inserted (new)  : {inserted}")
    print(f"    Updated         : {modified}")

    from collections import Counter
    counts = Counter(r["region"] for r in merged)
    print(f"\n  Regional distribution:")
    for region, count in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"    {region:<22}: {count}")

    print(f"\n  Source coverage:")
    for src in ("QS", "THE", "ARWU"):
        n = sum(1 for r in merged if src in r.get("sources", []))
        print(f"    {src}: {n}")

    multi     = [r for r in merged if len(r.get("sources", [])) > 1]
    all_three = [r for r in merged if len(r.get("sources", [])) == 3]
    print(f"\n  In 2+ rankings  : {len(multi)}")
    print(f"  In all 3        : {len(all_three)}")
    print("=" * 55 + "\n")


# ===========================================================================
# Main
# ===========================================================================
def main():
    logger.info("Starting University Rankings Scraper")

    qs_records   = scrape_qs()
    the_records  = scrape_the()
    arwu_records = scrape_arwu()

    all_raw = qs_records + the_records + arwu_records

    if not all_raw:
        logger.error("No records collected from any source. Exiting.")
        return

    merged = merge_records(all_raw)
    inserted, modified = save_to_mongodb(merged)
    print_summary(qs_records, the_records, arwu_records, merged, inserted, modified)
    logger.info("Done.")


if __name__ == "__main__":
    main()