export type Course = {
  source: string;
  category: string;
  /**
   * Signal tier indicates the strength of evidence that Kotlin is being taught:
   * - "primary" — Kotlin is the main subject (course title, syllabus explicitly mentions Kotlin)
   * - "secondary" — Kotlin is mentioned as part of a broader course or resource
   */
  signal_tier: "primary" | "secondary" | string;
  /**
   * Learning type follows standard educational classification:
   * - "formal" — accredited university / higher-education courses
   * - "informal" — non-formal learning: MOOCs, GitHub repos, self-study resources
   *   (displayed in the UI as "Non-formal" to match educational terminology)
   */
  learning_type: "formal" | "informal" | string;
  title: string;
  url: string;
  provider: string;
  country: string;
  language: string;
  subtype: string;
  /** Raw star count (GitHub) or 0 for non-GitHub sources */
  popularity: number;
  /**
   * Kotlin confidence score (0–1): classifier probability that this resource
   * is genuinely Kotlin-focused rather than tangentially mentioning it.
   */
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

export type Insights = {
  overall?: string;
  map?: string;
  sources?: string;
  signal_tier?: string;
  learning_type?: string;
  github_types?: string;
  top_countries?: string;
  top_providers?: string;
  baseline?: string;
  _meta?: {
    model: string;
    generated: boolean;
  };
};

export type DatasetMeta = {
  generated_at: string;
};

export type Dataset = {
  courses: Course[];
  serp: SerpRow[];
  baseline: Baseline | null;
  insights: Insights | null;
  meta: DatasetMeta;
};

export async function fetchDataset(): Promise<Dataset> {
  try {
    const { getApiData } = await import("./api-data");
    const data = await getApiData();
    return {
      courses: data.courses || [],
      serp: data.serp || [],
      baseline: data.baseline || null,
      insights: data.insights || null,
      meta: data.meta || { generated_at: new Date().toISOString() },
    };
  } catch (error) {
    console.error('Error fetching dataset from API, falling back to static files:', error);
    // Fallback to static JSON files
    const [coursesResponse, serpResponse, baselineResponse, insightsResponse] = await Promise.all([
      fetch("/data/courses_unified.json"),
      fetch("/data/serp_progress.json"),
      fetch("/data/baseline_comparison.json"),
      fetch("/data/insights.json"),
    ]);
    
    // Handle courses_unified.json with new format (meta + courses) or old format (array)
    let courses: Course[] = [];
    let meta: DatasetMeta = { generated_at: new Date().toISOString() };
    
    if (coursesResponse.ok) {
      const coursesData = await coursesResponse.json();
      if (Array.isArray(coursesData)) {
        courses = coursesData as Course[];
      } else if (coursesData.courses) {
        courses = coursesData.courses;
        meta = coursesData.meta || meta;
      }
    }
    
    const serp = serpResponse.ok ? await serpResponse.json() as SerpRow[] : [];
    const baseline = baselineResponse.ok ? await baselineResponse.json() as Baseline : null;
    const insights = insightsResponse.ok ? await insightsResponse.json() as Insights : null;
    
    return { 
      courses, 
      serp, 
      baseline, 
      insights,
      meta
    };
  }
}

export type Filters = {
  sources: string[];
  tiers: string[];
  learning_types: string[];
  countries: string[];
  conf_min: number;
  conf_max: number;
  search: string;
};

export const emptyFilters: Filters = {
  sources: [],
  tiers: [],
  learning_types: [],
  countries: [],
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
    if (srcSet.size && !srcSet.has(r.source)) return false;
    if (tSet.size && !tSet.has(r.signal_tier)) return false;
    if (lSet.size && !lSet.has(r.learning_type)) return false;
    if (csSet.size && !csSet.has(r.country)) return false;
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
