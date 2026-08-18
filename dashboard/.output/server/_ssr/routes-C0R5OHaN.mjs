import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-C0R5OHaN.js
var $$splitComponentImporter = () => import("./routes-DfFU2HGH.mjs");
var Route = createFileRoute("/")({
	loader: async () => {
		const { fetchDataset } = await import("./dataset-DEQaWqwR.mjs");
		return await fetchDataset();
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
