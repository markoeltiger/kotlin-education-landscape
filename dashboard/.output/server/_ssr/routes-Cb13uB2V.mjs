import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { i as max } from "../_libs/d3-array.mjs";
import { t as log } from "../_libs/d3-scale+internmap.mjs";
import { m as select_default, t as zoom_default } from "../_libs/d3+[...].mjs";
import { t as hcl_default } from "../_libs/d3-interpolate.mjs";
import { n as path_default, r as graticule10, t as naturalEarth1_default } from "../_libs/d3-geo.mjs";
import { a as Histogram, c as Panel, d as fmt, f as useResizeObserver, i as GitHubRepoBars, l as StackedBars, o as HorizontalBars, r as Funnel, s as MoocCourseTable, t as Donut, u as classNames } from "./Charts-Cg3e7Nay.mjs";
import { a as DialogOverlay, c as DialogTrigger, i as DialogDescription, n as DialogClose, o as DialogPortal, r as DialogContent, s as DialogTitle, t as Dialog } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { t as Route } from "./routes-B0tX_-u8.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as X } from "../_libs/lucide-react.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as feature_default } from "../_libs/topojson-client.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Cb13uB2V.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var emptyFilters = {
	sources: [],
	tiers: [],
	learning_types: [],
	countries: [],
	conf_min: 0,
	conf_max: 1,
	search: ""
};
function applyFilters(courses, f) {
	const q = f.search.trim().toLowerCase();
	const csSet = new Set(f.countries);
	const srcSet = new Set(f.sources);
	const tSet = new Set(f.tiers);
	const lSet = new Set(f.learning_types);
	return courses.filter((r) => {
		if (srcSet.size && !srcSet.has(r.source)) return false;
		if (tSet.size && !tSet.has(r.signal_tier)) return false;
		if (lSet.size && !lSet.has(r.learning_type)) return false;
		if (csSet.size && !csSet.has(r.country)) return false;
		if (r.kotlin_confidence < f.conf_min || r.kotlin_confidence > f.conf_max) return false;
		if (q) {
			if (!`${r.title} ${r.provider} ${r.country}`.toLowerCase().includes(q)) return false;
		}
		return true;
	});
}
function groupBy(rows, key) {
	const m = /* @__PURE__ */ new Map();
	for (const r of rows) {
		const k = key(r);
		m.set(k, (m.get(k) ?? 0) + 1);
	}
	return m;
}
function topN(m, n, dropEmpty = true) {
	const arr = Array.from(m.entries()).filter(([k]) => {
		if (!dropEmpty) return true;
		const keyStr = String(k);
		return keyStr && keyStr.trim().length > 0;
	});
	arr.sort((a, b) => b[1] - a[1]);
	return arr.slice(0, n);
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var Sheet = Dialog;
var SheetTrigger = DialogTrigger;
var SheetPortal = DialogPortal;
var SheetOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}));
SheetOverlay.displayName = DialogOverlay.displayName;
var sheetVariants = cva("fixed z-50 gap-4 bg-panel p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out", {
	variants: { side: {
		top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
		bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
		left: "inset-y-0 left-0 h-full w-[90%] sm:w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
		right: "inset-y-0 right-0 h-full w-[90%] sm:w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
	} },
	defaultVariants: { side: "right" }
});
var SheetContent = import_react.forwardRef(({ side = "right", className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
	ref,
	className: cn(sheetVariants({ side }), className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "Close"
		})]
	}), children]
})] }));
SheetContent.displayName = DialogContent.displayName;
var SheetHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
});
SheetHeader.displayName = "SheetHeader";
var SheetFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
SheetFooter.displayName = "SheetFooter";
var SheetTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
	ref,
	className: cn("text-lg font-semibold text-foreground", className),
	...props
}));
SheetTitle.displayName = DialogTitle.displayName;
var SheetDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
SheetDescription.displayName = DialogDescription.displayName;
var TIERS = ["primary", "secondary"];
var LEARNING = ["formal", "informal"];
/** Display-friendly labels for raw data values */
var TIER_LABELS = {
	primary: "Primary",
	secondary: "Secondary"
};
var LEARNING_LABELS = {
	formal: "Formal",
	informal: "Non-formal"
};
var SOURCE_LABELS = {
	university_website: "University",
	github: "GitHub",
	stepik: "Stepik",
	coursera: "Coursera"
};
/**
* A chip is "active" when:
* - The filter array is empty (= all values allowed, i.e. no restriction)
* - OR the specific value is present in the filter array
*
* This way, on first load with no URL params, all chips appear highlighted,
* correctly communicating "everything is shown".
*/
function isActive(arr, value) {
	return arr.length === 0 || arr.includes(value);
}
function FilterRail({ filters, setFilters, sources, countries, filteredCount, totalCount }) {
	const [countryQuery, setCountryQuery] = (0, import_react.useState)("");
	const [mobileOpen, setMobileOpen] = (0, import_react.useState)(false);
	const filteredCountries = (0, import_react.useMemo)(() => {
		const q = countryQuery.trim().toLowerCase();
		const base = countries.filter((c) => c);
		if (!q) return base.slice(0, 60);
		return base.filter((c) => c.toLowerCase().includes(q)).slice(0, 60);
	}, [countries, countryQuery]);
	const toggle = (key, v) => setFilters((prev) => {
		const cur = prev[key] ?? [];
		if (cur.length === 0) {
			const allValues = key === "tiers" ? TIERS : key === "learning_types" ? LEARNING : key === "sources" ? sources : [];
			return {
				...prev,
				[key]: allValues.filter((x) => x !== v)
			};
		}
		const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
		return {
			...prev,
			[key]: next
		};
	});
	const filterContent = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4 sm:gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "eyebrow",
				children: "Filters"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 mono text-sm tabular-nums text-ink",
				children: [fmt(filteredCount), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-muted-foreground",
					children: [
						" / ",
						fmt(totalCount),
						" records"
					]
				})]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
				label: "Search",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "text",
					value: filters.search,
					onChange: (e) => setFilters((p) => ({
						...p,
						search: e.target.value
					})),
					placeholder: "title, provider, country…",
					className: "mono w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:border-[color:var(--kt-purple)] transition-colors"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
				label: "Signal tier",
				tooltip: "Primary: Kotlin is the main language taught. Secondary: Kotlin is mentioned as part of a broader course or resource.",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleRow, { children: TIERS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					active: isActive(filters.tiers, t),
					onClick: () => toggle("tiers", t),
					children: TIER_LABELS[t] ?? t
				}, t)) })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
				label: "Learning type",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleRow, { children: LEARNING.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					active: isActive(filters.learning_types, l),
					onClick: () => toggle("learning_types", l),
					children: LEARNING_LABELS[l] ?? l
				}, l)) })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
				label: "Source",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleRow, { children: sources.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					active: isActive(filters.sources, s),
					onClick: () => toggle("sources", s),
					children: SOURCE_LABELS[s] ?? s
				}, s)) })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
				label: `Kotlin confidence · ${filters.conf_min.toFixed(2)}–${filters.conf_max.toFixed(2)}`,
				tooltip: "A classifier score (0–1) indicating how likely this record is genuinely Kotlin-focused. 1.0 = near-certain Kotlin content.",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-1 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mono text-[10px] text-muted-foreground",
							children: "Min"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							min: 0,
							max: 1,
							step: .05,
							value: filters.conf_min,
							onChange: (e) => setFilters((p) => ({
								...p,
								conf_min: Math.min(Number(e.target.value), p.conf_max)
							})),
							className: "mono w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-[color:var(--kt-purple)] transition-colors"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-1 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mono text-[10px] text-muted-foreground",
							children: "Max"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							min: 0,
							max: 1,
							step: .05,
							value: filters.conf_max,
							onChange: (e) => setFilters((p) => ({
								...p,
								conf_max: Math.max(Number(e.target.value), p.conf_min)
							})),
							className: "mono w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-[color:var(--kt-purple)] transition-colors"
						})]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Group, {
				label: `Country${filters.countries.length ? ` · ${filters.countries.length} picked` : ""}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mono text-[10px] text-muted-foreground mb-1.5",
						children: "Map and table filtering applies to universities only."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "text",
						value: countryQuery,
						onChange: (e) => setCountryQuery(e.target.value),
						placeholder: "filter countries…",
						className: "mono w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-xs text-ink placeholder:text-muted-foreground focus:outline-none focus:border-[color:var(--kt-purple)] mb-2"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "max-h-40 sm:max-h-56 overflow-y-auto flex flex-col",
						children: filteredCountries.map((c) => {
							const active = filters.countries.includes(c);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => toggle("countries", c),
								className: classNames("text-left mono text-xs px-2 py-1 rounded-md transition-colors", active ? "bg-[color:var(--kt-purple)]/20 text-ink" : "text-muted-foreground hover:text-ink hover:bg-panel-2"),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "inline-block w-3",
										children: active ? "×" : ""
									}),
									" ",
									c
								]
							}, c);
						})
					})
				]
			})
		]
	});
	const mobileFilterContent = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4 pb-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "eyebrow",
				children: "Filters"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 mono text-sm tabular-nums text-ink",
				children: [fmt(filteredCount), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-muted-foreground",
					children: [
						" / ",
						fmt(totalCount),
						" records"
					]
				})]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
				label: "Search",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "text",
					value: filters.search,
					onChange: (e) => setFilters((p) => ({
						...p,
						search: e.target.value
					})),
					placeholder: "title, provider, country…",
					className: "mono w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:border-[color:var(--kt-purple)] transition-colors"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
				label: "Signal tier",
				tooltip: "Primary: Kotlin is the main language taught. Secondary: Kotlin is mentioned as part of a broader course or resource.",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleRow, { children: TIERS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					active: isActive(filters.tiers, t),
					onClick: () => toggle("tiers", t),
					children: TIER_LABELS[t] ?? t
				}, t)) })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
				label: "Learning type",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleRow, { children: LEARNING.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					active: isActive(filters.learning_types, l),
					onClick: () => toggle("learning_types", l),
					children: LEARNING_LABELS[l] ?? l
				}, l)) })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
				label: "Source",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleRow, { children: sources.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
					active: isActive(filters.sources, s),
					onClick: () => toggle("sources", s),
					children: SOURCE_LABELS[s] ?? s
				}, s)) })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
				label: `Kotlin confidence · ${filters.conf_min.toFixed(2)}–${filters.conf_max.toFixed(2)}`,
				tooltip: "A classifier score (0–1) indicating how likely this record is genuinely Kotlin-focused.",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-1 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mono text-[10px] text-muted-foreground",
							children: "Min"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							min: 0,
							max: 1,
							step: .05,
							value: filters.conf_min,
							onChange: (e) => setFilters((p) => ({
								...p,
								conf_min: Math.min(Number(e.target.value), p.conf_max)
							})),
							className: "mono w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-[color:var(--kt-purple)] transition-colors"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-1 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mono text-[10px] text-muted-foreground",
							children: "Max"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							min: 0,
							max: 1,
							step: .05,
							value: filters.conf_max,
							onChange: (e) => setFilters((p) => ({
								...p,
								conf_max: Math.max(Number(e.target.value), p.conf_min)
							})),
							className: "mono w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-[color:var(--kt-purple)] transition-colors"
						})]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Group, {
				label: `Country${filters.countries.length ? ` · ${filters.countries.length} picked` : ""}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mono text-[10px] text-muted-foreground mb-1.5",
						children: "Map and table filtering applies to universities only."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "text",
						value: countryQuery,
						onChange: (e) => setCountryQuery(e.target.value),
						placeholder: "filter countries…",
						className: "mono w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-xs text-ink placeholder:text-muted-foreground focus:outline-none focus:border-[color:var(--kt-purple)] mb-2"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "max-h-60 overflow-y-auto flex flex-col",
						children: filteredCountries.map((c) => {
							const active = filters.countries.includes(c);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => toggle("countries", c),
								className: classNames("text-left mono text-xs px-2 py-1 rounded-md transition-colors", active ? "bg-[color:var(--kt-purple)]/20 text-ink" : "text-muted-foreground hover:text-ink hover:bg-panel-2"),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "inline-block w-3",
										children: active ? "×" : ""
									}),
									" ",
									c
								]
							}, c);
						})
					})
				]
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "lg:hidden mb-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
			open: mobileOpen,
			onOpenChange: setMobileOpen,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetTrigger, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: "panel w-full px-4 py-3 flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "eyebrow",
							children: "Filters"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "mono text-sm tabular-nums text-ink",
							children: [fmt(filteredCount), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-muted-foreground",
								children: [" / ", fmt(totalCount)]
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted-foreground text-xl",
						children: "☰"
					})]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetContent, {
				side: "left",
				className: "w-[90%] sm:w-[350px] overflow-y-auto p-4 sm:p-6",
				children: mobileFilterContent
			})]
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
		className: "hidden lg:block panel p-4 sm:p-5 flex flex-col gap-4 sm:gap-6 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto lg:max-h-none lg:overflow-visible",
		children: filterContent
	})] });
}
function Group({ label, tooltip, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-1.5 sm:gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "eyebrow text-[10px] sm:text-[11px] flex items-center gap-1",
			children: [label, tooltip && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				title: tooltip,
				className: "inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-line text-muted-foreground cursor-help text-[9px] leading-none",
				style: {
					fontFamily: "serif",
					fontStyle: "italic"
				},
				children: "i"
			})]
		}), children]
	});
}
function ToggleRow({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex flex-wrap gap-1.5",
		children
	});
}
function Chip({ active, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		onClick,
		className: classNames("mono text-[11px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-md border transition-colors", active ? "bg-[color:var(--kt-purple)] text-white border-transparent" : "border-line text-muted-foreground hover:text-ink hover:border-[color:var(--kt-purple)]"),
		children
	});
}
function ActiveFilters({ filters, setFilters }) {
	const chips = [];
	filters.sources.forEach((s) => chips.push({
		label: `source: ${SOURCE_LABELS[s] ?? s}`,
		onRemove: () => setFilters((p) => ({
			...p,
			sources: p.sources.filter((x) => x !== s)
		}))
	}));
	filters.tiers.forEach((s) => chips.push({
		label: `tier: ${TIER_LABELS[s] ?? s}`,
		onRemove: () => setFilters((p) => ({
			...p,
			tiers: p.tiers.filter((x) => x !== s)
		}))
	}));
	filters.learning_types.forEach((s) => chips.push({
		label: LEARNING_LABELS[s] ?? s,
		onRemove: () => setFilters((p) => ({
			...p,
			learning_types: p.learning_types.filter((x) => x !== s)
		}))
	}));
	filters.countries.forEach((s) => chips.push({
		label: s,
		onRemove: () => setFilters((p) => ({
			...p,
			countries: p.countries.filter((x) => x !== s)
		}))
	}));
	if (filters.conf_min > 0 || filters.conf_max < 1) chips.push({
		label: `conf ${filters.conf_min.toFixed(2)}–${filters.conf_max.toFixed(2)}`,
		onRemove: () => setFilters((p) => ({
			...p,
			conf_min: 0,
			conf_max: 1
		}))
	});
	if (filters.search) chips.push({
		label: `"${filters.search}"`,
		onRemove: () => setFilters((p) => ({
			...p,
			search: ""
		}))
	});
	if (!chips.length) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap items-center gap-1 sm:gap-1.5",
		children: [chips.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			onClick: c.onRemove,
			className: "mono text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-1 rounded-md border border-line text-muted-foreground hover:text-ink hover:border-[color:var(--kt-magenta)] transition-colors",
			children: [c.label, " ×"]
		}, i)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			onClick: () => setFilters((p) => ({
				...p,
				sources: [],
				tiers: [],
				learning_types: [],
				countries: [],
				conf_min: 0,
				conf_max: 1,
				search: ""
			})),
			className: "mono text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-1 rounded-md bg-[color:var(--kt-orange)]/15 text-[color:var(--kt-orange)] hover:bg-[color:var(--kt-orange)]/25",
			children: "clear all"
		})]
	});
}
function CountUp({ value, duration = 900 }) {
	const [n, setN] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		let raf = 0;
		const start = performance.now();
		const from = 0;
		const tick = (t) => {
			const p = Math.min(1, (t - start) / duration);
			const eased = 1 - Math.pow(1 - p, 3);
			setN(Math.round(from + (value - from) * eased));
			if (p < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [value, duration]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: fmt(n) });
}
function StatCards({ totals }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3",
		children: [
			{
				label: "Total records",
				value: totals.total
			},
			{
				label: "Universities",
				value: totals.universities
			},
			{
				label: "Countries",
				value: totals.countries
			},
			{
				label: "Primary signal",
				value: totals.primary,
				secondary: totals.secondary,
				isPrimary: true,
				accent: "var(--kt-purple)"
			},
			{
				label: "GitHub repos",
				value: totals.github
			},
			{
				label: "MOOC courses",
				value: totals.mooc
			}
		].map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "panel relative overflow-hidden p-3 sm:p-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute left-0 top-0 bottom-0 w-[3px]",
					style: { background: it.accent ? it.accent : "var(--gradient-kotlin-135)" }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "eyebrow text-[10px] sm:text-[11px]",
					children: it.label
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mono mt-1 sm:mt-2 text-xl sm:text-3xl font-bold tabular-nums text-ink",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CountUp, { value: it.value })
				}),
				it.isPrimary && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-1.5 sm:mt-2 flex flex-col gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-1 self-start mono text-[9px] sm:text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded",
						style: {
							background: "color-mix(in srgb, var(--kt-purple) 20%, transparent)",
							color: "var(--kt-purple)",
							border: "1px solid color-mix(in srgb, var(--kt-purple) 35%, transparent)"
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "inline-block w-1.5 h-1.5 rounded-full animate-pulse",
							style: { background: "var(--kt-purple)" }
						}), "primary"]
					}), it.secondary !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "mono text-[10px] sm:text-[11px] tabular-nums text-muted-foreground",
						children: [
							"+ ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CountUp, { value: it.secondary }),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[9px] sm:text-[10px]",
								children: "secondary"
							})
						]
					})]
				})
			]
		}, it.label))
	});
}
var COUNTRY_ALIASES = {
	"United States": "United States of America",
	"USA": "United States of America",
	"US": "United States of America",
	"Russia": "Russia",
	"Russian Federation": "Russia",
	"Czech Republic": "Czechia",
	"Czechia": "Czechia",
	"Serbia": "Republic of Serbia",
	"Tanzania": "United Republic of Tanzania",
	"Bosnia and Herzegovina": "Bosnia and Herz.",
	"Dominican Republic": "Dominican Rep.",
	"South Korea": "South Korea",
	"Korea, Republic of": "South Korea",
	"North Korea": "North Korea",
	"Congo": "Republic of the Congo",
	"Democratic Republic of the Congo": "Dem. Rep. Congo",
	"Cote d'Ivoire": "Ivory Coast",
	"Côte d'Ivoire": "Ivory Coast",
	"Central African Republic": "Central African Rep.",
	"South Sudan": "S. Sudan",
	"Equatorial Guinea": "Eq. Guinea",
	"eSwatini": "eSwatini",
	"Swaziland": "eSwatini",
	"Myanmar": "Myanmar",
	"Burma": "Myanmar",
	"Laos": "Laos",
	"Vietnam": "Vietnam",
	"Syria": "Syria",
	"Iran": "Iran",
	"Palestine": "Palestine",
	"Taiwan": "Taiwan",
	"United Kingdom": "United Kingdom",
	"UK": "United Kingdom",
	"Macedonia": "North Macedonia",
	"North Macedonia": "North Macedonia"
};
function aliasCountry(name) {
	return COUNTRY_ALIASES[name] ?? name;
}
var WORLD_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
var worldPromise = null;
function loadWorld() {
	if (!worldPromise) worldPromise = fetch(WORLD_URL).then((r) => r.json()).then((topo) => feature_default(topo, topo.objects.countries));
	return worldPromise;
}
function WorldMap({ countryCounts, activeCountries, onToggleCountry }) {
	const { ref, width } = useResizeObserver();
	const svgRef = (0, import_react.useRef)(null);
	const [world, setWorld] = (0, import_react.useState)(null);
	const [tip, setTip] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		loadWorld().then(setWorld).catch((e) => console.warn("world atlas load failed", e));
	}, []);
	const aliased = (0, import_react.useMemo)(() => {
		const m = /* @__PURE__ */ new Map();
		for (const [k, v] of countryCounts) {
			if (!k) continue;
			m.set(aliasCountry(k), (m.get(aliasCountry(k)) ?? 0) + v);
		}
		return m;
	}, [countryCounts]);
	const activeSet = (0, import_react.useMemo)(() => new Set(activeCountries.map(aliasCountry)), [activeCountries]);
	const height = width < 480 ? 250 : width < 640 ? 300 : width < 1024 ? 380 : 460;
	(0, import_react.useEffect)(() => {
		if (!world || !svgRef.current || !width) return;
		const svg = select_default(svgRef.current);
		svg.selectAll("*").remove();
		const path = path_default(naturalEarth1_default().fitSize([width, height], world));
		const max$1 = max(Array.from(aliased.values())) ?? 1;
		const color = log().domain([1, Math.max(2, max$1)]).range(["#241F36", "#C711E1"]).interpolate(hcl_default).clamp(true);
		const g = svg.append("g");
		const zoom = zoom_default().scaleExtent([1, 8]).on("zoom", (event) => g.attr("transform", event.transform.toString()));
		svg.call(zoom);
		const graticule = graticule10();
		g.append("path").datum(graticule).attr("d", path).attr("fill", "none").attr("stroke", "#2A2B30").attr("stroke-width", .5);
		const unmatched = [];
		g.selectAll("path.country").data(world.features).enter().append("path").attr("class", "country").attr("d", path).attr("fill", (d) => {
			const v = aliased.get(d.properties.name);
			if (!v) return "#1F2024";
			return color(v);
		}).attr("stroke", (d) => activeSet.has(d.properties.name) ? "#F5F5F7" : "#141418").attr("stroke-width", (d) => activeSet.has(d.properties.name) ? 1.2 : .5).style("cursor", "pointer").on("mousemove", (event, d) => {
			const name = d.properties.name;
			const v = aliased.get(name) ?? 0;
			const rect = svgRef.current.getBoundingClientRect();
			setTip({
				x: event.clientX - rect.left,
				y: event.clientY - rect.top,
				name,
				value: v
			});
		}).on("mouseleave", () => setTip(null)).on("click", (_e, d) => {
			const aliasedName = d.properties.name;
			for (const [orig] of countryCounts) if (aliasCountry(orig) === aliasedName) {
				onToggleCountry(orig);
				return;
			}
			onToggleCountry(aliasedName);
		});
		for (const [k] of countryCounts) {
			if (!k) continue;
			const a = aliasCountry(k);
			if (!world.features.some((f) => f.properties.name === a)) unmatched.push(k);
		}
		if (unmatched.length) console.warn("[WorldMap] unmatched country names:", unmatched);
	}, [
		world,
		width,
		aliased,
		activeSet,
		countryCounts,
		onToggleCountry
	]);
	const max$2 = max(Array.from(aliased.values())) ?? 1;
	const legendStops = [
		1,
		Math.max(2, Math.round(max$2 / 50)),
		Math.max(5, Math.round(max$2 / 10)),
		Math.max(10, Math.round(max$2 / 3)),
		max$2
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref,
		className: "relative w-full",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
				ref: svgRef,
				width: width || 800,
				height,
				className: "block"
			}),
			tip && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-none absolute z-10 panel px-3 py-2 mono text-xs",
				style: {
					left: tip.x + 12,
					top: tip.y + 12,
					background: "#19191C"
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-ink",
						children: tip.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-muted-foreground",
						children: tip.value ? `${fmt(tip.value)} universities` : "no data"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[10px] text-muted-foreground mt-0.5",
						children: "click to filter"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 sm:mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "eyebrow text-[10px] sm:text-[11px]",
						children: "Universities · log scale"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-2 w-full sm:flex-1 rounded-sm",
						style: { background: "linear-gradient(90deg, #241F36 0%, #4B2E8A 40%, #7F52FF 70%, #C711E1 100%)" }
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mono text-[10px] sm:text-[11px] tabular-nums text-muted-foreground flex gap-2 sm:gap-3",
						children: legendStops.map((v, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: fmt(v) }, i))
					})
				]
			})
		]
	});
}
function InsightSummary({ insight }) {
	const [isVisible, setIsVisible] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const timer = setTimeout(() => setIsVisible(true), 150);
		return () => clearTimeout(timer);
	}, []);
	if (!insight) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: `panel p-4 sm:p-5 mb-4 sm:mb-6 ${isVisible ? "fade-in" : "opacity-0"}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex items-center gap-2 mb-3",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] kt-gradient-text",
				children: "✦ AI Summary"
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[15px] sm:text-[16px] leading-relaxed text-ink",
			children: insight
		})]
	});
}
function ChartInsight({ insight }) {
	const [isVisible, setIsVisible] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const timer = setTimeout(() => setIsVisible(true), 150);
		return () => clearTimeout(timer);
	}, []);
	if (!insight) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `mt-3 pt-3 border-t border-line ${isVisible ? "fade-in" : "opacity-0"}`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-[12.5px] text-muted-foreground italic leading-relaxed",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mr-1",
				children: "✦"
			}), insight]
		})
	});
}
var DataTable = (0, import_react.lazy)(() => import("./DataTable-DikFHMl3.mjs").then((m) => ({ default: m.DataTable })));
function SectionDivider({ label, description }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-4 pt-2 sm:pt-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1 h-px bg-line" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "shrink-0 text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "eyebrow text-[10px] sm:text-[12px] tracking-[0.2em] text-muted-foreground",
					children: label
				}), description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-0.5 mono text-[10px] text-muted-foreground max-w-xs",
					children: description
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1 h-px bg-line" })
		]
	});
}
function DatasetTimestamp({ generatedAt }) {
	let display = "—";
	try {
		display = new Date(generatedAt).toLocaleString("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			timeZoneName: "short"
		});
	} catch {}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mono text-[10px] text-muted-foreground flex items-center gap-1.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "inline-block w-1.5 h-1.5 rounded-full",
				style: {
					background: "var(--kt-purple)",
					opacity: .7
				}
			}),
			"Dataset updated: ",
			display
		]
	});
}
function Dashboard() {
	const dataset = Route.useLoaderData();
	const [filters, setFilters] = (0, import_react.useState)(emptyFilters);
	const filtered = (0, import_react.useMemo)(() => applyFilters(dataset.courses, filters), [dataset, filters]);
	const totals = (0, import_react.useMemo)(() => {
		const uniProviders = new Set(filtered.filter((r) => r.source === "university_website" && r.provider).map((r) => r.provider));
		const countries = new Set(filtered.filter((r) => r.country).map((r) => r.country));
		return {
			total: filtered.length,
			universities: uniProviders.size,
			countries: countries.size,
			primary: filtered.filter((r) => r.signal_tier === "primary").length,
			secondary: filtered.filter((r) => r.signal_tier === "secondary").length,
			github: filtered.filter((r) => r.source === "github").length,
			mooc: filtered.filter((r) => r.source === "stepik" || r.source === "coursera").length
		};
	}, [dataset, filtered]);
	const sources = (0, import_react.useMemo)(() => Array.from(new Set(dataset.courses.map((r) => r.source))).sort(), [dataset]);
	const allCountries = (0, import_react.useMemo)(() => {
		const m = /* @__PURE__ */ new Map();
		dataset.courses.forEach((r) => {
			if (!r.country) return;
			m.set(r.country, (m.get(r.country) ?? 0) + 1);
		});
		return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k);
	}, [dataset]);
	const countryCounts = (0, import_react.useMemo)(() => groupBy(filtered, (r) => r.country || ""), [filtered]);
	const topCountries = (0, import_react.useMemo)(() => topN(countryCounts, 15), [countryCounts]);
	const sourceCounts = (0, import_react.useMemo)(() => topN(groupBy(filtered, (r) => r.source), 10), [filtered]);
	const tierCounts = (0, import_react.useMemo)(() => topN(groupBy(filtered, (r) => r.signal_tier), 5), [filtered]);
	const learningCounts = (0, import_react.useMemo)(() => {
		return topN(groupBy(filtered, (r) => r.learning_type), 5).map(([k, v]) => [k === "informal" ? "Non-formal" : k === "formal" ? "Formal" : k, v]);
	}, [filtered]);
	const repoTypeCounts = (0, import_react.useMemo)(() => topN(groupBy(filtered.filter((r) => r.source === "github"), (r) => r.subtype || "other"), 10), [filtered]);
	const providerCounts = (0, import_react.useMemo)(() => topN(groupBy(filtered, (r) => r.provider), 15), [filtered]);
	const confidenceValues = (0, import_react.useMemo)(() => filtered.map((r) => r.kotlin_confidence), [filtered]);
	const confidenceBins = 10;
	const universityCourseCounts = (0, import_react.useMemo)(() => {
		return topN(groupBy(filtered.filter((r) => r.source === "university_website"), (r) => r.provider), 15);
	}, [filtered]);
	const universityCoursesVsMentions = (0, import_react.useMemo)(() => {
		const uniCourses = filtered.filter((r) => r.source === "university_website");
		const courses = uniCourses.filter((r) => r.signal_tier === "primary").length;
		const mentions = uniCourses.filter((r) => r.signal_tier === "secondary").length;
		return [["Courses", courses], ["Mentions of Kotlin", mentions]];
	}, [filtered]);
	const topGitHubRepos = (0, import_react.useMemo)(() => {
		return filtered.filter((r) => r.source === "github").filter((r) => r.popularity > 0).sort((a, b) => b.popularity - a.popularity).slice(0, 15);
	}, [filtered]);
	const moocCourses = (0, import_react.useMemo)(() => {
		return filtered.filter((r) => r.source === "coursera" || r.source === "stepik");
	}, [filtered]);
	const popularityBuckets = (0, import_react.useMemo)(() => {
		const gh = filtered.filter((r) => r.source === "github");
		const buckets = [
			["0", 0],
			["1–9", 0],
			["10–49", 0],
			["50–99", 0],
			["100–499", 0],
			["500+", 0]
		];
		for (const r of gh) {
			const p = r.popularity;
			if (p === 0) buckets[0][1]++;
			else if (p < 10) buckets[1][1]++;
			else if (p < 50) buckets[2][1]++;
			else if (p < 100) buckets[3][1]++;
			else if (p < 500) buckets[4][1]++;
			else buckets[5][1]++;
		}
		return buckets;
	}, [filtered]);
	const formalInformal = (0, import_react.useMemo)(() => {
		return topN(countryCounts, 10).map(([label]) => {
			const rows = filtered.filter((r) => r.country === label);
			return {
				label,
				parts: {
					formal: rows.filter((r) => r.learning_type === "formal").length,
					"non-formal": rows.filter((r) => r.learning_type === "informal").length
				}
			};
		});
	}, [countryCounts, filtered]);
	const moocCounts = (0, import_react.useMemo)(() => topN(groupBy(filtered.filter((r) => r.source === "stepik" || r.source === "coursera"), (r) => r.source), 10), [filtered]);
	(0, import_react.useMemo)(() => {
		return topN(groupBy(filtered.filter((r) => r.source === "university_website" && r.provider), (r) => r.provider), 15);
	}, [filtered]);
	const crawlStats = (0, import_react.useMemo)(() => {
		const s = dataset.serp;
		return {
			total: s.length,
			found: s.filter((r) => r.status === "found").length,
			no_match: s.filter((r) => r.status === "no_match").length,
			empty: s.filter((r) => r.status === "empty").length,
			failed: s.filter((r) => r.status === "failed").length,
			engine: topN(groupBy(s, (r) => r.engine), 10)
		};
	}, [dataset]);
	const mapRows = (0, import_react.useMemo)(() => filtered.filter((r) => r.source === "university_website"), [filtered]);
	const activeFiltersRef = (0, import_react.useRef)(null);
	const toggleCountry = (0, import_react.useCallback)((c) => {
		setFilters((p) => ({
			...p,
			countries: p.countries.includes(c) ? p.countries.filter((x) => x !== c) : [...p.countries, c]
		}));
		requestAnimationFrame(() => {
			activeFiltersRef.current?.scrollIntoView({
				behavior: "smooth",
				block: "nearest"
			});
		});
	}, [setFilters]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-10 pb-4 sm:pb-6 md:pb-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "eyebrow text-[9px] sm:text-[10px] md:text-[11px]",
					children: "GSoC 2026 · Kotlin Foundation"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "mt-1 sm:mt-2 md:mt-3 text-xl sm:text-2xl md:text-4xl lg:text-6xl font-extrabold tracking-[-0.03em] leading-[1.02]",
					children: [
						"Where ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "kt-gradient-text",
							children: "Kotlin"
						}),
						" is taught,",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", { className: "hidden md:block" }),
						" mapped across the world."
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 sm:mt-3 md:mt-4 max-w-2xl text-muted-foreground text-[12px] sm:text-[13px] md:text-[15px] leading-relaxed",
					children: "An automated pipeline discovers universities, MOOCs, and public repositories teaching Kotlin. Every filter below refines the whole dashboard in real time."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 sm:mt-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DatasetTimestamp, { generatedAt: dataset.meta.generated_at })
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 pb-10 sm:pb-12 md:pb-16 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3 sm:gap-4 md:gap-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "lg:hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterRail, {
						filters,
						setFilters,
						sources,
						countries: allCountries,
						filteredCount: filtered.length,
						totalCount: dataset.courses.length
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "hidden lg:block",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterRail, {
						filters,
						setFilters,
						sources,
						countries: allCountries,
						filteredCount: filtered.length,
						totalCount: dataset.courses.length
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
					className: "flex flex-col gap-4 sm:gap-6 min-w-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							ref: activeFiltersRef,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActiveFilters, {
								filters,
								setFilters
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InsightSummary, { insight: dataset.insights?.overall }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionDivider, { label: "General" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCards, { totals }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
								title: "Records by source",
								subtitle: "All sources · distribution",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HorizontalBars, {
									data: sourceCounts,
									color: "#C711E1",
									height: 220
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartInsight, { insight: dataset.insights?.sources })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
								title: "Signal tier & learning type",
								subtitle: "Dataset composition",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-6",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "eyebrow mb-2 flex items-center gap-1",
											children: ["Signal tier", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												title: "Primary: Kotlin is the main subject. Secondary: Kotlin mentioned alongside other content.",
												className: "inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-line text-muted-foreground cursor-help text-[9px]",
												style: {
													fontFamily: "serif",
													fontStyle: "italic"
												},
												children: "i"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Donut, {
											data: tierCounts,
											colors: ["#7F52FF", "#3A3A3F"],
											centerLabel: "records"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartInsight, { insight: dataset.insights?.signal_tier })
									] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "eyebrow mb-2 flex items-center gap-1",
											children: ["Learning type", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												title: "Formal: accredited university courses. Non-formal: MOOCs, GitHub repos, self-study resources.",
												className: "inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-line text-muted-foreground cursor-help text-[9px]",
												style: {
													fontFamily: "serif",
													fontStyle: "italic"
												},
												children: "i"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Donut, {
											data: learningCounts,
											colors: ["#C711E1", "#7F52FF"],
											centerLabel: "records"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartInsight, { insight: dataset.insights?.learning_type })
									] })]
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
							title: "Top 15 providers",
							subtitle: "Owners & institutions · all sources",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HorizontalBars, {
								data: providerCounts,
								color: "#7F52FF"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartInsight, { insight: dataset.insights?.top_providers })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionDivider, {
							label: "Formal Education",
							description: "Accredited university courses where Kotlin appears in the curriculum."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
							title: "Universities per country",
							subtitle: "World map · click a country to filter",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorldMap, {
									countryCounts: new Map(Array.from(groupBy(filtered.filter((r) => r.source === "university_website"), (r) => r.country || "")).filter(([k]) => k)),
									activeCountries: filters.countries,
									onToggleCountry: toggleCountry
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mono text-[10px] text-muted-foreground mt-2",
									children: "ⓘ Click-based filtering only works on this map, and only for countries (university records)."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartInsight, { insight: dataset.insights?.map }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-4 sm:mt-6 border-t border-line pt-4 sm:pt-5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between mb-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "eyebrow text-[10px] sm:text-[11px]",
											children: ["University records", filters.countries.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "ml-1.5 text-muted-foreground normal-case tracking-normal",
												children: ["· ", filters.countries.join(", ")]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "mono text-xs tabular-nums text-muted-foreground",
											children: [fmt(mapRows.length), " rows"]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
										fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-sm text-muted-foreground p-4",
											children: "Loading table…"
										}),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, { data: mapRows })
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
								title: "Top 15 countries",
								subtitle: "Universities teaching Kotlin",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HorizontalBars, {
									data: topCountries,
									onClick: toggleCountry,
									activeKey: filters.countries[0]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartInsight, { insight: dataset.insights?.top_countries })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
								title: "Top 15 universities",
								subtitle: "By course count",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HorizontalBars, {
									data: universityCourseCounts,
									color: "#7F52FF"
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
								title: "Courses vs mentions",
								subtitle: "University records by signal tier",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Donut, {
									data: universityCoursesVsMentions,
									colors: ["#7F52FF", "#C711E1"],
									centerLabel: "records"
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
								title: "Formal vs non-formal",
								subtitle: "Top 10 countries, stacked",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StackedBars, {
									data: formalInformal,
									keys: ["formal", "non-formal"],
									colors: ["#7F52FF", "#C711E1"]
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionDivider, {
							label: "MOOCs",
							description: "Non-formal online courses — Massively Open Online Courses on platforms like Coursera and Stepik."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
								title: "MOOC platform distribution",
								subtitle: "Courses by platform",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HorizontalBars, {
									data: moocCounts,
									color: "#C711E1",
									height: 160
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
								title: "All MOOC courses",
								subtitle: `${moocCourses.length} courses from Coursera and Stepik`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MoocCourseTable, { courses: moocCourses.map((c) => ({
									title: c.title,
									provider: c.provider,
									source: c.source,
									url: c.url
								})) })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionDivider, {
							label: "GitHub",
							description: "Public repositories: courses, tutorials, workshops, and book companions."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
								title: "GitHub by repository type",
								subtitle: "Subtype breakdown",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HorizontalBars, {
									data: repoTypeCounts,
									color: "#7F52FF"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartInsight, { insight: dataset.insights?.github_types })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
								title: "GitHub stars distribution",
								subtitle: "Star count buckets",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HorizontalBars, {
									data: popularityBuckets,
									color: "#C711E1",
									height: 260
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
							title: "Top 15 GitHub repositories",
							subtitle: "By star count · click to visit",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitHubRepoBars, { repos: topGitHubRepos.map((r) => ({
								title: r.title,
								url: r.url,
								popularity: r.popularity,
								subtype: r.subtype
							})) })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionDivider, {
							label: "About this data",
							description: "Terminology, methodology, and data source documentation."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
							title: "Terminology & methodology",
							subtitle: "How to interpret this dashboard",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-4 text-[12px] sm:text-[13px] text-muted-foreground leading-relaxed",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-ink font-semibold",
											children: "Primary vs Secondary signal"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[color:var(--kt-purple)] mono text-[11px]",
											children: "Primary"
										}),
										" — genuinely course-like content (a real course/program page).",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-muted-foreground mono text-[11px]",
											children: "Secondary"
										}),
										" — supporting material or a page that merely mentions Kotlin."
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-ink font-semibold",
											children: "Formal / Non-formal learning"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[color:var(--kt-purple)] mono text-[11px]",
											children: "Formal"
										}),
										" — university courses.",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-muted-foreground mono text-[11px]",
											children: "Non-formal"
										}),
										" — MOOCs; a GitHub repo is Formal if it accompanies a university course, Non-formal if standalone or tied to a MOOC."
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-ink font-semibold",
											children: "Kotlin confidence"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										"The classifier's confidence (0–1) that a resource genuinely teaches Kotlin."
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-ink font-semibold",
											children: "Methodology"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										"Data is discovered via an automated pipeline that searches university websites, GitHub, and MOOC platforms for evidence of Kotlin teaching, then classifies and normalizes the results."
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-4 pt-4 border-t border-line",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-ink font-semibold",
												children: "Map-click filtering"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
											"Dashboard-click filtering only works on the map (by country). Clicking a country on the world map toggles a country filter."
										]
									})
								]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionDivider, {
							label: "Search Statistics",
							description: "Pipeline telemetry — how the automated scraping and discovery process performed."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
							title: "Kotlin-confidence distribution",
							subtitle: "Classifier score histogram · bars centered on ticks",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Histogram, {
								values: confidenceValues,
								bins: confidenceBins,
								height: 240
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
							title: "Crawl funnel",
							subtitle: "Search → discovery → dedupe",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Funnel, { steps: [
								{
									label: "Searched",
									value: crawlStats.total
								},
								{
									label: "Found",
									value: crawlStats.found
								},
								{
									label: "Findings",
									value: filtered.filter((r) => r.source === "university_website").length || 400
								},
								{
									label: "Unique institutions",
									value: new Set(filtered.filter((r) => r.source === "university_website").map((r) => r.provider)).size
								}
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartInsight, { insight: dataset.insights?.baseline })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
								title: "Crawl outcomes",
								subtitle: "Status breakdown",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HorizontalBars, {
									data: [
										["found", crawlStats.found],
										["no_match", crawlStats.no_match],
										["empty", crawlStats.empty],
										["failed", crawlStats.failed]
									],
									color: "#7F52FF",
									height: 200
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
								title: "Discovery engine",
								subtitle: "Which engine served results",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HorizontalBars, {
									data: crawlStats.engine,
									color: "#C711E1",
									height: 200
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
							title: "Data table",
							subtitle: "All sources · filterable · sortable · exportable",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
								fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-sm text-muted-foreground p-4",
									children: "Loading table…"
								}),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataTable, { data: filtered })
							})
						})
					]
				})
			]
		})]
	});
}
//#endregion
export { Dashboard as component };
