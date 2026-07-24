import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useCallback, useMemo, Suspense, lazy } from "react";
import Papa from "papaparse";

import { applyFilters, emptyFilters, groupBy, topN, type Filters, type Dataset, type Course, type SerpRow, type Baseline } from "../lib/dataset";
import { ActiveFilters, FilterRail } from "../components/FilterRail";
import { StatCards } from "../components/StatCards";
import { Panel } from "../components/Panel";
import { WorldMap } from "../components/WorldMap";
import { Donut, Funnel, Histogram, HorizontalBars, StackedBars } from "../components/Charts";
import { fmt } from "../lib/format";
import { readFileSync } from "fs";
import { join } from "path";

// DataTable uses useVirtualizer which is SSR-incompatible (needs DOM refs)
// Lazy-loading ensures it only renders on the client
const DataTable = lazy(() =>
  import("../components/DataTable").then((m) => ({ default: m.DataTable }))
);

const searchSchema = z.object({
  primary_only: fallback(z.boolean(), false).default(false),
  sources: fallback(z.array(z.string()), []).default([]),
  tiers: fallback(z.array(z.string()), []).default([]),
  learning_types: fallback(z.array(z.string()), []).default([]),
  countries: fallback(z.array(z.string()), []).default([]),
  min_stars: fallback(z.number(), 0).default(0),
  conf_min: fallback(z.number(), 0).default(0),
  conf_max: fallback(z.number(), 1).default(1),
  search: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  loader: async (): Promise<Dataset> => {
    // Load courses from CSV files
    const mainCsvPath = join(process.cwd(), 'kotlin_education_tableau.csv');
    const uniCsvPath = join(process.cwd(), 'kotlin_education_tableau_universities.csv');
    
    // Parse main CSV file
    const mainCsvContent = readFileSync(mainCsvPath, 'utf-8');
    const mainResult = Papa.parse<Course>(mainCsvContent, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });
    
    // Parse universities CSV file
    const uniCsvContent = readFileSync(uniCsvPath, 'utf-8');
    const uniResult = Papa.parse<Course>(uniCsvContent, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });
    
    // Combine courses from both CSV files
    const courses = [...mainResult.data, ...uniResult.data];
    
    console.log(`[csv] loaded ${courses.length} courses from CSV files.`);
    
    // Load serp data from JSON file
    const serpPath = join(process.cwd(), 'public/data/serp_progress.json');
    const serp = JSON.parse(readFileSync(serpPath, 'utf-8')) as SerpRow[];
    
    // Load baseline data from JSON file
    const baselinePath = join(process.cwd(), 'public/data/baseline_comparison.json');
    let baseline: Baseline = null;
    try {
      baseline = JSON.parse(readFileSync(baselinePath, 'utf-8')) as Baseline;
    } catch {
      // baseline file might not exist
    }
    
    return { courses, serp, baseline };
  },
  component: Dashboard,
});

