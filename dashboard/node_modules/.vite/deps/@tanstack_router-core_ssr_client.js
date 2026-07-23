import { o as createControlledPromise, t as isNotFound } from "./not-found-CX30VWWX.js";
//#region node_modules/cookie-es/dist/index.mjs
function splitSetCookieString(cookiesString) {
	if (Array.isArray(cookiesString)) return cookiesString.flatMap((c) => splitSetCookieString(c));
	if (typeof cookiesString !== "string") return [];
	const cookiesStrings = [];
	let pos = 0;
	let start;
	let ch;
	let lastComma;
	let nextStart;
	let cookiesSeparatorFound;
	const skipWhitespace = () => {
		while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) pos += 1;
		return pos < cookiesString.length;
	};
	const notSpecialChar = () => {
		ch = cookiesString.charAt(pos);
		return ch !== "=" && ch !== ";" && ch !== ",";
	};
	while (pos < cookiesString.length) {
		start = pos;
		cookiesSeparatorFound = false;
		while (skipWhitespace()) {
			ch = cookiesString.charAt(pos);
			if (ch === ",") {
				lastComma = pos;
				pos += 1;
				skipWhitespace();
				nextStart = pos;
				while (pos < cookiesString.length && notSpecialChar()) pos += 1;
				if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
					cookiesSeparatorFound = true;
					pos = nextStart;
					cookiesStrings.push(cookiesString.slice(start, lastComma));
					start = pos;
				} else pos = lastComma + 1;
			} else pos += 1;
		}
		if (!cookiesSeparatorFound || pos >= cookiesString.length) cookiesStrings.push(cookiesString.slice(start));
	}
	return cookiesStrings;
}
//#endregion
//#region node_modules/@tanstack/router-core/dist/esm/ssr/headers.js
function toHeadersInstance(init) {
	if (init instanceof Headers) return init;
	else if (Array.isArray(init)) return new Headers(init);
	else if (typeof init === "object") return new Headers(init);
	else return null;
}
function mergeHeaders(...headers) {
	return headers.reduce((acc, header) => {
		const headersInstance = toHeadersInstance(header);
		if (!headersInstance) return acc;
		for (const [key, value] of headersInstance.entries()) if (key === "set-cookie") splitSetCookieString(value).forEach((cookie) => acc.append("set-cookie", cookie));
		else acc.set(key, value);
		return acc;
	}, new Headers());
}
//#endregion
//#region node_modules/@tanstack/router-core/dist/esm/ssr/json.js
/**
* @deprecated Use [`Response.json`](https://developer.mozilla.org/en-US/docs/Web/API/Response/json_static) from the standard Web API directly.
*/
function json(payload, init) {
	return Response.json(payload, init);
}
//#endregion
//#region node_modules/@tanstack/router-core/dist/esm/ssr/ssr-match-id.js
function hydrateSsrMatchId(id) {
	return id.replaceAll("\0", "/").replaceAll("�", "/");
}
//#endregion
//#region node_modules/@tanstack/router-core/dist/esm/ssr/ssr-client.js
function hydrateMatch(match, deyhydratedMatch) {
	match.id = deyhydratedMatch.i;
	match.__beforeLoadContext = deyhydratedMatch.b;
	match.loaderData = deyhydratedMatch.l;
	match.status = deyhydratedMatch.s;
	match.ssr = deyhydratedMatch.ssr;
	match.updatedAt = deyhydratedMatch.u;
	match.error = deyhydratedMatch.e;
	if (deyhydratedMatch.g !== void 0) match.globalNotFound = deyhydratedMatch.g;
}
async function hydrate(router) {
	if (!window.$_TSR) throw new Error("Invariant failed: Expected to find bootstrap data on window.$_TSR, but we did not. Please file an issue!");
	const serializationAdapters = router.options.serializationAdapters;
	if (serializationAdapters?.length) {
		const fromSerializableMap = /* @__PURE__ */ new Map();
		serializationAdapters.forEach((adapter) => {
			fromSerializableMap.set(adapter.key, adapter.fromSerializable);
		});
		window.$_TSR.t = fromSerializableMap;
		window.$_TSR.buffer.forEach((script) => script());
	}
	window.$_TSR.initialized = true;
	if (!window.$_TSR.router) throw new Error("Invariant failed: Expected to find a dehydrated data on window.$_TSR.router, but we did not. Please file an issue!");
	const dehydratedRouter = window.$_TSR.router;
	dehydratedRouter.matches.forEach((dehydratedMatch) => {
		dehydratedMatch.i = hydrateSsrMatchId(dehydratedMatch.i);
	});
	if (dehydratedRouter.lastMatchId) dehydratedRouter.lastMatchId = hydrateSsrMatchId(dehydratedRouter.lastMatchId);
	const { manifest, dehydratedData, lastMatchId } = dehydratedRouter;
	router.ssr = { manifest };
	const nonce = document.querySelector("meta[property=\"csp-nonce\"]")?.content;
	router.options.ssr = { nonce };
	await router.options.hydrate?.(dehydratedData);
	const matches = router.matchRoutes(router.stores.location.get());
	const routeChunkPromise = Promise.all(matches.map((match) => router.loadRouteChunk(router.looseRoutesById[match.routeId])));
	function setMatchForcePending(match) {
		const pendingMinMs = router.looseRoutesById[match.routeId].options.pendingMinMs ?? router.options.defaultPendingMinMs;
		if (pendingMinMs) {
			const minPendingPromise = createControlledPromise();
			match._nonReactive.minPendingPromise = minPendingPromise;
			match._forcePending = true;
			setTimeout(() => {
				minPendingPromise.resolve();
				router.updateMatch(match.id, (prev) => {
					prev._nonReactive.minPendingPromise = void 0;
					return {
						...prev,
						_forcePending: void 0
					};
				});
			}, pendingMinMs);
		}
	}
	function setRouteSsr(match) {
		const route = router.looseRoutesById[match.routeId];
		if (route) route.options.ssr = match.ssr;
	}
	let firstNonSsrMatchIndex = void 0;
	matches.forEach((match) => {
		const dehydratedMatch = dehydratedRouter.matches.find((d) => d.i === match.id);
		if (!dehydratedMatch) {
			match._nonReactive.dehydrated = false;
			match.ssr = false;
			setRouteSsr(match);
			return;
		}
		hydrateMatch(match, dehydratedMatch);
		setRouteSsr(match);
		match._nonReactive.dehydrated = match.ssr !== false;
		if (match.ssr === "data-only" || match.ssr === false) {
			if (firstNonSsrMatchIndex === void 0) {
				firstNonSsrMatchIndex = match.index;
				setMatchForcePending(match);
			}
		}
	});
	router.stores.setMatches(matches);
	const activeMatches = router.stores.matches.get();
	const location = router.stores.location.get();
	await Promise.all(activeMatches.map(async (match) => {
		try {
			const route = router.looseRoutesById[match.routeId];
			const parentContext = activeMatches[match.index - 1]?.context ?? router.options.context;
			if (route.options.context) {
				const contextFnContext = {
					deps: match.loaderDeps,
					params: match.params,
					context: parentContext ?? {},
					location,
					navigate: (opts) => router.navigate({
						...opts,
						_fromLocation: location
					}),
					buildLocation: router.buildLocation,
					cause: match.cause,
					abortController: match.abortController,
					preload: false,
					matches,
					routeId: route.id
				};
				match.__routeContext = route.options.context(contextFnContext) ?? void 0;
			}
			match.context = {
				...parentContext,
				...match.__routeContext,
				...match.__beforeLoadContext
			};
			const assetContext = {
				ssr: router.options.ssr,
				matches: activeMatches,
				match,
				params: match.params,
				loaderData: match.loaderData
			};
			const headFnContent = await route.options.head?.(assetContext);
			const scripts = await route.options.scripts?.(assetContext);
			match.meta = headFnContent?.meta;
			match.links = headFnContent?.links;
			match.headScripts = headFnContent?.scripts;
			match.styles = headFnContent?.styles;
			match.scripts = scripts;
		} catch (err) {
			if (isNotFound(err)) {
				match.error = { isNotFound: true };
				console.error(`NotFound error during hydration for routeId: ${match.routeId}`, err);
			} else {
				match.error = err;
				console.error(`Error during hydration for route ${match.routeId}:`, err);
				throw err;
			}
		}
	}));
	const isSpaMode = matches[matches.length - 1].id !== lastMatchId;
	if (!matches.some((m) => m.ssr === false) && !isSpaMode) {
		matches.forEach((match) => {
			match._nonReactive.dehydrated = void 0;
		});
		router.stores.resolvedLocation.set(router.stores.location.get());
		return routeChunkPromise;
	}
	const loadPromise = Promise.resolve().then(() => router.load()).catch((err) => {
		console.error("Error during router hydration:", err);
	});
	if (isSpaMode) {
		const match = matches[1];
		if (!match) throw new Error("Invariant failed: Expected to find a match below the root match in SPA mode.");
		setMatchForcePending(match);
		match._displayPending = true;
		match._nonReactive.displayPendingPromise = loadPromise;
		loadPromise.then(() => {
			router.batch(() => {
				if (router.stores.status.get() === "pending") {
					router.stores.status.set("idle");
					router.stores.resolvedLocation.set(router.stores.location.get());
				}
				router.updateMatch(match.id, (prev) => ({
					...prev,
					_displayPending: void 0,
					displayPendingPromise: void 0
				}));
			});
		});
	}
	return routeChunkPromise;
}
//#endregion
export { hydrate, json, mergeHeaders };
