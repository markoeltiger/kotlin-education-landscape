import { t as getServerFnById } from "../__23tanstack-start-server-fn-resolver-CM2jRACf.mjs";
import { c as createServerFn, i as TSS_SERVER_FUNCTION } from "./createServerFn-CIHAFgYl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-data-D1F5Ldm6.js
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
var getProgramsData = createServerFn({ method: "GET" }).handler(createSsrRpc("25563e268681f248459c0efe097541d0d9c953f66ca4f5ec0c8d6b769c2c1265"));
//#endregion
export { getApiData, getProgramsData };
