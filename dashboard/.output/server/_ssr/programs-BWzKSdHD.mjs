import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as string, i as object, n as zodValidator, r as _enum, t as fallback } from "../_libs/tanstack__zod-adapter+zod.mjs";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
//#region node_modules/.nitro/vite/services/ssr/assets/programs-BWzKSdHD.js
var $$splitComponentImporter = () => import("./programs-BOTZy9OT.mjs");
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
function resolveDataFilePath(filename) {
	const candidates = [
		join(process.cwd(), "public/data", filename),
		join(process.cwd(), ".output/public/data", filename),
		join(process.cwd(), "dashboard/public/data", filename),
		join(process.cwd(), "dashboard/.output/public/data", filename),
		join(process.cwd(), "../public/data", filename),
		join(process.cwd(), "../../public/data", filename)
	];
	for (const c of candidates) if (existsSync(c)) {
		console.log(`[resolveDataFilePath] Found ${filename} at ${c}`);
		return c;
	}
	return join(process.cwd(), "public/data", filename);
}
var Route = createFileRoute("/programs")({
	validateSearch: zodValidator(searchSchema),
	loader: async () => {
		let programs = [];
		let topics = null;
		try {
			const programsPath = resolveDataFilePath("programs.json");
			const programsContent = readFileSync(programsPath, "utf-8");
			programs = JSON.parse(programsContent);
			console.log(`[programs] loaded ${programs.length} programs from ${programsPath}`);
		} catch (error) {
			console.error("[programs] failed to load programs.json:", error);
		}
		try {
			const topicsPath = resolveDataFilePath("topics.json");
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
