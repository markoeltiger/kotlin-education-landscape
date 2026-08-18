import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
import { readFileSync } from "fs";
import { join } from "path";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-B0tX_-u8.js
var $$splitComponentImporter = () => import("./routes-Cb13uB2V.mjs");
var Route = createFileRoute("/")({
	loader: async () => {
		const coursesPath = join(process.cwd(), "public/data/courses_unified.json");
		const coursesData = JSON.parse(readFileSync(coursesPath, "utf-8"));
		const courses = Array.isArray(coursesData) ? coursesData : coursesData.courses || [];
		const meta = Array.isArray(coursesData) ? { generated_at: (/* @__PURE__ */ new Date()).toISOString() } : coursesData.meta || { generated_at: (/* @__PURE__ */ new Date()).toISOString() };
		console.log(`[json] loaded ${courses.length} courses from courses_unified.json.`);
		const serpPath = join(process.cwd(), "public/data/serp_progress.json");
		const serp = JSON.parse(readFileSync(serpPath, "utf-8"));
		const baselinePath = join(process.cwd(), "public/data/baseline_comparison.json");
		let baseline = null;
		try {
			baseline = JSON.parse(readFileSync(baselinePath, "utf-8"));
		} catch {}
		let insights = null;
		try {
			const insightsPath = join(process.cwd(), "public/data/insights.json");
			insights = JSON.parse(readFileSync(insightsPath, "utf-8"));
			console.log("[insights] loaded insights.json");
		} catch {
			console.log("[insights] failed to load insights.json, continuing without insights");
		}
		return {
			courses,
			serp,
			baseline,
			insights,
			meta
		};
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
