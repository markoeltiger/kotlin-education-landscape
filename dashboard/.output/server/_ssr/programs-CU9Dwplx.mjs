import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as zodValidator, o as object, r as _enum, s as string, t as fallback } from "../_libs/tanstack__zod-adapter+zod.mjs";
import { readFileSync } from "fs";
import { join } from "path";
//#region node_modules/.nitro/vite/services/ssr/assets/programs-CU9Dwplx.js
var $$splitComponentImporter = () => import("./programs-B9RrYa8l.mjs");
var searchSchema = object({
	search: fallback(string(), "").default(""),
	country: fallback(string(), "").default(""),
	level: fallback(string(), "").default(""),
	topic: fallback(string(), "").default(""),
	sortBy: fallback(_enum([
		"university",
		"country",
		"level"
	]), "university").default("university"),
	sortOrder: fallback(_enum(["asc", "desc"]), "asc").default("asc")
});
var Route = createFileRoute("/programs")({
	validateSearch: zodValidator(searchSchema),
	loader: async () => {
		let programs = [];
		let topics = null;
		try {
			const programsPath = join(process.cwd(), "public/data/programs.json");
			const programsContent = readFileSync(programsPath, "utf-8");
			programs = JSON.parse(programsContent);
			console.log(`[programs] loaded ${programs.length} programs from ${programsPath}`);
		} catch (error) {
			console.error("[programs] failed to load programs.json:", error);
		}
		try {
			const topicsPath = join(process.cwd(), "public/data/topics.json");
			const topicsContent = readFileSync(topicsPath, "utf-8");
			topics = JSON.parse(topicsContent);
			console.log(`[programs] loaded topics from ${topicsPath}`);
		} catch (error) {
			console.error("[programs] failed to load topics.json:", error);
		}
		return {
			programs,
			topics
		};
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
