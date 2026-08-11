"""
Main pipeline script for Kotlin Education Landscape.

This script orchestrates the entire data pipeline:
1. Scrapes data from multiple sources (GitHub, MOOCs, university websites)
2. Normalizes data from multiple sources into unified collection
3. Enriches university findings with AI analysis to extract program details
4. Exports program data to JSON files for the dashboard

Usage:
  python main.py --all                           # Run entire pipeline
  python main.py --scrape                        # Run scraping only
  python main.py --normalize                     # Run normalization only
  python main.py --enrich                        # Run AI enrichment only
  python main.py --export                        # Export to JSON only
  python main.py --scrape --scrape-github        # Scrape GitHub only
  python main.py --enrich --limit 50             # Enrich 50 programs
  python main.py --export --output-dir public/data

Environment variables required:
  MONGODB_URI=...
  DEEPSEEK_API_KEY=... (for enrichment step)
  GITHUB_TOKEN=... (optional, for GitHub scraping)
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))


def run_scrape_github(limit=None):
    """Run GitHub scraper to find Kotlin repositories."""
    print("=" * 60)
    print("STEP 1a: Scraping GitHub for Kotlin repositories...")
    print("=" * 60)
    
    try:
        script_path = Path(__file__).parent.parent / "scraper" / "github" / "find_kotlin_in_github.py"
        cmd = [sys.executable, str(script_path)]
        if limit:
            cmd.extend(["--limit", str(limit)])
        
        result = subprocess.run(
            cmd,
            cwd=Path(__file__).parent.parent,
            capture_output=False,
            text=True
        )
        if result.returncode != 0:
            print(f"❌ GitHub scraping failed with exit code {result.returncode}")
            return False
        print("✅ GitHub scraping completed successfully")
        return True
    except Exception as e:
        print(f"❌ Error running GitHub scraper: {e}")
        return False


def run_scrape_moocs():
    """Run MOOC scraper to find Kotlin courses."""
    print("=" * 60)
    print("STEP 1b: Scraping MOOC platforms for Kotlin courses...")
    print("=" * 60)
    
    try:
        script_path = Path(__file__).parent.parent / "scraper" / "MOOCs" / "find_kotlin_in_moocs.py"
        cmd = [sys.executable, str(script_path)]
        
        result = subprocess.run(
            cmd,
            cwd=Path(__file__).parent.parent,
            capture_output=False,
            text=True
        )
        if result.returncode != 0:
            print(f"❌ MOOC scraping failed with exit code {result.returncode}")
            return False
        print("✅ MOOC scraping completed successfully")
        return True
    except Exception as e:
        print(f"❌ Error running MOOC scraper: {e}")
        return False


def run_scrape_universities(limit=None, retry_statuses=None):
    """Run university scraper to find Kotlin courses."""
    print("=" * 60)
    print("STEP 1c: Scraping university websites for Kotlin courses...")
    print("=" * 60)
    
    try:
        script_path = Path(__file__).parent.parent / "scraper" / "universties" / "search_kotlin_unis_playright.py"
        cmd = [sys.executable, str(script_path)]
        if limit:
            cmd.extend(["--limit", str(limit)])
        if retry_statuses:
            cmd.extend(["--retry-statuses"] + retry_statuses)
        
        result = subprocess.run(
            cmd,
            cwd=Path(__file__).parent.parent,
            capture_output=False,
            text=True
        )
        if result.returncode != 0:
            print(f"❌ University scraping failed with exit code {result.returncode}")
            return False
        print("✅ University scraping completed successfully")
        return True
    except Exception as e:
        print(f"❌ Error running university scraper: {e}")
        return False


def run_scrape(github=False, moocs=False, universities=False, github_limit=None, uni_limit=None, uni_retry=None):
    """Run scraping steps."""
    results = {}
    run_all = not any([github, moocs, universities])
    
    if github or run_all:
        results["github"] = run_scrape_github(limit=github_limit)
    else:
        results["github"] = True  # Skip if not requested
    
    if moocs or run_all:
        results["moocs"] = run_scrape_moocs()
    else:
        results["moocs"] = True  # Skip if not requested
    
    if universities or run_all:
        results["universities"] = run_scrape_universities(limit=uni_limit, retry_statuses=uni_retry)
    else:
        results["universities"] = True  # Skip if not requested
    
    return all(results.values())


def run_normalize():
    """Run the normalizer to create unified courses_unified collection."""
    print("=" * 60)
    print("STEP 2: Normalizing data from multiple sources...")
    print("=" * 60)
    try:
        result = subprocess.run(
            [sys.executable, "normalizer.py"],
            cwd=Path(__file__).parent,
            capture_output=False,
            text=True
        )
        if result.returncode != 0:
            print(f"❌ Normalization failed with exit code {result.returncode}")
            return False
        print("✅ Normalization completed successfully")
        return True
    except Exception as e:
        print(f"❌ Error running normalizer: {e}")
        return False


def run_enrich(limit=None, course_only=False, redo=False, pause=1.0):
    """Run AI enrichment of university findings."""
    print("=" * 60)
    print("STEP 3: Enriching university findings with AI analysis...")
    print("=" * 60)
    
    # Check for DeepSeek API key
    if not os.environ.get("DEEPSEEK_API_KEY"):
        print("❌ DEEPSEEK_API_KEY not set in environment")
        print("   Skipping enrichment step...")
        return False
    
    try:
        cmd = [sys.executable, "enrich_programs.py"]
        if limit:
            cmd.extend(["--limit", str(limit)])
        if course_only:
            cmd.append("--course-only")
        if redo:
            cmd.append("--redo")
        if pause != 1.0:
            cmd.extend(["--pause", str(pause)])
        
        result = subprocess.run(
            cmd,
            cwd=Path(__file__).parent,
            capture_output=False,
            text=True
        )
        if result.returncode != 0:
            print(f"❌ Enrichment failed with exit code {result.returncode}")
            return False
        print("✅ Enrichment completed successfully")
        return True
    except Exception as e:
        print(f"❌ Error running enrichment: {e}")
        return False


def run_export(output_dir="public/data"):
    """Export program data to JSON files for dashboard."""
    print("=" * 60)
    print("STEP 4: Exporting program data to JSON files...")
    print("=" * 60)
    
    try:
        cmd = [sys.executable, "export_programs.py", output_dir]
        result = subprocess.run(
            cmd,
            cwd=Path(__file__).parent,
            capture_output=False,
            text=True
        )
        if result.returncode != 0:
            print(f"❌ Export failed with exit code {result.returncode}")
            return False
        print("✅ Export completed successfully")
        return True
    except Exception as e:
        print(f"❌ Error running export: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Kotlin Education Landscape - Main Pipeline Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py --all                                # Run entire pipeline
  python main.py --scrape                             # Run scraping only
  python main.py --normalize                          # Normalize data only
  python main.py --enrich --limit 50                  # Enrich 50 programs
  python main.py --export --output-dir public/data    # Export to custom directory
  python main.py --scrape --scrape-github --limit 100 # Scrape GitHub with limit
  python main.py --normalize --export                 # Normalize and export only
        """
    )
    
    # Pipeline steps
    parser.add_argument("--all", action="store_true", help="Run entire pipeline (scrape + normalize + enrich + export)")
    parser.add_argument("--scrape", action="store_true", help="Run scraping step")
    parser.add_argument("--normalize", action="store_true", help="Run normalization step")
    parser.add_argument("--enrich", action="store_true", help="Run AI enrichment step")
    parser.add_argument("--export", action="store_true", help="Run export step")
    
    # Scraping options
    parser.add_argument("--scrape-github", action="store_true", help="Scrape GitHub repositories")
    parser.add_argument("--scrape-moocs", action="store_true", help="Scrape MOOC platforms")
    parser.add_argument("--scrape-universities", action="store_true", help="Scrape university websites")
    parser.add_argument("--github-limit", type=int, help="Limit GitHub repositories to scrape")
    parser.add_argument("--uni-limit", type=int, help="Limit university searches")
    parser.add_argument("--uni-retry", nargs="+", help="Retry university searches with specific statuses (e.g., no_match failed empty)")
    
    # Enrichment options
    parser.add_argument("--limit", type=int, help="Limit number of programs to enrich (for enrichment step)")
    parser.add_argument("--course-only", action="store_true", help="Only process findings flagged as courses (for enrichment step)")
    parser.add_argument("--redo", action="store_true", help="Re-analyze already processed links (for enrichment step)")
    parser.add_argument("--pause", type=float, default=1.0, help="Seconds between page requests during enrichment (default: 1.0)")
    
    # Export options
    parser.add_argument("--output-dir", default="public/data", help="Output directory for JSON files (default: public/data)")
    
    args = parser.parse_args()
    
    # Validate that at least one step is specified
    if not any([args.all, args.scrape, args.normalize, args.enrich, args.export]):
        parser.print_help()
        print("\n❌ Error: Please specify at least one pipeline step (--all, --scrape, --normalize, --enrich, or --export)")
        sys.exit(1)
    
    # Check for MongoDB URI
    if not os.environ.get("MONGODB_URI"):
        print("❌ Error: MONGODB_URI environment variable not set")
        sys.exit(1)
    
    # Run pipeline steps
    results = {}
    
    if args.all:
        print("🚀 Running complete pipeline...")
        results["scrape"] = run_scrape(github_limit=args.github_limit, uni_limit=args.uni_limit, uni_retry=args.uni_retry)
        results["normalize"] = run_normalize()
        results["enrich"] = run_enrich(limit=args.limit, course_only=args.course_only, redo=args.redo, pause=args.pause)
        results["export"] = run_export(output_dir=args.output_dir)
    else:
        if args.scrape:
            scrape_success = run_scrape(
                github=args.scrape_github, 
                moocs=args.scrape_moocs, 
                universities=args.scrape_universities,
                github_limit=args.github_limit,
                uni_limit=args.uni_limit,
                uni_retry=args.uni_retry
            )
            results["scrape"] = scrape_success
        if args.normalize:
            results["normalize"] = run_normalize()
        if args.enrich:
            results["enrich"] = run_enrich(limit=args.limit, course_only=args.course_only, redo=args.redo, pause=args.pause)
        if args.export:
            results["export"] = run_export(output_dir=args.output_dir)
    
    # Summary
    print("\n" + "=" * 60)
    print("PIPELINE SUMMARY")
    print("=" * 60)
    for step, success in results.items():
        status = "✅" if success else "❌"
        label = "skipped" if success and step not in ["scrape", "normalize", "enrich", "export"] else step
        print(f"{status} {label}")
    
    # Filter out skipped steps for success check
    actual_results = {k: v for k, v in results.items() if k in ["scrape", "normalize", "enrich", "export"]}
    all_success = all(actual_results.values()) if actual_results else True
    
    if all_success:
        print("\n🎉 Pipeline completed successfully!")
    else:
        print("\n⚠️  Pipeline completed with some failures")
        sys.exit(1)


if __name__ == "__main__":
    main()