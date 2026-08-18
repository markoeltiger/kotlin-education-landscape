import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CXbBbaeP.js
var $$splitComponentImporter = () => import("./routes-C6moWcmY.mjs");
var Route = createFileRoute("/")({
	loader: async () => {
		const { fetchDataset } = await import("./dataset-D87_aTg7.mjs");
		return await fetchDataset();
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
