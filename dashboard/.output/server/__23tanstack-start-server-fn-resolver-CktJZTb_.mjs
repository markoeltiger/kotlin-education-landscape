//#region node_modules/.nitro/vite/services/ssr/assets/__23tanstack-start-server-fn-resolver-CktJZTb_.js
var manifest = { "8e06fae4a2d24719e6eea33c258187b27767656003397f7a7a1fa1015039e721": {
	functionName: "getApiData_createServerFn_handler",
	importer: () => import("./_ssr/api-data-DGiBP34Q.mjs")
} };
async function getServerFnById(id, access) {
	const serverFnInfo = manifest[id];
	if (!serverFnInfo) throw new Error("Server function info not found for " + id);
	const fnModule = serverFnInfo.module ?? await serverFnInfo.importer();
	if (!fnModule) throw new Error("Server function module not resolved for " + id);
	const action = fnModule[serverFnInfo.functionName];
	if (!action) throw new Error("Server function module export not resolved for serverFn ID: " + id);
	return action;
}
//#endregion
export { getServerFnById as t };
