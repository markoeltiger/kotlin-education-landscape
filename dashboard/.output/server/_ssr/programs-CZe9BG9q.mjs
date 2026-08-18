import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as string, i as object, n as zodValidator, r as _enum, t as fallback } from "../_libs/tanstack__zod-adapter+zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/programs-CZe9BG9q.js
var $$splitComponentImporter = () => import("./programs-CknFlmLU.mjs");
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
			const programsResponse = await fetch("/data/programs.json");
			if (programsResponse.ok) {
				programs = await programsResponse.json();
				console.log(`[programs] loaded ${programs.length} programs`);
			}
		} catch (error) {
			console.error("[programs] failed to load programs.json:", error);
		}
		try {
			const topicsResponse = await fetch("/data/topics.json");
			if (topicsResponse.ok) {
				topics = await topicsResponse.json();
				console.log(`[programs] loaded topics`);
			}
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
