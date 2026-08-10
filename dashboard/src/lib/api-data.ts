import { createServerFn } from "@tanstack/react-start";
import { getDbSafe } from "./mongodb";
import { readFileSync } from "fs";
import { join } from "path";

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
      };
    }
  } catch (err) {
    console.error("[apiData] MongoDB query error:", err);
  }

  // Fallback to static JSON
  try {
    const coursesPath = join(process.cwd(), "public/data/courses_unified.json");
    const serpPath = join(process.cwd(), "public/data/serp_progress.json");
    const baselinePath = join(process.cwd(), "public/data/baseline_comparison.json");

    const courses = JSON.parse(readFileSync(coursesPath, "utf-8"));
    const serp = JSON.parse(readFileSync(serpPath, "utf-8"));
    let baseline = null;
    try {
      baseline = JSON.parse(readFileSync(baselinePath, "utf-8"));
    } catch {
      // optional
    }

    return { courses, serp, baseline };
  } catch (e) {
    return { courses: [], serp: [], baseline: null };
  }
});
