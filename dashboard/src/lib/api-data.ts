import { createServerFn } from "@tanstack/react-start";
import { getDbSafe } from "./mongodb";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

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
      console.log(`[api-data:resolveDataFilePath] Found ${filename} at ${c}`);
      return c;
    }
  }

  // Fallback to default
  return join(process.cwd(), 'public/data', filename);
}

export const getApiData = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await getDbSafe();

    if (db) {
      let courses = await db.collection("courses_unified").find({}, { projection: { _id: 0 } }).toArray();
      if (!courses || courses.length === 0) {
        courses = await db.collection("courses").find({}, { projection: { _id: 0 } }).toArray();
      }

      let serp = await db.collection("serp_progress").find({}, { projection: { _id: 0 } }).toArray();
      if (!serp || serp.length === 0) {
        serp = await db.collection("serp").find({}, { projection: { _id: 0 } }).toArray();
      }

      let baseline = await db.collection("baseline").findOne({}, { projection: { _id: 0 } });

      return {
        courses,
        serp,
        baseline: baseline || null,
        insights: null,
        meta: { generated_at: new Date().toISOString() },
      };
    }
  } catch (err) {
    console.error("[apiData] MongoDB query error:", err);
  }

  // Fallback to static JSON
  try {
    const coursesPath = resolveDataFilePath("courses_unified.json");
    const serpPath = resolveDataFilePath("serp_progress.json");
    const baselinePath = resolveDataFilePath("baseline_comparison.json");
    const insightsPath = resolveDataFilePath("insights.json");

    const coursesData = JSON.parse(readFileSync(coursesPath, "utf-8"));
    const serp = JSON.parse(readFileSync(serpPath, "utf-8"));
    
    // Handle new format (meta + courses) or old format (array)
    let courses;
    let meta;
    if (Array.isArray(coursesData)) {
      courses = coursesData;
      meta = { generated_at: new Date().toISOString() };
    } else {
      courses = coursesData.courses || [];
      meta = coursesData.meta || { generated_at: new Date().toISOString() };
    }
    
    let baseline = null;
    try {
      baseline = JSON.parse(readFileSync(baselinePath, "utf-8"));
    } catch {
      // optional
    }

    let insights = null;
    try {
      insights = JSON.parse(readFileSync(insightsPath, "utf-8"));
    } catch {
      // optional
    }

    return { courses, serp, baseline, insights, meta };
  } catch (e) {
    console.error("[apiData] JSON fallback error:", e);
    return { courses: [], serp: [], baseline: null, insights: null, meta: { generated_at: new Date().toISOString() } };
  }
});

export const getProgramsData = createServerFn({ method: "GET" }).handler(async () => {
  let programs = [];
  let topics = null;

  try {
    const programsPath = resolveDataFilePath("programs.json");
    const programsContent = readFileSync(programsPath, "utf-8");
    programs = JSON.parse(programsContent);
  } catch (error) {
    console.error("[programs] failed to load programs.json:", error);
  }

  try {
    const topicsPath = resolveDataFilePath("topics.json");
    const topicsContent = readFileSync(topicsPath, "utf-8");
    topics = JSON.parse(topicsContent);
  } catch (error) {
    console.error("[programs] failed to load topics.json:", error);
  }

  return { programs, topics };
});