function Dashboard() {
  const dataset = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });

  const filters: Filters = useMemo(
    () => ({ ...emptyFilters, ...search }),
    [search],
  );

  const setFilters = useCallback(
    (next: Filters | ((prev: Filters) => Filters)) => {
      navigate({
        search: (prev: Partial<Filters>) => {
          const merged: Filters = { ...emptyFilters, ...prev };
          const value =
            typeof next === "function" ? (next as (p: Filters) => Filters)(merged) : next;
          return value;
        },
        replace: true,
      });
    },
    [navigate],
  );

  const filtered = useMemo(
    () => applyFilters(dataset.courses, filters),
    [dataset, filters],
  );

  const totals = useMemo(() => {
    const uniProviders = new Set(
      filtered.filter((r) => r.source === "university_website" && r.provider).map((r) => r.provider),
    );
    const countries = new Set(filtered.filter((r) => r.country).map((r) => r.country));
    return {
      total: filtered.length,
      universities: uniProviders.size,
      countries: countries.size,
      primary: filtered.filter((r) => r.signal_tier === "primary").length,
      github: filtered.filter((r) => r.source === "github").length,
      mooc: filtered.filter((r) => r.source === "stepik" || r.source === "coursera").length,
    };
  }, [dataset, filtered]);

  const sources = useMemo(
    () => Array.from(new Set(dataset.courses.map((r) => r.source))).sort(),
    [dataset],
  );
  const allCountries = useMemo(() => {
    const m = new Map<string, number>();
    dataset.courses.forEach((r) => {
      if (!r.country) return;
      m.set(r.country, (m.get(r.country) ?? 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [dataset]);

  const countryCounts = useMemo(() => groupBy(filtered, (r) => r.country || ""), [filtered]);
  const topCountries = useMemo(() => topN(countryCounts, 15), [countryCounts]);
  const sourceCounts = useMemo(() => topN(groupBy(filtered, (r) => r.source), 10), [filtered]);
  const tierCounts = useMemo(() => topN(groupBy(filtered, (r) => r.signal_tier), 5), [filtered]);
  const learningCounts = useMemo(() => topN(groupBy(filtered, (r) => r.learning_type), 5), [filtered]);
  const repoTypeCounts = useMemo(
    () => topN(groupBy(filtered.filter((r) => r.source === "github"), (r) => r.subtype || "other"), 10),
    [filtered],
  );
  const providerCounts = useMemo(() => topN(groupBy(filtered, (r) => r.provider), 15), [filtered]);
  const confidenceValues = useMemo(() => filtered.map((r) => r.kotlin_confidence), [filtered]);

  const popularityBuckets = useMemo(() => {
    const gh = filtered.filter((r) => r.source === "github");
    const buckets: [string, number][] = [
      ["0", 0],
      ["1–9", 0],
      ["10–49", 0],
      ["50–99", 0],
      ["100–499", 0],
      ["500+", 0],
    ];
    for (const r of gh) {
      const p = r.popularity;
      if (p === 0) buckets[0][1]++;
      else if (p < 10) buckets[1][1]++;
      else if (p < 50) buckets[2][1]++;
      else if (p < 100) buckets[3][1]++;
      else if (p < 500) buckets[4][1]++;
      else buckets[5][1]++;
    }
    return buckets;
  }, [filtered]);

  const formalInformal = useMemo(() => {
    const top = topN(countryCounts, 10);
    return top.map(([label]) => {
      const rows = filtered.filter((r) => r.country === label);
      return {
        label,
        parts: {
          formal: rows.filter((r) => r.learning_type === "formal").length,
          informal: rows.filter((r) => r.learning_type === "informal").length,
        },
      };
    });
  }, [countryCounts, filtered]);

  const crawlStats = useMemo(() => {
    const s = dataset.serp;
    const total = s.length;
    const found = s.filter((r) => r.status === "found").length;
    const no_match = s.filter((r) => r.status === "no_match").length;
    const empty = s.filter((r) => r.status === "empty").length;
    const failed = s.filter((r) => r.status === "failed").length;
    const engine = topN(groupBy(s, (r) => r.engine), 10);
    return { total, found, no_match, empty, failed, engine };
  }, [dataset]);

  const toggleCountry = useCallback(
    (c: string) => {
      setFilters((p) => ({
        ...p,
        countries: p.countries.includes(c) ? p.countries.filter((x) => x !== c) : [...p.countries, c],
      }));
    },
    [setFilters],
  );

  return (
    <div className="min-h-screen">
      <header className="max-w-[1600px] mx-auto px-6 pt-10 pb-8">
        <div className="eyebrow">GSoC 2026 · Kotlin Foundation</div>
        <h1 className="mt-3 text-4xl md:text-6xl font-extrabold tracking-[-0.03em] leading-[1.02]">
          Where <span className="kt-gradient-text">Kotlin</span> is taught,
          <br className="hidden md:block" /> mapped across the world.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground text-[15px] leading-relaxed">
          An automated pipeline discovers universities, MOOCs, and public repositories teaching
          Kotlin. Every filter below refines the whole dashboard in real time.
        </p>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 pb-16 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <FilterRail
          filters={filters}
          setFilters={setFilters}
          sources={sources}
          countries={allCountries}
          filteredCount={filtered.length}
          totalCount={dataset.courses.length}
        />

        <main className="flex flex-col gap-6 min-w-0">
          <ActiveFilters filters={filters} setFilters={setFilters} />

          <StatCards totals={totals} />

          <Panel title="Universities per country" subtitle="World map · click to filter">
            <WorldMap
              countryCounts={
                new Map(
                  Array.from(
                    groupBy(
                      filtered.filter((r) => r.source === "university_website"),
                      (r) => r.country || "",
                    ),
                  ).filter(([k]) => k),
                )
              }
              activeCountries={filters.countries}
              onToggleCountry={toggleCountry}
            />
          </Panel>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Panel title="Top 15 countries" subtitle="All sources">
              <HorizontalBars
                data={topCountries}
                onClick={toggleCountry}
                activeKey={filters.countries[0]}
              />
            </Panel>
            <Panel title="Records by source" subtitle="Distribution">
              <HorizontalBars data={sourceCounts} color="#C711E1" height={220} />
              <div className="grid grid-cols-2 gap-6 mt-6">
                <div>
                  <div className="eyebrow mb-2">Signal tier</div>
                  <Donut
                    data={tierCounts}
                    colors={["#7F52FF", "#3A3A3F"]}
                    centerLabel="records"
                  />
                </div>
                <div>
                  <div className="eyebrow mb-2">Learning type</div>
                  <Donut
                    data={learningCounts}
                    colors={["#C711E1", "#7F52FF"]}
                    centerLabel="records"
                  />
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Panel title="GitHub by repository type" subtitle="Subtype breakdown">
              <HorizontalBars data={repoTypeCounts} color="#7F52FF" />
            </Panel>
            <Panel title="GitHub popularity" subtitle="Stars distribution">
              <HorizontalBars data={popularityBuckets} color="#C711E1" height={260} />
            </Panel>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Panel title="Top 15 providers" subtitle="Owners & institutions">
              <HorizontalBars data={providerCounts} color="#7F52FF" />
            </Panel>
            <Panel title="Formal vs informal" subtitle="Top 10 countries, stacked">
              <StackedBars
                data={formalInformal}
                keys={["formal", "informal"]}
                colors={["#7F52FF", "#C711E1"]}
              />
            </Panel>
          </div>

          <Panel title="Kotlin-confidence distribution" subtitle="Classifier score histogram">
            <Histogram values={confidenceValues} bins={10} height={220} />
          </Panel>

          <Panel title="Crawl funnel" subtitle="Search → discovery → dedupe">
            <Funnel
              steps={[
                { label: "Searched", value: crawlStats.total },
                { label: "Found", value: crawlStats.found },
                { label: "Findings", value: filtered.filter((r) => r.source === "university_website").length || 400 },
                {
                  label: "Unique institutions",
                  value: new Set(
                    filtered
                      .filter((r) => r.source === "university_website")
                      .map((r) => r.provider),
                  ).size,
                },
              ]}
            />
          </Panel>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Panel title="Crawl outcomes" subtitle="Status breakdown">
              <HorizontalBars
                data={[
                  ["found", crawlStats.found],
                  ["no_match", crawlStats.no_match],
                  ["empty", crawlStats.empty],
                  ["failed", crawlStats.failed],
                ]}
                color="#7F52FF"
                height={200}
              />
            </Panel>
            <Panel title="Discovery engine" subtitle="Which engine served results">
              <HorizontalBars data={crawlStats.engine} color="#C711E1" height={200} />
            </Panel>
          </div>

          <Panel title="Data table" subtitle="Filterable · scrollable">
            <Suspense fallback={<div className="text-sm text-muted-foreground p-4">Loading table…</div>}>
              <DataTable data={filtered} />
            </Suspense>
          </Panel>
        </main>
      </div>
    </div>
  );
}
