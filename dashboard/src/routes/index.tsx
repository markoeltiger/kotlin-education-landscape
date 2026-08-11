import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useCallback, useMemo, Suspense, lazy, useRef, useState } from "react";

import { applyFilters, emptyFilters, groupBy, topN, type Filters, type Dataset, type Course, type SerpRow, type Baseline, type Insights } from "../lib/dataset";
import { ActiveFilters, FilterRail } from "../components/FilterRail";
import { StatCards } from "../components/StatCards";
import { Panel, Empty } from "../components/Panel";
import { WorldMap } from "../components/WorldMap";
import { Donut, Funnel, Histogram, HorizontalBars, StackedBars, GitHubRepoBars, MoocCourseTable } from "../components/Charts";
import { InsightSummary } from "../components/InsightSummary";
import { ChartInsight } from "../components/ChartInsight";
import { fmt } from "../lib/format";
import { readFileSync } from "fs";
import { join } from "path";

// Filter constants
const TIERS = ["primary", "secondary"];
const LEARNING = ["formal", "non-formal"];

// DataTable uses useVirtualizer which is SSR-incompatible (needs DOM refs).
// Lazy-loading ensures it only renders on the client side.
const DataTable = lazy(() =>
  import("../components/DataTable").then((m) => ({ default: m.DataTable }))
);

export const Route = createFileRoute("/")({
  // ── Server-side data loader ────────────────────────────────────────────────
  // Reads courses_unified.json and serp_progress.json at request time on the server
  // so no additional client fetches are needed; the parsed data is serialised into the HTML payload.
  loader: async (): Promise<Dataset> => {
    // Load courses from unified JSON file
    const coursesPath = join(process.cwd(), 'public/data/courses_unified.json');
    const courses = JSON.parse(readFileSync(coursesPath, 'utf-8')) as Course[];
    
    console.log(`[json] loaded ${courses.length} courses from courses_unified.json.`);
    
    // SERP progress JSON: tracks which university queries were searched,
    // which returned results, and what their pipeline status was.
    const serpPath = join(process.cwd(), 'public/data/serp_progress.json');
    const serp = JSON.parse(readFileSync(serpPath, 'utf-8')) as SerpRow[];
    
    // Baseline comparison JSON: optional; compares this run against a manual
    // reference set to measure rediscovery and net-new coverage.
    const baselinePath = join(process.cwd(), 'public/data/baseline_comparison.json');
    let baseline: Baseline = null;
    try {
      baseline = JSON.parse(readFileSync(baselinePath, 'utf-8')) as Baseline;
    } catch {
      // baseline file might not exist yet — this is fine
    }
    
    // AI-generated insights JSON: optional; contains precomputed insights
    // about the dataset. If it fails to load, the dashboard works without insights.
    let insights: Insights = null;
    try {
      const insightsPath = join(process.cwd(), 'public/data/insights.json');
      insights = JSON.parse(readFileSync(insightsPath, 'utf-8')) as Insights;
      console.log('[insights] loaded insights.json');
    } catch {
      // insights file might not exist or be invalid — this is fine
      console.log('[insights] failed to load insights.json, continuing without insights');
    }
    
    // Add meta timestamp if not present in the data
    const meta = { generated_at: new Date().toISOString() };
    
    return { courses, serp, baseline, insights, meta };
  },
  component: Dashboard,
});

// ─── Section divider ──────────────────────────────────────────────────────────
function SectionDivider({ label, description }: { label: string; description?: string }) {
  return (
    <div className="flex items-center gap-4 pt-2 sm:pt-4">
      <div className="flex-1 h-px bg-line" />
      <div className="shrink-0 text-center">
        <div className="eyebrow text-[10px] sm:text-[12px] tracking-[0.2em] text-muted-foreground">{label}</div>
        {description && (
          <p className="mt-0.5 mono text-[10px] text-muted-foreground max-w-xs">{description}</p>
        )}
      </div>
      <div className="flex-1 h-px bg-line" />
    </div>
  );
}

