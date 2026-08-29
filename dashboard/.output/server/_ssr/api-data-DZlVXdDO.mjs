import { c as createServerFn, i as TSS_SERVER_FUNCTION } from "./createServerFn-CIHAFgYl.mjs";
import { t as require_lib } from "../_libs/mongodb.mjs";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
//#region node_modules/.nitro/vite/services/ssr/assets/api-data-DZlVXdDO.js
var import_lib = require_lib();
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function getMongoUri() {
	if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
	if (process.env.MONGO_URI) return process.env.MONGO_URI;
	if (process.env.VITE_MONGODB_URI) return process.env.VITE_MONGODB_URI;
	const envPaths = [
		join(process.cwd(), ".env.local"),
		join(process.cwd(), ".env"),
		join(process.cwd(), "../.env")
	];
	for (const envPath of envPaths) try {
		if (existsSync(envPath)) {
			const match = readFileSync(envPath, "utf-8").match(/^(?:MONGODB_URI|MONGO_URI|VITE_MONGODB_URI)=(.*)$/m);
			if (match && match[1]) {
				const uri = match[1].trim().replace(/^["']|["']$/g, "");
				if (uri) return uri;
			}
		}
	} catch {}
	return "mongodb://markoeltiger8_db_user:hvtPyW7XyWvo9c9y@ac-jhbcezo-shard-00-00.ul5d133.mongodb.net:27017,ac-jhbcezo-shard-00-01.ul5d133.mongodb.net:27017,ac-jhbcezo-shard-00-02.ul5d133.mongodb.net:27017/?ssl=true&replicaSet=atlas-fxnozm-shard-0&authSource=admin&appName=Cluster0";
}
var clientPromise = null;
function getClientPromise() {
	const uri = getMongoUri();
	if (!clientPromise) {
		const globalWithMongo = global;
		if (!globalWithMongo._mongoClientPromise) {
			console.log(`[mongo] Initializing MongoClient connection to MongoDB Atlas...`);
			globalWithMongo._mongoClientPromise = new import_lib.MongoClient(uri, { serverSelectionTimeoutMS: 1e4 }).connect();
		}
		clientPromise = globalWithMongo._mongoClientPromise;
	}
	return clientPromise;
}
async function getDb(dbName = "kotlin_edu") {
	return (await getClientPromise()).db(dbName);
}
/** Returns null instead of throwing when MongoDB is unavailable */
async function getDbSafe(dbName = "kotlin_edu") {
	try {
		return await getDb(dbName);
	} catch (err) {
		console.error("[mongo] Connection error:", err.message);
		return null;
	}
}
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
		console.log(`[api-data:resolveDataFilePath] Found ${filename} at ${c}`);
		return c;
	}
	return join(process.cwd(), "public/data", filename);
}
var getApiData_createServerFn_handler = createServerRpc({
	id: "8e06fae4a2d24719e6eea33c258187b27767656003397f7a7a1fa1015039e721",
	name: "getApiData",
	filename: "src/lib/api-data.ts"
}, (opts) => getApiData.__executeServer(opts));
var getApiData = createServerFn({ method: "GET" }).handler(getApiData_createServerFn_handler, async () => {
	try {
		const db = await getDbSafe();
		if (db) {
			let courses = await db.collection("courses_unified").find({}, { projection: { _id: 0 } }).toArray();
			if (!courses || courses.length === 0) courses = await db.collection("courses").find({}, { projection: { _id: 0 } }).toArray();
			let serp = await db.collection("serp_progress").find({}, { projection: { _id: 0 } }).toArray();
			if (!serp || serp.length === 0) serp = await db.collection("serp").find({}, { projection: { _id: 0 } }).toArray();
			let baseline = await db.collection("baseline").findOne({}, { projection: { _id: 0 } });
			return {
				courses,
				serp,
				baseline: baseline || null,
				insights: null,
				meta: { generated_at: (/* @__PURE__ */ new Date()).toISOString() }
			};
		}
	} catch (err) {
		console.error("[apiData] MongoDB query error:", err);
	}
	try {
		const coursesPath = resolveDataFilePath("courses_unified.json");
		const serpPath = resolveDataFilePath("serp_progress.json");
		const baselinePath = resolveDataFilePath("baseline_comparison.json");
		const insightsPath = resolveDataFilePath("insights.json");
		const coursesData = JSON.parse(readFileSync(coursesPath, "utf-8"));
		const serp = JSON.parse(readFileSync(serpPath, "utf-8"));
		let courses;
		let meta;
		if (Array.isArray(coursesData)) {
			courses = coursesData;
			meta = { generated_at: (/* @__PURE__ */ new Date()).toISOString() };
		} else {
			courses = coursesData.courses || [];
			meta = coursesData.meta || { generated_at: (/* @__PURE__ */ new Date()).toISOString() };
		}
		let baseline = null;
		try {
			baseline = JSON.parse(readFileSync(baselinePath, "utf-8"));
		} catch {}
		let insights = null;
		try {
			insights = JSON.parse(readFileSync(insightsPath, "utf-8"));
		} catch {}
		return {
			courses,
			serp,
			baseline,
			insights,
			meta
		};
	} catch (e) {
		console.error("[apiData] JSON fallback error:", e);
		return {
			courses: [],
			serp: [],
			baseline: null,
			insights: null,
			meta: { generated_at: (/* @__PURE__ */ new Date()).toISOString() }
		};
	}
});
var getProgramsData_createServerFn_handler = createServerRpc({
	id: "25563e268681f248459c0efe097541d0d9c953f66ca4f5ec0c8d6b769c2c1265",
	name: "getProgramsData",
	filename: "src/lib/api-data.ts"
}, (opts) => getProgramsData.__executeServer(opts));
var getProgramsData = createServerFn({ method: "GET" }).handler(getProgramsData_createServerFn_handler, async () => {
	let programs = [];
	let topics = null;
	try {
		const programsContent = readFileSync(resolveDataFilePath("programs.json"), "utf-8");
		programs = JSON.parse(programsContent);
	} catch (error) {
		console.error("[programs] failed to load programs.json:", error);
	}
	try {
		const topicsContent = readFileSync(resolveDataFilePath("topics.json"), "utf-8");
		topics = JSON.parse(topicsContent);
	} catch (error) {
		console.error("[programs] failed to load topics.json:", error);
	}
	return {
		programs,
		topics
	};
});
//#endregion
export { getApiData_createServerFn_handler, getProgramsData_createServerFn_handler };
