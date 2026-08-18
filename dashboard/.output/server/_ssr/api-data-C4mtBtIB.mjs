import { t as getServerFnById } from "../__23tanstack-start-server-fn-resolver-CktJZTb_.mjs";
import { c as createServerFn, i as TSS_SERVER_FUNCTION } from "./createServerFn-CIHAFgYl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-data-C4mtBtIB.js
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var getApiData = createServerFn({ method: "GET" }).handler(createSsrRpc("8e06fae4a2d24719e6eea33c258187b27767656003397f7a7a1fa1015039e721"));
//#endregion
export { getApiData };