// ─── Dataset timestamp ────────────────────────────────────────────────────────
function DatasetTimestamp({ generatedAt }: { generatedAt: string }) {
  let display = "—";
  try {
    const d = new Date(generatedAt);
    display = d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    // ignore
  }
  return (
    <div className="mono text-[10px] text-muted-foreground flex items-center gap-1.5">
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: "var(--kt-purple)", opacity: 0.7 }}
      />
      Dataset updated: {display}
    </div>
  );
}

function Dashboard() {
  const dataset = Route.useLoaderData();
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  // ── Derived datasets ───────────────────────────────────────────────────────
  // `filtered` is the full dataset with all URL filters applied; every chart and
  // table in the dashboard derives its data from this array.
  const filtered = useMemo(
    () => applyFilters(dataset.courses, filters),
    [dataset, filters],
  );

  // ── Stat-card totals ───────────────────────────────────────────────────────
  // Aggregate counts shown in the top row of large-number cards.
  const totals = useMemo(() => {
    // Unique university providers (de-duplicated by provider name)
    const uniProviders = new Set(
      filtered.filter((r) => r.source === "university_website" && r.provider).map((r) => r.provider),
    );
    const countries = new Set(filtered.filter((r) => r.country).map((r) => r.country));
    return {
      total: filtered.length,
      universities: uniProviders.size,
      countries: countries.size,
      // Signal tier split — used to render the PRIMARY badge with context
      primary: filtered.filter((r) => r.signal_tier === "primary").length,
      secondary: filtered.filter((r) => r.signal_tier === "secondary").length,
      github: filtered.filter((r) => r.source === "github").length,
      mooc: filtered.filter((r) => r.source === "stepik" || r.source === "coursera").length,
    };
  }, [dataset, filtered]);

  // ── Filter-rail option lists ───────────────────────────────────────────────
  // These are derived from the FULL dataset (not `filtered`) so that filter
  // options don't disappear when you narrow the selection.
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
    // Sort descending by record count so the most common countries appear first
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [dataset]);

  // ── Chart data derivations ─────────────────────────────────────────────────
  // All chart data is derived from `filtered` so every chart responds to the
  // same filter state.

  // Country breakdown — used by the world map colour scale and the top-N bar chart
  const countryCounts = useMemo(() => groupBy(filtered, (r) => r.country || ""), [filtered]);
  const topCountries = useMemo(() => topN(countryCounts, 15), [countryCounts]);

  // Source, tier, and learning-type distributions
  const sourceCounts = useMemo(() => topN(groupBy(filtered, (r) => r.source), 10), [filtered]);
  const tierCounts = useMemo(() => topN(groupBy(filtered, (r) => r.signal_tier), 5), [filtered]);

  // Learning type — display "non-formal" instead of "informal" in charts
  const learningCounts = useMemo((): [string, number][] => {
    const raw = topN(groupBy(filtered, (r) => r.learning_type), 5);
    return raw.map(([k, v]) => [k === "informal" ? "Non-formal" : k === "formal" ? "Formal" : k, v]);
  }, [filtered]);

  // GitHub-specific breakdowns
  const repoTypeCounts = useMemo(
    () => topN(groupBy(filtered.filter((r) => r.source === "github"), (r) => r.subtype || "other"), 10),
    [filtered],
  );

  // Top 15 providers / owners across all sources
  const providerCounts = useMemo(() => topN(groupBy(filtered, (r) => r.provider), 15), [filtered]);

  // Kotlin-confidence histogram values - use 10 bins for 0.0-0.1, 0.1-0.2, etc.
  const confidenceValues = useMemo(() => filtered.map((r) => r.kotlin_confidence), [filtered]);
  const confidenceBins = 10;

  // Top-15 universities by course count (Formal Education section)
  const universityCourseCounts = useMemo(() => {
    const uniCourses = filtered.filter((r) => r.source === "university_website");
    return topN(groupBy(uniCourses, (r) => r.provider), 15);
  }, [filtered]);

  // Courses vs mentions for universities (Formal Education section)
  const universityCoursesVsMentions = useMemo(() => {
    const uniCourses = filtered.filter((r) => r.source === "university_website");
    const courses = uniCourses.filter((r) => r.signal_tier === "primary").length;
    const mentions = uniCourses.filter((r) => r.signal_tier === "secondary").length;
    return [
      ["Courses", courses],
      ["Mentions of Kotlin", mentions],
    ];
  }, [filtered]);

  // Top-15 GitHub repos by stars (GitHub section)
  const topGitHubRepos = useMemo(() => {
    const ghRepos = filtered.filter((r) => r.source === "github");
    return ghRepos
      .filter((r) => r.popularity > 0)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 15);
  }, [filtered]);

  // MOOC course list (MOOCs section)
  const moocCourses = useMemo(() => {
    return filtered.filter((r) => r.source === "coursera" || r.source === "stepik");
  }, [filtered]);

  // GitHub star popularity distribution — bucketed into log-friendly ranges
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

  // Formal vs non-formal split for the top 10 countries (stacked bar chart)
  const formalInformal = useMemo(() => {
    const top = topN(countryCounts, 10);
    return top.map(([label]) => {
      const rows = filtered.filter((r) => r.country === label);
      return {
        label,
        parts: {
          // Raw data uses "informal"; displayed as "Non-formal" in labels
          formal: rows.filter((r) => r.learning_type === "formal").length,
          "non-formal": rows.filter((r) => r.learning_type === "informal").length,
        },
      };
    });
  }, [countryCounts, filtered]);

  // MOOC-only platform distribution
  const moocCounts = useMemo(
    () => topN(groupBy(filtered.filter((r) => r.source === "stepik" || r.source === "coursera"), (r) => r.source), 10),
    [filtered],
  );

  // Top 15 universities by course count
  const topUniversities = useMemo(() => {
    const uniCourses = filtered.filter((r) => r.source === "university_website" && r.provider);
    return topN(groupBy(uniCourses, (r) => r.provider), 15);
  }, [filtered]);

  // ── Crawl-pipeline stats ───────────────────────────────────────────────────
  // Derived from the SERP data (not the filtered courses) — shows the funnel
  // from raw SERP queries down to unique institutions.
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

  // ── Map-table state ────────────────────────────────────────────────────────
  // University rows shown in the collapsible table below the world map.
  // The table contains only university_website records that pass all filters.
  const mapRows = useMemo(
    () => filtered.filter((r) => r.source === "university_website"),
    [filtered],
  );

  // ── Active-filters scroll target ───────────────────────────────────────────
  // When the user clicks a country on the map, we toggle the filter AND scroll
  // the ActiveFilters bar into view so they can see what was applied.
  const activeFiltersRef = useRef<HTMLDivElement>(null);

  const toggleCountry = useCallback(
    (c: string) => {
      setFilters((p) => ({
        ...p,
        countries: p.countries.includes(c) ? p.countries.filter((x) => x !== c) : [...p.countries, c],
      }));
      // Scroll to the active-filters bar after a brief tick so the DOM has
      // updated with the new filter chip before we attempt to scroll.
      requestAnimationFrame(() => {
        activeFiltersRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    },
    [setFilters],
  );

  return (
    <div className="min-h-screen">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <header className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-10 pb-4 sm:pb-6 md:pb-8">
        <div className="eyebrow text-[9px] sm:text-[10px] md:text-[11px]">GSoC 2026 · Kotlin Foundation</div>
        <h1 className="mt-1 sm:mt-2 md:mt-3 text-xl sm:text-2xl md:text-4xl lg:text-6xl font-extrabold tracking-[-0.03em] leading-[1.02]">
          Where <span className="kt-gradient-text">Kotlin</span> is taught,
          <br className="hidden md:block" /> mapped across the world.
        </h1>
        <p className="mt-2 sm:mt-3 md:mt-4 max-w-2xl text-muted-foreground text-[12px] sm:text-[13px] md:text-[15px] leading-relaxed">
          An automated pipeline discovers universities, MOOCs, and public repositories teaching
          Kotlin. Every filter below refines the whole dashboard in real time.
        </p>
        <div className="mt-3 sm:mt-4">
          <DatasetTimestamp generatedAt={dataset.meta.generated_at} />
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 pb-10 sm:pb-12 md:pb-16 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3 sm:gap-4 md:gap-6">
        {/* ── Filter rail (mobile sheet + desktop sidebar) ─────────────────── */}
        <div className="lg:hidden">
          <FilterRail
            filters={filters}
            setFilters={setFilters}
            sources={sources}
            countries={allCountries}
            filteredCount={filtered.length}
            totalCount={dataset.courses.length}
          />
        </div>
        <div className="hidden lg:block">
          <FilterRail
            filters={filters}
            setFilters={setFilters}
            sources={sources}
            countries={allCountries}
            filteredCount={filtered.length}
            totalCount={dataset.courses.length}
          />
        </div>

        <main className="flex flex-col gap-4 sm:gap-6 min-w-0">
          {/* ── Active filter chips ──────────────────────────────────────────
              Scroll target for map clicks: ref is attached here so that
              clicking a country on the map smoothly scrolls to this bar. */}
          <div ref={activeFiltersRef}>
            <ActiveFilters filters={filters} setFilters={setFilters} />
          </div>

          {/* ── AI Summary hero card ─────────────────────────────────────────
              Shows the overall AI-generated insight about the full dataset.
              Displays only if insights.json loaded successfully. */}
          <InsightSummary insight={dataset.insights?.overall} />

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION: GENERAL
              Overview metrics covering all sources combined.
          ═══════════════════════════════════════════════════════════════════ */}
          <SectionDivider label="General" />

          {/* ── KPI stat cards ───────────────────────────────────────────────
              Six large-number cards summarising the filtered dataset.
              The "Primary signal" card highlights the signal-tier split with a
              pulsing PRIMARY badge and a secondary count below. */}
          <StatCards totals={totals} />

          {/* ── Source + tier + learning-type breakdown ──────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Panel title="Records by source" subtitle="All sources · distribution">
              {/* Source breakdown bar chart */}
              <HorizontalBars data={sourceCounts} color="#C711E1" height={220} />
              <ChartInsight insight={dataset.insights?.sources} />
            </Panel>

            <Panel title="Signal tier & learning type" subtitle="Dataset composition">
              <div className="grid grid-cols-2 gap-6">
                {/* Signal-tier donut: primary vs secondary — measures dataset quality */}
                <div>
                  <div className="eyebrow mb-2 flex items-center gap-1">
                    Signal tier
                    <span
                      title="Primary: Kotlin is the main subject. Secondary: Kotlin mentioned alongside other content."
                      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-line text-muted-foreground cursor-help text-[9px]"
                      style={{ fontFamily: "serif", fontStyle: "italic" }}
                    >i</span>
                  </div>
                  <Donut
                    data={tierCounts}
                    colors={["#7F52FF", "#3A3A3F"]}
                    centerLabel="records"
                  />
                  <ChartInsight insight={dataset.insights?.signal_tier} />
                </div>
                {/* Learning-type donut: formal (university) vs non-formal (MOOC/GitHub) */}
                <div>
                  <div className="eyebrow mb-2 flex items-center gap-1">
                    Learning type
                    <span
                      title="Formal: accredited university courses. Non-formal: MOOCs, GitHub repos, self-study resources."
                      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-line text-muted-foreground cursor-help text-[9px]"
                      style={{ fontFamily: "serif", fontStyle: "italic" }}
                    >i</span>
                  </div>
                  <Donut
                    data={learningCounts}
                    colors={["#C711E1", "#7F52FF"]}
                    centerLabel="records"
                  />
                  <ChartInsight insight={dataset.insights?.learning_type} />
                </div>
              </div>
            </Panel>
          </div>

          {/* ── Top 15 providers ─────────────────────────────────────────────
              University names, MOOC platforms, GitHub orgs across all sources */}
          <Panel title="Top 15 providers" subtitle="Owners & institutions · all sources">
            <HorizontalBars data={providerCounts} color="#7F52FF" />
            <ChartInsight insight={dataset.insights?.top_providers} />
          </Panel>

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION: FORMAL EDUCATION
              Accredited university courses teaching Kotlin.
          ═══════════════════════════════════════════════════════════════════ */}
          <SectionDivider
            label="Formal Education"
            description="Accredited university courses where Kotlin appears in the curriculum."
          />

          {/* ── World map + university table ─────────────────────────────────
              The map shows one bubble per country (colour-coded by university
              count). Clicking a country toggles a country filter and scrolls
              to the active-filters bar above.
              Below the map, a collapsible DataTable shows the university rows
              for the currently visible (filtered) dataset. It auto-expands
              when at least one country is selected on the map. */}
          <Panel title="Universities per country" subtitle="World map · click a country to filter">
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
            <ChartInsight insight={dataset.insights?.map} />

            {/* Divider between map and table */}
            <div className="mt-4 sm:mt-6 border-t border-line pt-4 sm:pt-5">
              <div className="flex items-center justify-between mb-3">
                <div className="eyebrow text-[10px] sm:text-[11px]">
                  University records
                  {filters.countries.length > 0 && (
                    <span className="ml-1.5 text-muted-foreground normal-case tracking-normal">
                      · {filters.countries.join(", ")}
                    </span>
                  )}
                </div>
                <span className="mono text-xs tabular-nums text-muted-foreground">
                  {fmt(mapRows.length)} rows
                </span>
              </div>
              {/* University-only data table, always shown (lazy-loaded) */}
              <Suspense fallback={<div className="text-sm text-muted-foreground p-4">Loading table…</div>}>
                <DataTable data={mapRows} />
              </Suspense>
            </div>
          </Panel>

          {/* ── Top countries + top universities + courses vs mentions breakdown ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Top-15 country bar chart — clicking a bar also toggles the filter */}
            <Panel title="Top 15 countries" subtitle="Universities teaching Kotlin">
              <HorizontalBars
                data={topCountries}
                onClick={toggleCountry}
                activeKey={filters.countries[0]}
              />
              <ChartInsight insight={dataset.insights?.top_countries} />
            </Panel>

            {/* Top-15 universities bar chart */}
            <Panel title="Top 15 universities" subtitle="By course count">
              <HorizontalBars data={universityCourseCounts} color="#7F52FF" />
            </Panel>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Courses vs mentions donut */}
            <Panel title="Courses vs mentions" subtitle="University records by signal tier">
              <Donut
                data={universityCoursesVsMentions}
                colors={["#7F52FF", "#C711E1"]}
                centerLabel="records"
              />
            </Panel>

            {/* Formal vs non-formal stacked bar */}
            <Panel title="Formal vs non-formal" subtitle="Top 10 countries, stacked">
              <StackedBars
                data={formalInformal}
                keys={["formal", "non-formal"]}
                colors={["#7F52FF", "#C711E1"]}
              />
            </Panel>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION: MOOCs
              Non-formal online courses (Coursera, Stepik, etc.).
          ═══════════════════════════════════════════════════════════════════ */}
          <SectionDivider
            label="MOOCs"
            description="Non-formal online courses — Massively Open Online Courses on platforms like Coursera and Stepik."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Panel title="MOOC platform distribution" subtitle="Courses by platform">
              <HorizontalBars data={moocCounts} color="#C711E1" height={160} />
            </Panel>
            
            <Panel title="All MOOC courses" subtitle={`${moocCourses.length} courses from Coursera and Stepik`}>
              <MoocCourseTable courses={moocCourses.map(c => ({
                title: c.title,
                provider: c.provider,
                source: c.source,
                url: c.url
              }))} />
            </Panel>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION: GITHUB
              Public GitHub repositories related to Kotlin learning.
          ═══════════════════════════════════════════════════════════════════ */}
          <SectionDivider
            label="GitHub"
            description="Public repositories: courses, tutorials, workshops, and book companions."
          />

          {/* ── GitHub-specific breakdowns ───────────────────────────────────
              Only rows where source === "github" are included.
              Repo-type shows categories like "course", "tutorial", "assignment";
              popularity shows the star-count distribution in log-friendly buckets. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Panel title="GitHub by repository type" subtitle="Subtype breakdown">
              <HorizontalBars data={repoTypeCounts} color="#7F52FF" />
              <ChartInsight insight={dataset.insights?.github_types} />
            </Panel>
            <Panel title="GitHub stars distribution" subtitle="Star count buckets">
              <HorizontalBars data={popularityBuckets} color="#C711E1" height={260} />
            </Panel>
          </div>

          <Panel title="Top 15 GitHub repositories" subtitle="By star count · click to visit">
            <GitHubRepoBars repos={topGitHubRepos.map(r => ({
              title: r.title,
              url: r.url,
              popularity: r.popularity,
              subtype: r.subtype
            }))} />
          </Panel>

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION: ABOUT THIS DATA
              Terminology and methodology documentation.
          ═══════════════════════════════════════════════════════════════════ */}
          <SectionDivider
            label="About this data"
            description="Terminology, methodology, and data source documentation."
          />

          <Panel title="Terminology & methodology" subtitle="How to interpret this dashboard">
            <div className="space-y-4 text-[12px] sm:text-[13px] text-muted-foreground leading-relaxed">
              <div>
                <span className="text-ink font-semibold">Primary vs Secondary signal</span><br />
                <span className="text-[color:var(--kt-purple)] mono text-[11px]">Primary</span> — genuinely course-like content (a real course/program page).{" "}
                <span className="text-muted-foreground mono text-[11px]">Secondary</span> — supporting material or a page that merely mentions Kotlin.
              </div>
              <div>
                <span className="text-ink font-semibold">Formal / Non-formal learning</span><br />
                <span className="text-[color:var(--kt-purple)] mono text-[11px]">Formal</span> — university courses.{" "}
                <span className="text-muted-foreground mono text-[11px]">Non-formal</span> — MOOCs; a GitHub repo is Formal if it accompanies a university course, Non-formal if standalone or tied to a MOOC.
              </div>
              <div>
                <span className="text-ink font-semibold">Kotlin confidence</span><br />
                The classifier's confidence (0–1) that a resource genuinely teaches Kotlin.
              </div>
              <div>
                <span className="text-ink font-semibold">Methodology</span><br />
                Data is discovered via an automated pipeline that searches university websites, GitHub, and MOOC platforms for evidence of Kotlin teaching, then classifies and normalizes the results.
              </div>
              <div className="mt-4 pt-4 border-t border-line">
                <span className="text-ink font-semibold">Map-click filtering</span><br />
                Dashboard-click filtering only works on the map (by country). Clicking a country on the world map toggles a country filter.
              </div>
            </div>
          </Panel>

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION: SEARCH STATISTICS
              Crawl pipeline health: how the automated discovery worked.
          ═══════════════════════════════════════════════════════════════════ */}
          <SectionDivider
            label="Search Statistics"
            description="Pipeline telemetry — how the automated scraping and discovery process performed."
          />

          {/* ── Kotlin-confidence histogram ──────────────────────────────────
              The classifier assigns a confidence score (0–1) to every record
              indicating how likely the content is Kotlin-specific.
              This histogram reveals score distribution across the filtered set.
              Bars are centered on tick marks for readability. */}
          <Panel
            title="Kotlin-confidence distribution"
            subtitle="Classifier score histogram · bars centered on ticks"
          >
            <Histogram values={confidenceValues} bins={confidenceBins} height={240} />
          </Panel>

          {/* ── Crawl-pipeline funnel ────────────────────────────────────────
              Traces the full discovery funnel: how many university names were
              searched → how many SERP results came back → how many pages were
              scraped → how many unique institutions survived de-duplication. */}
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
            <ChartInsight insight={dataset.insights?.baseline} />
          </Panel>

          {/* ── SERP outcome & engine breakdown ─────────────────────────────
              Left: proportion of queries that succeeded, had no match, returned
              empty results, or outright failed.
              Right: which search engine (Google, Bing, etc.) served the results. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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

          {/* ── Full data table ──────────────────────────────────────────────
              Virtualised, sortable table of all filtered records. Export to CSV
              is available via the button in the table header row. */}
          <Panel title="Data table" subtitle="All sources · filterable · sortable · exportable">
            <Suspense fallback={<div className="text-sm text-muted-foreground p-4">Loading table…</div>}>
              <DataTable data={filtered} />
            </Suspense>
          </Panel>
        </main>
      </div>
    </div>
  );
}
