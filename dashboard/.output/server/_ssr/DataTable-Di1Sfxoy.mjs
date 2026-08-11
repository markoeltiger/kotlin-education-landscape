import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { d as fmt, u as classNames } from "./Charts-Cg3e7Nay.mjs";
import { t as useVirtualizer } from "../_libs/@tanstack/react-virtual+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/DataTable-Di1Sfxoy.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function toCsv(rows, columns) {
	const esc = (v) => {
		if (v == null) return "";
		const s = String(v);
		if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, "\"\"")}"`;
		return s;
	};
	const head = columns.map((c) => esc(c)).join(",");
	const body = rows.map((r) => columns.map((c) => esc(r[c])).join(",")).join("\n");
	return head + "\n" + body;
}
function downloadCsv(filename, csv) {
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
var COLS = [
	{
		key: "title",
		label: "Title",
		w: "minmax(200px,2fr)"
	},
	{
		key: "source",
		label: "Source",
		w: "90px"
	},
	{
		key: "signal_tier",
		label: "Tier",
		w: "90px"
	},
	{
		key: "learning_type",
		label: "Learning",
		w: "90px"
	},
	{
		key: "provider",
		label: "Provider",
		w: "minmax(140px,1fr)"
	},
	{
		key: "country",
		label: "Country",
		w: "130px"
	},
	{
		key: "subtype",
		label: "Subtype",
		w: "120px"
	},
	{
		key: "popularity",
		label: "Popularity",
		w: "90px",
		align: "right"
	},
	{
		key: "kotlin_confidence",
		label: "Conf.",
		w: "70px",
		align: "right"
	}
];
function DataTable({ rows, data }) {
	const actualRows = rows ?? data ?? [];
	const [isMounted, setIsMounted] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setIsMounted(true);
	}, []);
	const [sortKey, setSortKey] = (0, import_react.useState)("popularity");
	const [dir, setDir] = (0, import_react.useState)("desc");
	const [headerScroll, setHeaderScroll] = (0, import_react.useState)(0);
	const sorted = (0, import_react.useMemo)(() => {
		if (!actualRows || !Array.isArray(actualRows)) return [];
		const arr = actualRows.slice();
		arr.sort((a, b) => {
			if (!a || !b) return 0;
			const av = a[sortKey];
			const bv = b[sortKey];
			if (typeof av === "number" && typeof bv === "number") return dir === "asc" ? av - bv : bv - av;
			const as = String(av ?? "");
			const bs = String(bv ?? "");
			return dir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
		});
		return arr;
	}, [
		actualRows,
		sortKey,
		dir
	]);
	const parentRef = (0, import_react.useRef)(null);
	const virt = useVirtualizer(isMounted ? {
		count: sorted.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 40,
		overscan: 12
	} : {
		count: 0,
		getScrollElement: () => null,
		estimateSize: () => 40
	});
	if (!isMounted) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col min-w-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mono text-xs text-muted-foreground tabular-nums mb-3",
			children: [fmt(actualRows.length), " rows — loading table…"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "border border-line rounded-md overflow-hidden",
			style: { height: "min(520px, 60vh)" },
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center justify-center h-full text-sm text-muted-foreground",
				children: "Loading…"
			})
		})]
	});
	const gridTemplate = COLS.map((c) => c.w).join(" ");
	const onSort = (k) => {
		if (k === sortKey) setDir((d) => d === "asc" ? "desc" : "asc");
		else {
			setSortKey(k);
			setDir("desc");
		}
	};
	const exportCsv = () => {
		const csv = toCsv(sorted, COLS.map((c) => c.key));
		downloadCsv(`kotlin-edu-${sorted.length}-rows.csv`, csv);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col min-w-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between mb-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mono text-xs text-muted-foreground tabular-nums",
				children: [fmt(sorted.length), " rows"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: exportCsv,
				className: "mono text-[11px] uppercase tracking-[0.16em] px-3 py-1.5 rounded-md border border-line text-ink hover:border-[color:var(--kt-purple)] hover:text-[color:var(--kt-purple)] transition-colors",
				children: "Export CSV"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "border border-line rounded-md overflow-hidden",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: parentRef,
				className: "overflow-auto",
				style: { height: "min(520px, 60vh)" },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: { minWidth: `${COLS.reduce((acc, c) => {
						const m = c.w.match(/(\d+)px/);
						return acc + (m ? parseInt(m[1]) : 90);
					}, 0)}px` },
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid bg-panel-2 border-b border-line sticky top-0 z-10",
						style: { gridTemplateColumns: gridTemplate },
						children: COLS.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => onSort(c.key),
							className: classNames("px-3 py-2 mono text-[10px] uppercase tracking-[0.16em] text-left hover:text-ink transition-colors", sortKey === c.key ? "text-ink" : "text-muted-foreground", c.align === "right" && "text-right"),
							children: [c.label, sortKey === c.key && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ml-1",
								children: dir === "asc" ? "↑" : "↓"
							})]
						}, String(c.key)))
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							height: virt.getTotalSize(),
							position: "relative"
						},
						children: virt.getVirtualItems().map((vi) => {
							const r = sorted[vi.index];
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid absolute left-0 right-0 border-b border-line hover:bg-panel-2/60 transition-colors",
								style: {
									transform: `translateY(${vi.start}px)`,
									height: vi.size,
									gridTemplateColumns: gridTemplate
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: r.url,
										target: "_blank",
										rel: "noreferrer",
										className: "text-ink hover:text-[color:var(--kt-purple)] truncate block",
										title: r.title,
										children: r.title
									}) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, {
										mono: true,
										muted: true,
										children: r.source
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										tier: r.signal_tier,
										children: r.signal_tier
									}) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, {
										mono: true,
										muted: true,
										children: r.learning_type === "informal" ? "non-formal" : r.learning_type
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, {
										mono: true,
										children: r.provider
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, {
										mono: true,
										muted: true,
										children: r.country || "—"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, {
										mono: true,
										muted: true,
										children: r.subtype || "—"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, {
										mono: true,
										align: "right",
										children: fmt(r.popularity)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, {
										mono: true,
										align: "right",
										children: r.kotlin_confidence.toFixed(2)
									})
								]
							}, vi.key);
						})
					})]
				})
			})
		})]
	});
}
function Cell({ children, mono, muted, align }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: classNames("px-3 py-2 text-[12px] flex items-center min-w-0", mono && "mono", muted ? "text-muted-foreground" : "text-ink", align === "right" && "justify-end tabular-nums"),
		style: {
			textOverflow: "ellipsis",
			whiteSpace: "nowrap",
			overflow: "hidden"
		},
		children
	});
}
function Badge({ tier, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: classNames("mono text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded", tier === "primary" ? "bg-[color:var(--kt-purple)]/20 text-[color:var(--kt-purple)]" : "bg-panel-2 text-muted-foreground border border-line"),
		children
	});
}
//#endregion
export { DataTable };
