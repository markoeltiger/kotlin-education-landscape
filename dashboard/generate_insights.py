"""
Generate AI insights for the Kotlin Education dashboard using the DeepSeek API.

Runs on YOUR machine at export time — your DeepSeek key stays in .env and is NEVER
shipped to the frontend. It reads the dashboard's data files, computes the same
aggregates the charts show, asks DeepSeek to write an insight for each chart plus
one overall summary, and writes insights.json for the dashboard to display.

Setup:
  pip install requests python-dotenv
  # .env:  DEEPSEEK_API_KEY=sk-...

Run (after export_for_dashboard.py):
  python generate_insights.py public/data
"""
import json
import os
import sys
from collections import Counter
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
MODEL = "deepseek-chat"


def call_deepseek(key, system, user, max_tokens=220):
    try:
        r = requests.post(
            DEEPSEEK_URL,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.4,
                "max_tokens": max_tokens,
            },
            timeout=60)
        if r.status_code != 200:
            print(f"  deepseek HTTP {r.status_code}: {r.text[:160]}")
            return None
        return r.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"  deepseek error: {type(e).__name__}: {e}")
        return None


def count_by(rows, key, where=None, top=None):
    c = Counter()
    for r in rows:
        if where and not where(r):
            continue
        v = r.get(key)
        if v:
            c[v] += 1
    items = c.most_common(top) if top else c.most_common()
    return items


def main():
    outdir = Path(sys.argv[1] if len(sys.argv) > 1 else "public/data")
    key = os.environ.get("DEEPSEEK_API_KEY")
    if not key:
        sys.exit("DEEPSEEK_API_KEY not set in .env")

    courses = json.loads((outdir / "courses_unified.json").read_text(encoding="utf-8"))
    baseline = None
    bp = outdir / "baseline_comparison.json"
    if bp.exists():
        baseline = json.loads(bp.read_text(encoding="utf-8"))

    uni = [c for c in courses if c.get("source") == "university_website"]

    # ---- compute the same aggregates the charts display ----
    facts = {
        "total_records": len(courses),
        "by_source": dict(count_by(courses, "source")),
        "signal_tier": dict(count_by(courses, "signal_tier")),
        "learning_type": dict(count_by(courses, "learning_type")),
        "top_countries": count_by(uni, "country", top=12),
        "unique_universities": len({c["provider"] for c in uni if c.get("provider")}),
        "countries_count": len({c["country"] for c in uni if c.get("country")}),
        "github_types": dict(count_by(courses, "subtype", where=lambda r: r.get("source") == "github")),
        "top_providers": count_by(courses, "provider", top=10),
        "baseline": baseline,
    }

    system = ("You are a data analyst for the Kotlin Foundation. Write concise, "
              "factual insights about where Kotlin is taught worldwide, based ONLY on "
              "the numbers given. No fluff, no restating the raw numbers verbatim — "
              "surface what's interesting or notable. 2-3 sentences max per insight. "
              "This data is from an automated discovery pipeline, so frame findings as "
              "'discovered' rather than exhaustive.")

    insights = {}

    # ---- overall summary ----
    print("generating overall summary...")
    overall = call_deepseek(key, system,
        f"Write a 3-4 sentence executive summary of this Kotlin education dataset:\n"
        f"{json.dumps(facts, ensure_ascii=False)[:2500]}", max_tokens=300)
    insights["overall"] = overall

    # ---- per-chart insights ----
    charts = {
        "map": ("universities discovered teaching Kotlin, by country",
                {"top_countries": facts["top_countries"],
                 "total_universities": facts["unique_universities"],
                 "countries": facts["countries_count"]}),
        "sources": ("breakdown of Kotlin educational resources by source",
                    {"by_source": facts["by_source"]}),
        "signal_tier": ("primary (course-like) vs secondary (supporting) content",
                        {"signal_tier": facts["signal_tier"]}),
        "learning_type": ("formal (institutional) vs informal (community) learning",
                          {"learning_type": facts["learning_type"]}),
        "github_types": ("types of Kotlin educational repositories on GitHub",
                         {"github_types": facts["github_types"]}),
        "top_countries": ("countries with the most Kotlin university teaching",
                          {"top_countries": facts["top_countries"]}),
        "top_providers": ("leading providers of Kotlin education",
                          {"top_providers": facts["top_providers"]}),
    }
    if baseline:
        charts["baseline"] = (
            "comparison of the pipeline's discoveries vs the official kotlinlang.org list",
            {"baseline": baseline})

    for cid, (desc, data) in charts.items():
        print(f"generating insight: {cid}...")
        txt = call_deepseek(key, system,
            f"Chart: {desc}.\nData: {json.dumps(data, ensure_ascii=False)[:1500]}\n"
            f"Write ONE 2-3 sentence insight highlighting what's most notable.")
        insights[cid] = txt

    insights["_meta"] = {"model": MODEL, "generated": True}

    out = outdir / "insights.json"
    out.write_text(json.dumps(insights, ensure_ascii=False, indent=1), encoding="utf-8")
    ok = sum(1 for v in insights.values() if isinstance(v, str) and v)
    print(f"\nwrote {out}  ({ok} insights generated)")
    if insights.get("overall"):
        print(f"\noverall summary preview:\n  {insights['overall'][:200]}...")


if __name__ == "__main__":
    main()