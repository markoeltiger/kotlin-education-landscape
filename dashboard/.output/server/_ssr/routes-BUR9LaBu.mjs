import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as number, i as array, n as zodValidator, o as object, s as string, t as fallback } from "../_libs/tanstack__zod-adapter+zod.mjs";
import { readFileSync } from "fs";
import { join } from "path";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BUR9LaBu.js
var $$splitComponentImporter = () => import("./routes-e_lgXrdA.mjs");
var searchSchema = object({
	sources: fallback(array(string()), []).default([]),
	tiers: fallback(array(string()), []).default([]),
	learning_types: fallback(array(string()), []).default([]),
	countries: fallback(array(string()), []).default([]),
	conf_min: fallback(number(), 0).default(0),
	conf_max: fallback(number(), 1).default(1),
	search: fallback(string(), "").default("")
});
var Route = createFileRoute("/")({
	validateSearch: zodValidator(searchSchema),
	loader: async () => {
		const coursesPath = join(process.cwd(), "public/data/courses_unified.json");
		const courses = JSON.parse(readFileSync(coursesPath, "utf-8"));
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
		const meta = { generated_at: (/* @__PURE__ */ new Date()).toISOString() };
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
