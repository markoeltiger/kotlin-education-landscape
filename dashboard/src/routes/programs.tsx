import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useCallback, useMemo, useState } from "react";

import { Panel, Empty } from "../components/Panel";
import { HorizontalBars, Donut } from "../components/Charts";
import { fmt } from "../lib/format";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Types for programs data
interface Program {
  university: string;
  country: string;
  program_name: string;
  topics: string[];
  level: string;
  prerequisites: string | null;
  language_taught: string | null;
  credits: string | null;
  summary: string;
  confidence: number;
  url: string;
}

interface TopicsData {
  total_programs: number;
  topics: { topic: string; count: number }[];
  by_level: { level: string; count: number }[];
  by_language: { language: string; count: number }[];
  by_country: { country: string; count: number }[];
  top_topics_by_country: Record<string, { topic: string; count: number }[]>;
}

interface ProgramsDataset {
  programs: Program[];
  topics: TopicsData | null;
}

// URL search-param schema for programs page
const searchSchema = z.object({
  search: fallback(z.string(), "").default(""),
  country: fallback(z.string(), "").default(""),
  level: fallback(z.string(), "").default(""),
  topic: fallback(z.string(), "").default(""),
  sortBy: fallback(z.enum(["university", "country", "level"]), "university").default("university"),
  sortOrder: fallback(z.enum(["asc", "desc"]), "asc").default("asc"),
});

// Robust path resolver for data files across different run environments (dev/prod)
function resolveDataFilePath(filename: string): string {
  const candidates = [
    join(process.cwd(), 'public/data', filename),
    join(process.cwd(), '.output/public/data', filename),
    join(process.cwd(), 'dashboard/public/data', filename),
    join(process.cwd(), 'dashboard/.output/public/data', filename),
    join(process.cwd(), '../public/data', filename),
    join(process.cwd(), '../../public/data', filename),
  ];

  for (const c of candidates) {
    if (existsSync(c)) {
      console.log(`[resolveDataFilePath] Found ${filename} at ${c}`);
      return c;
    }
  }

  // Fallback to default
  return join(process.cwd(), 'public/data', filename);
}

export const Route = createFileRoute("/programs")({
  validateSearch: zodValidator(searchSchema),
  loader: async (): Promise<ProgramsDataset> => {
    let programs: Program[] = [];
    let topics: TopicsData | null = null;

    try {
      const programsPath = resolveDataFilePath('programs.json');
      const programsContent = readFileSync(programsPath, 'utf-8');
      programs = JSON.parse(programsContent) as Program[];
      console.log(`[programs] loaded ${programs.length} programs from ${programsPath}`);
    } catch (error) {
      console.error('[programs] failed to load programs.json:', error);
    }

    try {
      const topicsPath = resolveDataFilePath('topics.json');
      const topicsContent = readFileSync(topicsPath, 'utf-8');
      topics = JSON.parse(topicsContent) as TopicsData;
      console.log(`[programs] loaded topics from ${topicsPath}`);
    } catch (error) {
      console.error('[programs] failed to load topics.json:', error);
    }

    return { programs, topics };
  },
  component: ProgramsPage,
});

