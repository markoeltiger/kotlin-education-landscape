import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { a as bin, i as max, t as sum } from "../_libs/d3-array.mjs";
import { n as linear, r as band } from "../_libs/d3-scale+internmap.mjs";
import { n as axisLeft, t as axisBottom } from "../_libs/d3-axis.mjs";
import { m as select_default } from "../_libs/d3+[...].mjs";
import { n as arc_default, t as pie_default } from "../_libs/d3-shape.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/Charts-Cg3e7Nay.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var nf = new Intl.NumberFormat("en-US");
var fmt = (n) => nf.format(n);
function classNames(...xs) {
	return xs.filter(Boolean).join(" ");
}
function Panel({ title, subtitle, children, className, action }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: classNames("panel p-4 sm:p-5 flex flex-col min-w-0", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "eyebrow text-[10px] sm:text-[11px]",
				children: subtitle ?? "Panel"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-[13px] sm:text-[15px] font-semibold text-ink mt-1",
				children: title
			})] }), action]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex-1 min-w-0",
			children
		})]
	});
}
function Empty({ label = "No data for current filters" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "h-full min-h-[120px] flex items-center justify-center text-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mono text-xs text-muted-foreground uppercase tracking-[0.2em]",
			children: label
		})
	});
}
function useResizeObserver() {
	const ref = (0, import_react.useRef)(null);
	const [size, setSize] = (0, import_react.useState)({
		width: 0,
		height: 0
	});
	(0, import_react.useEffect)(() => {
		if (!ref.current) return;
		const ro = new ResizeObserver((entries) => {
			for (const e of entries) {
				const { width, height } = e.contentRect;
				setSize({
					width,
					height
				});
			}
		});
		ro.observe(ref.current);
		return () => ro.disconnect();
	}, []);
	return {
		ref,
		...size
	};
}
function HorizontalBars({ data, color = "#7F52FF", height = 340, onClick, activeKey }) {
	const { ref, width } = useResizeObserver();
	const svgRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (!svgRef.current || !width || !data.length) return;
		const svg = select_default(svgRef.current);
		svg.selectAll("*").remove();
		const margin = {
			top: 4,
			right: 44,
			bottom: 4,
			left: 130
		};
		const w = width - margin.left - margin.right;
		const h = height - margin.top - margin.bottom;
		const y = band().domain(data.map((d) => d[0])).range([0, h]).padding(.28);
		const x = linear().domain([0, max(data, (d) => d[1]) ?? 1]).range([0, w]);
		const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
		g.selectAll("text.lbl").data(data).join("text").attr("x", -10).attr("y", (d) => (y(d[0]) ?? 0) + y.bandwidth() / 2).attr("dy", "0.35em").attr("text-anchor", "end").attr("class", "mono").attr("fill", (d) => d[0] === activeKey ? "#F5F5F7" : "#9B9BA1").attr("font-size", 11).text((d) => d[0].length > 22 ? d[0].slice(0, 21) + "…" : d[0]);
		g.selectAll("rect.bg").data(data).join("rect").attr("x", 0).attr("y", (d) => y(d[0]) ?? 0).attr("width", w).attr("height", y.bandwidth()).attr("fill", "#1F2024").attr("rx", 3);
		g.selectAll("rect.bar").data(data).join("rect").attr("x", 0).attr("y", (d) => y(d[0]) ?? 0).attr("width", (d) => x(d[1])).attr("height", y.bandwidth()).attr("fill", (d) => d[0] === activeKey ? "#C711E1" : color).attr("rx", 3).style("cursor", onClick ? "pointer" : "default").on("click", (_e, d) => onClick?.(d[0])).append("title").text((d) => `${d[0]}: ${fmt(d[1])}`);
		g.selectAll("text.val").data(data).join("text").attr("x", (d) => x(d[1]) + 6).attr("y", (d) => (y(d[0]) ?? 0) + y.bandwidth() / 2).attr("dy", "0.35em").attr("class", "mono").attr("fill", "#F5F5F7").attr("font-size", 11).text((d) => fmt(d[1]));
	}, [
		data,
		width,
		height,
		color,
		activeKey,
		onClick
	]);
	if (!data.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		className: "w-full",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
			ref: svgRef,
			width: width || 400,
			height
		})
	});
}
function Donut({ data, colors, height = 220, centerLabel }) {
	const { ref, width } = useResizeObserver();
	const svgRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (!svgRef.current || !width || !data.length) return;
		const svg = select_default(svgRef.current);
		svg.selectAll("*").remove();
		const radius = Math.min(width, height) / 2;
		const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);
		const total = sum(data, (d) => d[1]);
		const pie = pie_default().value((d) => d[1]).sort(null);
		const arc = arc_default().innerRadius(radius * .62).outerRadius(radius);
		g.selectAll("path").data(pie(data)).join("path").attr("d", arc).attr("fill", (_d, i) => colors[i % colors.length]).attr("stroke", "#19191C").attr("stroke-width", 2).append("title").text((d) => `${d.data[0]}: ${fmt(d.data[1])} (${(d.data[1] / total * 100).toFixed(1)}%)`);
		g.append("text").attr("text-anchor", "middle").attr("class", "mono").attr("fill", "#F5F5F7").attr("font-size", 22).attr("font-weight", 700).attr("dy", "-0.1em").text(fmt(total));
		if (centerLabel) g.append("text").attr("text-anchor", "middle").attr("class", "mono").attr("fill", "#9B9BA1").attr("font-size", 10).attr("letter-spacing", "0.18em").attr("dy", "1.2em").text(centerLabel.toUpperCase());
	}, [
		data,
		width,
		height,
		colors,
		centerLabel
	]);
	if (!data.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			ref,
			className: "w-full",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
				ref: svgRef,
				width: width || 220,
				height
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-wrap gap-x-4 gap-y-1 justify-center",
			children: data.map(([k, v], i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mono text-[11px] text-muted-foreground flex items-center gap-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "inline-block w-2.5 h-2.5 rounded-sm",
						style: { background: colors[i % colors.length] }
					}),
					k,
					" · ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-ink",
						children: fmt(v)
					})
				]
			}, k))
		})]
	});
}
function StackedBars({ data, keys, colors, height = 320 }) {
	const { ref, width } = useResizeObserver();
	const svgRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (!svgRef.current || !width || !data.length) return;
		const svg = select_default(svgRef.current);
		svg.selectAll("*").remove();
		const margin = {
			top: 4,
			right: 60,
			bottom: 4,
			left: 130
		};
		const w = width - margin.left - margin.right;
		const h = height - margin.top - margin.bottom;
		const y = band().domain(data.map((d) => d.label)).range([0, h]).padding(.28);
		const totals = data.map((d) => keys.reduce((s, k) => s + (d.parts[k] ?? 0), 0));
		const x = linear().domain([0, max(totals) ?? 1]).range([0, w]);
		const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
		g.selectAll("text.lbl").data(data).join("text").attr("x", -10).attr("y", (d) => (y(d.label) ?? 0) + y.bandwidth() / 2).attr("dy", "0.35em").attr("text-anchor", "end").attr("class", "mono").attr("fill", "#9B9BA1").attr("font-size", 11).text((d) => d.label.length > 22 ? d.label.slice(0, 21) + "…" : d.label);
		data.forEach((d) => {
			let acc = 0;
			keys.forEach((k, i) => {
				const val = d.parts[k] ?? 0;
				if (val <= 0) return;
				g.append("rect").attr("x", x(acc)).attr("y", y(d.label) ?? 0).attr("width", x(acc + val) - x(acc)).attr("height", y.bandwidth()).attr("fill", colors[i]).append("title").text(`${d.label} · ${k}: ${fmt(val)}`);
				acc += val;
			});
			g.append("text").attr("x", x(acc) + 6).attr("y", (y(d.label) ?? 0) + y.bandwidth() / 2).attr("dy", "0.35em").attr("class", "mono").attr("fill", "#F5F5F7").attr("font-size", 11).text(fmt(acc));
		});
	}, [
		data,
		keys,
		colors,
		width,
		height
	]);
	if (!data.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		className: "w-full",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
			ref: svgRef,
			width: width || 400,
			height
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-2 flex flex-wrap gap-4 justify-center",
		children: keys.map((k, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mono text-[11px] text-muted-foreground flex items-center gap-1.5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "inline-block w-2.5 h-2.5 rounded-sm",
				style: { background: colors[i] }
			}), k]
		}, k))
	})] });
}
function Histogram({ values, bins = 10, height = 200, color = "#7F52FF" }) {
	const { ref, width } = useResizeObserver();
	const svgRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (!svgRef.current || !width || !values.length) return;
		const svg = select_default(svgRef.current);
		svg.selectAll("*").remove();
		const margin = {
			top: 8,
			right: 8,
			bottom: 28,
			left: 38
		};
		const w = width - margin.left - margin.right;
		const h = height - margin.top - margin.bottom;
		const x = linear().domain([0, 1]).range([0, w]);
		const thresholds = Array.from({ length: bins }, (_, i) => i / bins);
		const hist = bin().domain([0, 1]).thresholds(thresholds)(values);
		const y = linear().domain([0, max(hist, (d) => d.length) ?? 1]).range([h, 0]);
		const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
		g.selectAll("rect").data(hist).join("rect").attr("x", (d) => x(d.x0 ?? 0) + 1).attr("y", (d) => y(d.length)).attr("width", (d) => Math.max(0, x(d.x1 ?? 0) - x(d.x0 ?? 0) - 2)).attr("height", (d) => h - y(d.length)).attr("fill", color).attr("rx", 2).append("title").text((d) => `${(d.x0 ?? 0).toFixed(1)}–${(d.x1 ?? 0).toFixed(1)}: ${fmt(d.length)} records`);
		const midpoints = hist.map((d) => ((d.x0 ?? 0) + (d.x1 ?? 0)) / 2);
		const xAxis = axisBottom(x).tickValues(midpoints).tickFormat((v) => v.toFixed(1)).tickSizeOuter(0);
		g.append("g").attr("transform", `translate(0,${h})`).call(xAxis).call((sel) => sel.selectAll("text").attr("class", "mono").attr("fill", "#9B9BA1").attr("font-size", 9)).call((sel) => sel.selectAll("line,path").attr("stroke", "#3A3A3F"));
		const yAxis = axisLeft(y).ticks(4).tickSizeOuter(0);
		g.append("g").call(yAxis).call((sel) => sel.selectAll("text").attr("class", "mono").attr("fill", "#9B9BA1")).call((sel) => sel.selectAll("line,path").attr("stroke", "#3A3A3F"));
	}, [
		values,
		bins,
		width,
		height,
		color
	]);
	if (!values.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		className: "w-full",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
			ref: svgRef,
			width: width || 300,
			height
		})
	});
}
function Funnel({ steps, height = 220 }) {
	const { ref, width } = useResizeObserver();
	if (!steps.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, {});
	const max = Math.max(...steps.map((s) => s.value));
	const colors = [
		"#7F52FF",
		"#9E3AE7",
		"#C711E1",
		"#E44857"
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		className: "w-full flex flex-col gap-2",
		style: { minHeight: height },
		children: steps.map((s, i) => {
			const pct = s.value / max * 100;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-40 shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "eyebrow",
						children: s.label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mono text-xl font-bold text-ink tabular-nums",
						children: fmt(s.value)
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex-1 h-8 bg-panel-2 rounded-md overflow-hidden border border-line",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-full transition-all",
						style: {
							width: `${pct}%`,
							background: colors[i % colors.length]
						}
					})
				})]
			}, s.label);
		})
	});
}
function GitHubRepoBars({ repos, height = 400 }) {
	if (!repos.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, {});
	const maxStars = Math.max(...repos.map((r) => r.popularity)) || 1;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid grid-cols-1 md:grid-cols-2 gap-3",
		style: {
			maxHeight: height,
			overflowY: "auto"
		},
		children: repos.map((r, i) => {
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative flex items-center justify-between p-2.5 rounded-md overflow-hidden bg-panel-2/30 border border-line/40 hover:border-line transition-colors",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute left-0 top-0 bottom-0 bg-[color:var(--kt-purple)]/10 transition-all duration-500",
						style: {
							width: `${r.popularity / maxStars * 100}%`,
							zIndex: 0
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative flex items-center gap-3 z-10 min-w-0 flex-1 pr-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "mono text-[11px] text-muted-foreground w-5 shrink-0 text-right",
								children: [i + 1, "."]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: r.url,
								target: "_blank",
								rel: "noreferrer",
								className: "mono text-xs text-ink hover:text-[color:var(--kt-purple)] truncate font-medium focus:outline-none",
								title: r.title,
								children: r.title
							}),
							r.subtype && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-panel/80 text-muted-foreground border border-line/30 shrink-0",
								children: r.subtype
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative z-10 mono text-xs font-bold text-[color:var(--kt-magenta)] tabular-nums shrink-0",
						children: ["★ ", fmt(r.popularity)]
					})
				]
			}, r.url);
		})
	});
}
function MoocCourseTable({ courses }) {
	if (!courses.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "border border-line rounded-md overflow-hidden",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
			className: "w-full text-left",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
				className: "bg-panel-2 border-b border-line",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-3 py-2 mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground",
						children: "Title"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-3 py-2 mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground",
						children: "Provider"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-3 py-2 mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground",
						children: "Platform"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "px-3 py-2 mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground",
						children: "Link"
					})
				] })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: courses.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
				className: "border-b border-line hover:bg-panel-2/40 transition-colors",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-3 py-2 text-xs text-ink truncate max-w-xs",
						title: c.title,
						children: c.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-3 py-2 mono text-xs text-muted-foreground",
						children: c.provider
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-3 py-2 mono text-xs text-muted-foreground capitalize",
						children: c.source
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-3 py-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: c.url,
							target: "_blank",
							rel: "noreferrer",
							className: "mono text-[10px] text-[color:var(--kt-purple)] hover:underline",
							children: "Open"
						})
					})
				]
			}, i)) })]
		})
	});
}
//#endregion
export { Histogram as a, Panel as c, fmt as d, useResizeObserver as f, GitHubRepoBars as i, StackedBars as l, Empty as n, HorizontalBars as o, Funnel as r, MoocCourseTable as s, Donut as t, classNames as u };
