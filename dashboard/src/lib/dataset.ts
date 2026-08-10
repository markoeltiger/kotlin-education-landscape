export type Course = {
  source: string;
  category: string;
  signal_tier: "primary" | "secondary" | string;
  learning_type: "formal" | "informal" | string;
  title: string;
  url: string;
  provider: string;
  country: string;
  language: string;
  subtype: string;
  popularity: number;
  kotlin_confidence: number;
};

export type SerpRow = {
  name: string;
  country: string;
  domain: string;
  status: "found" | "no_match" | "empty" | "failed" | string;
  engine: string;
  raw_results: number;
  kept: number;
  dropped: number;
};

export type Baseline = {
  rediscovered: number;
  net_new: number;
  missed: number;
  missed_not_in_input: number;
  missed_searched_no_match: number;
};

export type Dataset = {
  courses: Course[];
  serp: SerpRow[];
  baseline: Baseline | null;
};

export async function fetchDataset(): Promise<Dataset> {
  try {
    const { getApiData } = await import("./api-data");
    const data = await getApiData();
    return {
      courses: data.courses || [],
      serp: data.serp || [],
      baseline: data.baseline || null,
    };
  } catch (error) {
    console.error('Error fetching dataset:', error);
    // Fallback to static JSON files
    const [c, s, b] = await Promise.all([
      fetch("/data/courses_unified.json").then((r) => r.json() as Promise<Course[]>),
      fetch("/data/serp_progress.json").then((r) => r.json() as Promise<SerpRow[]>),
      fetch("/data/baseline_comparison.json").then((r) => (r.ok ? r.json() as Promise<Baseline> : null)).catch(() => null),
    ]);
    return { courses: c, serp: s, baseline: b };
  }
}

export type Filters = {
  primary_only: boolean;
  sources: string[];
  tiers: string[];
  learning_types: string[];
  countries: string[];
  min_stars: number;
  conf_min: number;
  conf_max: number;
  search: string;
};

export const emptyFilters: Filters = {
  primary_only: false,
  sources: [],
  tiers: [],
  learning_types: [],
  countries: [],
  min_stars: 0,
  conf_min: 0,
  conf_max: 1,
  search: "",
};

export function applyFilters(courses: Course[], f: Filters): Course[] {
  const q = f.search.trim().toLowerCase();
  const csSet = new Set(f.countries);
  const srcSet = new Set(f.sources);
  const tSet = new Set(f.tiers);
  const lSet = new Set(f.learning_types);
  return courses.filter((r) => {
    if (f.primary_only && r.signal_tier !== "primary") return false;
    if (srcSet.size && !srcSet.has(r.source)) return false;
    if (tSet.size && !tSet.has(r.signal_tier)) return false;
    if (lSet.size && !lSet.has(r.learning_type)) return false;
    if (csSet.size && !csSet.has(r.country)) return false;
    if (f.min_stars > 0 && (r.source !== "github" || r.popularity < f.min_stars)) return false;
    if (r.kotlin_confidence < f.conf_min || r.kotlin_confidence > f.conf_max) return false;
    if (q) {
      const hay = `${r.title} ${r.provider} ${r.country}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export function topN(m: Map<string, number>, n: number, dropEmpty = true): [string, number][] {
  const arr = Array.from(m.entries()).filter(([k]) => {
    if (!dropEmpty) return true;
    const keyStr = String(k);
    return keyStr && keyStr.trim().length > 0;
  });
  arr.sort((a, b) => b[1] - a[1]);
  return arr.slice(0, n);
}