function ProgramsPage() {
  const dataset = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/programs" });

  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  // Filter programs based on search criteria
  const filteredPrograms = useMemo(() => {
    return dataset.programs.filter((program) => {
      const matchesSearch = !search.search || 
        program.university.toLowerCase().includes(search.search.toLowerCase()) ||
        program.program_name.toLowerCase().includes(search.search.toLowerCase()) ||
        program.topics.some(t => t.toLowerCase().includes(search.search.toLowerCase()));

      const matchesCountry = !search.country || program.country === search.country;
      const matchesLevel = !search.level || program.level === search.level;
      const matchesTopic = !search.topic || program.topics.includes(search.topic);

      return matchesSearch && matchesCountry && matchesLevel && matchesTopic;
    });
  }, [dataset.programs, search]);

  // Sort programs
  const sortedPrograms = useMemo(() => {
    const sorted = [...filteredPrograms];
    sorted.sort((a, b) => {
      let comparison = 0;
      if (search.sortBy === "university") {
        comparison = a.university.localeCompare(b.university);
      } else if (search.sortBy === "country") {
        comparison = a.country.localeCompare(b.country);
      } else if (search.sortBy === "level") {
        comparison = a.level.localeCompare(b.level);
      }
      return search.sortOrder === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [filteredPrograms, search.sortBy, search.sortOrder]);

  // Update search params
  const setSearch = useCallback(
    (updates: Partial<typeof search>) => {
      navigate({
        search: (prev) => ({ ...prev, ...updates }),
        replace: true,
      });
    },
    [navigate],
  );

  // Get unique values for filters
  const allCountries = useMemo(() => {
    const unique = Array.from(new Set(dataset.programs.map((p) => p.country))).sort();
    return unique;
  }, [dataset.programs]);

  const allLevels = useMemo(() => {
    const unique = Array.from(new Set(dataset.programs.map((p) => p.level))).sort();
    return unique;
  }, [dataset.programs]);

  const allTopics = useMemo(() => {
    const unique = Array.from(new Set(dataset.programs.flatMap((p) => p.topics))).sort();
    return unique;
  }, [dataset.programs]);

  // Handle topic click
  const handleTopicClick = useCallback((topic: string) => {
    setSearch({ topic: search.topic === topic ? "" : topic });
  }, [search.topic, setSearch]);

  // Handle sorting
  const handleSort = useCallback((sortBy: string) => {
    setSearch({ 
      sortBy: sortBy as "university" | "country" | "level",
      sortOrder: search.sortBy === sortBy && search.sortOrder === "asc" ? "desc" : "asc"
    });
  }, [search.sortBy, search.sortOrder, setSearch]);

  // Prepare chart data — must be called unconditionally (Rules of Hooks).
  // These return empty arrays when topics is null, which is safe for the charts.
  const topicsChartData = useMemo(() => {
    if (!dataset.topics) return [] as [string, number][];
    return dataset.topics.topics
      .slice(0, 15)
      .map((t) => [t.topic, t.count] as [string, number]);
  }, [dataset.topics]);

  const levelChartData = useMemo(() => {
    if (!dataset.topics) return [] as [string, number][];
    return dataset.topics.by_level.map((l) => [l.level, l.count] as [string, number]);
  }, [dataset.topics]);

  const languageChartData = useMemo(() => {
    if (!dataset.topics) return [] as [string, number][];
    return dataset.topics.by_language
      .slice(0, 10)
      .map((l) => [l.language, l.count] as [string, number]);
  }, [dataset.topics]);

  // Topic tag colors (subtle brand palette) — must be before any early returns (Rules of Hooks)
  const getTopicColor = useCallback((topic: string) => {
    const colors = [
      "bg-purple-500/20 text-purple-300 border-purple-500/30",
      "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
      "bg-pink-500/20 text-pink-300 border-pink-500/30",
      "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      "bg-violet-500/20 text-violet-300 border-violet-500/30",
    ];
    const idx = topic.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[idx];
  }, []);

  // Show empty state if data failed to load
  if (!dataset.programs.length || !dataset.topics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Empty label="Program data not available" />
      </div>
    );
  }


  return (
    <div className="min-h-screen">
      {/* Page header */}
      <header className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-10 pb-4 sm:pb-6 md:pb-8">
        <div className="eyebrow text-[9px] sm:text-[10px] md:text-[11px]">GSoC 2026 · Kotlin Foundation</div>
        <h1 className="mt-1 sm:mt-2 md:mt-3 text-xl sm:text-2xl md:text-4xl lg:text-6xl font-extrabold tracking-[-0.03em] leading-[1.02]">
          <span className="kt-gradient-text">Programs</span> teaching Kotlin
        </h1>
        <p className="mt-2 sm:mt-3 md:mt-4 max-w-2xl text-muted-foreground text-[12px] sm:text-[13px] md:text-[15px] leading-relaxed">
          AI-verified university courses, bootcamps, and professional training programs that teach Kotlin programming.
        </p>
      </header>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 pb-10 sm:pb-12 md:pb-16">
        {/* Programs summary at top */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="panel p-4 sm:p-5">
            <div className="eyebrow text-[10px] sm:text-[11px] mb-1">Total Programs</div>
            <div className="text-2xl sm:text-3xl font-bold text-ink mono">{dataset.programs.length}</div>
          </div>
          <div className="panel p-4 sm:p-5">
            <div className="eyebrow text-[10px] sm:text-[11px] mb-1">Countries</div>
            <div className="text-2xl sm:text-3xl font-bold text-ink mono">{allCountries.length}</div>
          </div>
          <div className="panel p-4 sm:p-5">
            <div className="eyebrow text-[10px] sm:text-[11px] mb-1">Topics</div>
            <div className="text-2xl sm:text-3xl font-bold text-ink mono">{allTopics.length}</div>
          </div>
          <div className="panel p-4 sm:p-5">
            <div className="eyebrow text-[10px] sm:text-[11px] mb-1">Filtered</div>
            <div className="text-2xl sm:text-3xl font-bold text-kt-purple mono">{sortedPrograms.length}</div>
          </div>
        </div>

        {/* Topics distribution chart (headline) */}
        <Panel title="Topics distribution" subtitle="Most taught Kotlin topics across all programs" className="mb-4 sm:mb-6">
          <HorizontalBars 
            data={topicsChartData} 
            color="#7F52FF" 
            height={400}
            onClick={handleTopicClick}
            activeKey={search.topic}
          />
        </Panel>

        {/* Secondary charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Programs by level */}
          <Panel title="Programs by level" subtitle="Academic vs professional">
            <Donut
              data={levelChartData}
              colors={["#7F52FF", "#C711E1", "#E44857", "#3A3A3F"]}
              centerLabel="programs"
            />
          </Panel>

          {/* Language of instruction */}
          <Panel title="Language of instruction" subtitle="Teaching language distribution">
            <HorizontalBars 
              data={languageChartData} 
              color="#C711E1" 
              height={220}
            />
          </Panel>
        </div>

        {/* Top topics by country (optional) */}
        {dataset.topics?.top_topics_by_country && Object.keys(dataset.topics.top_topics_by_country).length > 0 && (
          <Panel title="Top topics by country" subtitle="Select a country to see its topic breakdown" className="mb-4 sm:mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-kt-purple"
              >
                <option value="">Select a country</option>
                {Object.keys(dataset.topics.top_topics_by_country).sort().map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
            {selectedCountry && dataset.topics.top_topics_by_country[selectedCountry] && (
              <div>
                <HorizontalBars 
                  data={dataset.topics.top_topics_by_country[selectedCountry]
                    .slice(0, 10)
                    .map((t) => [t.topic, t.count] as [string, number])} 
                  color="#E44857" 
                  height={300}
                  onClick={handleTopicClick}
                  activeKey={search.topic}
                />
              </div>
            )}
          </Panel>
        )}

        {/* Filters */}
        <Panel title="Filters" subtitle="Refine programs list" className="mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div>
              <label className="eyebrow text-[10px] block mb-2">Search</label>
              <input
                type="text"
                placeholder="University, program, or topic..."
                value={search.search}
                onChange={(e) => setSearch({ search: e.target.value })}
                className="w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:border-kt-purple"
              />
            </div>

            {/* Country filter */}
            <div>
              <label className="eyebrow text-[10px] block mb-2">Country</label>
              <select
                value={search.country}
                onChange={(e) => setSearch({ country: e.target.value })}
                className="w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-kt-purple"
              >
                <option value="">All countries</option>
                {allCountries.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            {/* Level filter */}
            <div>
              <label className="eyebrow text-[10px] block mb-2">Level</label>
              <select
                value={search.level}
                onChange={(e) => setSearch({ level: e.target.value })}
                className="w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-kt-purple"
              >
                <option value="">All levels</option>
                {allLevels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            {/* Topic filter */}
            <div>
              <label className="eyebrow text-[10px] block mb-2">Topic</label>
              <select
                value={search.topic}
                onChange={(e) => setSearch({ topic: e.target.value })}
                className="w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-kt-purple"
              >
                <option value="">All topics</option>
                {allTopics.map((topic) => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active filters display */}
          {(search.search || search.country || search.level || search.topic) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {search.search && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-kt-purple/20 text-kt-purple text-xs mono">
                  Search: {search.search}
                  <button
                    onClick={() => setSearch({ search: "" })}
                    className="hover:text-white"
                  >
                    ×
                  </button>
                </span>
              )}
              {search.country && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-kt-purple/20 text-kt-purple text-xs mono">
                  Country: {search.country}
                  <button
                    onClick={() => setSearch({ country: "" })}
                    className="hover:text-white"
                  >
                    ×
                  </button>
                </span>
              )}
              {search.level && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-kt-purple/20 text-kt-purple text-xs mono">
                  Level: {search.level}
                  <button
                    onClick={() => setSearch({ level: "" })}
                    className="hover:text-white"
                  >
                    ×
                  </button>
                </span>
              )}
              {search.topic && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-kt-purple/20 text-kt-purple text-xs mono">
                  Topic: {search.topic}
                  <button
                    onClick={() => setSearch({ topic: "" })}
                    className="hover:text-white"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                onClick={() => setSearch({ search: "", country: "", level: "", topic: "" })}
                className="text-xs text-muted-foreground hover:text-ink underline"
              >
                Clear all
              </button>
            </div>
          )}
        </Panel>

        {/* Programs table */}
        <Panel 
          title="Programs" 
          subtitle={`Showing ${sortedPrograms.length} of ${dataset.programs.length} programs`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th 
                    className="text-left py-3 px-2 font-semibold text-ink cursor-pointer hover:text-kt-purple"
                    onClick={() => handleSort("university")}
                  >
                    University {search.sortBy === "university" && (search.sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-ink">Program Name</th>
                  <th 
                    className="text-left py-3 px-2 font-semibold text-ink cursor-pointer hover:text-kt-purple"
                    onClick={() => handleSort("country")}
                  >
                    Country {search.sortBy === "country" && (search.sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th 
                    className="text-left py-3 px-2 font-semibold text-ink cursor-pointer hover:text-kt-purple"
                    onClick={() => handleSort("level")}
                  >
                    Level {search.sortBy === "level" && (search.sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-ink">Topics</th>
                  <th className="text-left py-3 px-2 font-semibold text-ink">Credits</th>
                  <th className="text-left py-3 px-2 font-semibold text-ink">Language</th>
                </tr>
              </thead>
              <tbody>
                {sortedPrograms.map((program, index) => (
                  <tr 
                    key={index}
                    className="border-b border-line hover:bg-panel-2 cursor-pointer"
                    onClick={() => setExpandedRow(expandedRow === index ? null : index as number)}
                  >
                    <td className="py-3 px-2 text-ink">{program.university}</td>
                    <td className="py-3 px-2">
                      <a
                        href={program.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-kt-purple hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {program.program_name}
                      </a>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">{program.country}</td>
                    <td className="py-3 px-2">
                      <span className="inline-block px-2 py-0.5 rounded bg-panel-2 border border-line text-xs">
                        {program.level}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex flex-wrap gap-1">
                        {program.topics.slice(0, 3).map((topic) => (
                          <span
                            key={topic}
                            className={`inline-block px-2 py-0.5 rounded text-xs border ${getTopicColor(topic)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTopicClick(topic);
                            }}
                          >
                            {topic}
                          </span>
                        ))}
                        {program.topics.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{program.topics.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground mono text-xs">{program.credits || "-"}</td>
                    <td className="py-3 px-2 text-muted-foreground">{program.language_taught || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expanded row details */}
          {expandedRow !== null && sortedPrograms[expandedRow] && (
            <div className="mt-4 p-4 bg-panel-2 rounded-md border border-line">
              <h4 className="font-semibold text-ink mb-2">{sortedPrograms[expandedRow].program_name}</h4>
              <p className="text-sm text-muted-foreground mb-3">{sortedPrograms[expandedRow].summary}</p>
              {sortedPrograms[expandedRow].prerequisites && (
                <div className="text-sm">
                  <span className="font-semibold text-ink">Prerequisites: </span>
                  <span className="text-muted-foreground">{sortedPrograms[expandedRow].prerequisites}</span>
                </div>
              )}
              <div className="mt-3">
                <span className="font-semibold text-ink text-sm">All topics: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {sortedPrograms[expandedRow].topics.map((topic) => (
                    <span
                      key={topic}
                      className={`inline-block px-2 py-0.5 rounded text-xs border ${getTopicColor(topic)}`}
                      onClick={() => handleTopicClick(topic)}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {sortedPrograms.length === 0 && (
            <Empty label="No programs match your filters" />
          )}
        </Panel>

        {/* Footnote */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Programs verified via automated page analysis
          </p>
        </div>
      </div>
    </div>
  );
}