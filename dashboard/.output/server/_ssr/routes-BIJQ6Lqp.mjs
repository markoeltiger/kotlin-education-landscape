import { o as __toESM } from "../_runtime.mjs";
import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as boolean, c as string, i as array, n as zodValidator, o as number, s as object, t as fallback } from "../_libs/tanstack__zod-adapter+zod.mjs";
import { t as require_papaparse } from "../_libs/papaparse.mjs";
import { readFileSync } from "fs";
import { join } from "path";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BIJQ6Lqp.js
var import_papaparse = /* @__PURE__ */ __toESM(require_papaparse());
var $$splitComponentImporter = () => import("./routes-DXysDqcX.mjs");
var searchSchema = object({
	primary_only: fallback(boolean(), false).default(false),
	sources: fallback(array(string()), []).default([]),
	tiers: fallback(array(string()), []).default([]),
	learning_types: fallback(array(string()), []).default([]),
	countries: fallback(array(string()), []).default([]),
	min_stars: fallback(number(), 0).default(0),
	conf_min: fallback(number(), 0).default(0),
	conf_max: fallback(number(), 1).default(1),
	search: fallback(string(), "").default("")
});
var Route = createFileRoute("/")({
	validateSearch: zodValidator(searchSchema),
	loader: async () => {
		const mainCsvPath = join(process.cwd(), "kotlin_education_tableau.csv");
		const uniCsvPath = join(process.cwd(), "kotlin_education_tableau_universities.csv");
		const mainCsvContent = readFileSync(mainCsvPath, "utf-8");
		const mainResult = import_papaparse.default.parse(mainCsvContent, {
			header: true,
			dynamicTyping: true,
			skipEmptyLines: true
		});
		const uniCsvContent = readFileSync(uniCsvPath, "utf-8");
		const uniResult = import_papaparse.default.parse(uniCsvContent, {
			header: true,
			dynamicTyping: true,
			skipEmptyLines: true
		});
		const courses = [...mainResult.data, ...uniResult.data];
		console.log(`[csv] loaded ${courses.length} courses from CSV files.`);
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
			insights
		};
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
