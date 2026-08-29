import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as string, i as object, n as zodValidator, r as _enum, t as fallback } from "../_libs/tanstack__zod-adapter+zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/programs--LX5NrH_.js
var $$splitComponentImporter = () => import("./programs-CNCBIFwQ.mjs");
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
		try {
			const { getProgramsData } = await import("./api-data-D1F5Ldm6.mjs");
			return await getProgramsData();
		} catch (error) {
			console.error("Error fetching programs via API, falling back to static files:", error);
			const [programsResponse, topicsResponse] = await Promise.all([fetch("/data/programs.json"), fetch("/data/topics.json")]);
			return {
				programs: programsResponse.ok ? await programsResponse.json() : [],
				topics: topicsResponse.ok ? await topicsResponse.json() : null
			};
		}
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
