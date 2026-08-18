import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { c as Panel, n as Empty, o as HorizontalBars, t as Donut } from "./Charts-Cg3e7Nay.mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Route } from "./programs-B8lcqrGS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/programs-Dbf1E_I0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ProgramsPage() {
	const dataset = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: "/programs" });
	const [expandedRow, setExpandedRow] = (0, import_react.useState)(null);
	const [selectedCountry, setSelectedCountry] = (0, import_react.useState)("");
	const filteredPrograms = (0, import_react.useMemo)(() => {
		return (dataset?.programs ?? []).filter((program) => {
			const topics = program.topics_canonical ?? program.topics ?? [];
			const matchesSearch = !search.search || (program.university ?? "").toLowerCase().includes(search.search.toLowerCase()) || (program.program_name ?? "").toLowerCase().includes(search.search.toLowerCase()) || topics.some((t) => (t ?? "").toLowerCase().includes(search.search.toLowerCase()));
			const matchesCountry = !search.country || program.country === search.country;
			const matchesLevel = !search.level || program.level === search.level;
			const matchesTopic = !search.topic || topics.includes(search.topic);
			return matchesSearch && matchesCountry && matchesLevel && matchesTopic;
		});
	}, [dataset.programs, search]);
	const sortedPrograms = (0, import_react.useMemo)(() => {
		const sorted = [...filteredPrograms ?? []];
		sorted.sort((a, b) => {
			let comparison = 0;
			if (search.sortBy === "university") comparison = (a.university ?? "").localeCompare(b.university ?? "");
			else if (search.sortBy === "country") comparison = (a.country ?? "").localeCompare(b.country ?? "");
			else if (search.sortBy === "level") comparison = (a.level ?? "").localeCompare(b.level ?? "");
			return search.sortOrder === "asc" ? comparison : -comparison;
		});
		return sorted;
	}, [
		filteredPrograms,
		search.sortBy,
		search.sortOrder
	]);
	const setSearch = (0, import_react.useCallback)((updates) => {
		navigate({
			search: (prev) => ({
				...prev,
				...updates
			}),
			replace: true
		});
	}, [navigate]);
	const allCountries = (0, import_react.useMemo)(() => {
		const programs = dataset?.programs ?? [];
		return Array.from(new Set(programs.map((p) => p.country).filter(Boolean))).sort();
	}, [dataset.programs]);
	const allLevels = (0, import_react.useMemo)(() => {
		const programs = dataset?.programs ?? [];
		return Array.from(new Set(programs.map((p) => p.level).filter(Boolean))).sort();
	}, [dataset.programs]);
	const allTopics = (0, import_react.useMemo)(() => {
		const programs = dataset?.programs ?? [];
		return Array.from(new Set(programs.flatMap((p) => p.topics_canonical ?? p.topics ?? []).filter(Boolean))).sort();
	}, [dataset.programs]);
	const handleTopicClick = (0, import_react.useCallback)((topic) => {
		setSearch({ topic: search.topic === topic ? "" : topic });
	}, [search.topic, setSearch]);
	const handleSort = (0, import_react.useCallback)((sortBy) => {
		setSearch({
			sortBy,
			sortOrder: search.sortBy === sortBy && search.sortOrder === "asc" ? "desc" : "asc"
		});
	}, [
		search.sortBy,
		search.sortOrder,
		setSearch
	]);
	const targetsChartData = (0, import_react.useMemo)(() => {
		return (dataset?.topics?.targets ?? []).slice(0, 15).map((t) => [t.topic ?? "", t.count ?? 0]);
	}, [dataset?.topics]);
	const domainsChartData = (0, import_react.useMemo)(() => {
		return (dataset?.topics?.domains ?? []).slice(0, 15).map((t) => [t.topic ?? "", t.count ?? 0]);
	}, [dataset?.topics]);
	const conceptsChartData = (0, import_react.useMemo)(() => {
		return (dataset?.topics?.concepts ?? []).slice(0, 15).map((t) => [t.topic ?? "", t.count ?? 0]);
	}, [dataset?.topics]);
	const levelChartData = (0, import_react.useMemo)(() => {
		return (dataset?.topics?.by_level ?? []).map((l) => [l.level ?? "", l.count ?? 0]);
	}, [dataset?.topics]);
	const languageChartData = (0, import_react.useMemo)(() => {
		return (dataset?.topics?.by_language ?? []).slice(0, 10).map((l) => [l.language ?? "", l.count ?? 0]);
	}, [dataset?.topics]);
	const getTopicColor = (0, import_react.useCallback)((topic) => {
		const colors = [
			"bg-purple-500/20 text-purple-300 border-purple-500/30",
			"bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
			"bg-pink-500/20 text-pink-300 border-pink-500/30",
			"bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
			"bg-violet-500/20 text-violet-300 border-violet-500/30"
		];
		return colors[topic.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length];
	}, []);
	if (!dataset?.programs?.length || !dataset?.topics) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-screen flex items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { label: "Program data not available" })
	});
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
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "kt-gradient-text",
						children: "Programs"
					}), " teaching Kotlin"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 sm:mt-3 md:mt-4 max-w-2xl text-muted-foreground text-[12px] sm:text-[13px] md:text-[15px] leading-relaxed",
					children: "AI-verified university courses, bootcamps, and professional training programs that teach Kotlin programming."
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 pb-10 sm:pb-12 md:pb-16",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "panel p-4 sm:p-5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "eyebrow text-[10px] sm:text-[11px] mb-1",
								children: "Total Programs"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl sm:text-3xl font-bold text-ink mono",
								children: dataset?.programs?.length ?? 0
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "panel p-4 sm:p-5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "eyebrow text-[10px] sm:text-[11px] mb-1",
								children: "Countries"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl sm:text-3xl font-bold text-ink mono",
								children: allCountries?.length ?? 0
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "panel p-4 sm:p-5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "eyebrow text-[10px] sm:text-[11px] mb-1",
								children: "Topics"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl sm:text-3xl font-bold text-ink mono",
								children: allTopics?.length ?? 0
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "panel p-4 sm:p-5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "eyebrow text-[10px] sm:text-[11px] mb-1",
								children: "Filtered"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl sm:text-3xl font-bold text-kt-purple mono",
								children: sortedPrograms?.length ?? 0
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Targets distribution",
					subtitle: "Primary areas targeted by Kotlin programs",
					className: "mb-4 sm:mb-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HorizontalBars, {
						data: targetsChartData,
						color: "#7F52FF",
						height: 340,
						onClick: handleTopicClick,
						activeKey: search.topic
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
						title: "Domains distribution",
						subtitle: "Most taught domains (e.g. Mobile, Server)",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HorizontalBars, {
							data: domainsChartData,
							color: "#C711E1",
							height: 340,
							onClick: handleTopicClick,
							activeKey: search.topic
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
						title: "Kotlin concepts distribution",
						subtitle: "Key Kotlin language features taught",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HorizontalBars, {
							data: conceptsChartData,
							color: "#7F52FF",
							height: 340,
							onClick: handleTopicClick,
							activeKey: search.topic
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
						title: "Programs by level",
						subtitle: "Academic vs professional",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Donut, {
							data: levelChartData,
							colors: [
								"#7F52FF",
								"#C711E1",
								"#E44857",
								"#3A3A3F"
							],
							centerLabel: "programs"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
						title: "Language of instruction",
						subtitle: "Teaching language distribution",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HorizontalBars, {
							data: languageChartData,
							color: "#C711E1",
							height: 220
						})
					})]
				}),
				dataset?.topics?.top_targets_by_country && Object.keys(dataset.topics.top_targets_by_country).length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "Top targets by country",
					subtitle: "Select a country to see its target breakdown",
					className: "mb-4 sm:mb-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: selectedCountry,
							onChange: (e) => setSelectedCountry(e.target.value),
							className: "bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-kt-purple",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "Select a country"
							}), Object.keys(dataset.topics.top_targets_by_country).sort().map((country) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: country,
								children: country
							}, country))]
						})
					}), selectedCountry && dataset.topics.top_targets_by_country[selectedCountry] && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HorizontalBars, {
						data: (dataset.topics.top_targets_by_country[selectedCountry] ?? []).slice(0, 10).map((t) => [t.topic ?? "", t.count ?? 0]),
						color: "#E44857",
						height: 300,
						onClick: handleTopicClick,
						activeKey: search.topic
					}) })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "Filters",
					subtitle: "Refine programs list",
					className: "mb-4 sm:mb-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "eyebrow text-[10px] block mb-2",
								children: "Search"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								placeholder: "University, program, or topic...",
								value: search.search,
								onChange: (e) => setSearch({ search: e.target.value }),
								className: "w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:border-kt-purple"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "eyebrow text-[10px] block mb-2",
								children: "Country"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: search.country,
								onChange: (e) => setSearch({ country: e.target.value }),
								className: "w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-kt-purple",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "All countries"
								}), allCountries.map((country) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: country,
									children: country
								}, country))]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "eyebrow text-[10px] block mb-2",
								children: "Level"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: search.level,
								onChange: (e) => setSearch({ level: e.target.value }),
								className: "w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-kt-purple",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "All levels"
								}), allLevels.map((level) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: level,
									children: level
								}, level))]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "eyebrow text-[10px] block mb-2",
								children: "Topic"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: search.topic,
								onChange: (e) => setSearch({ topic: e.target.value }),
								className: "w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-kt-purple",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "All topics"
								}), allTopics.map((topic) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: topic,
									children: topic
								}, topic))]
							})] })
						]
					}), (search.search || search.country || search.level || search.topic) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: [
							search.search && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1 px-2 py-1 rounded-md bg-kt-purple/20 text-kt-purple text-xs mono",
								children: [
									"Search: ",
									search.search,
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setSearch({ search: "" }),
										className: "hover:text-white",
										children: "×"
									})
								]
							}),
							search.country && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1 px-2 py-1 rounded-md bg-kt-purple/20 text-kt-purple text-xs mono",
								children: [
									"Country: ",
									search.country,
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setSearch({ country: "" }),
										className: "hover:text-white",
										children: "×"
									})
								]
							}),
							search.level && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1 px-2 py-1 rounded-md bg-kt-purple/20 text-kt-purple text-xs mono",
								children: [
									"Level: ",
									search.level,
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setSearch({ level: "" }),
										className: "hover:text-white",
										children: "×"
									})
								]
							}),
							search.topic && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1 px-2 py-1 rounded-md bg-kt-purple/20 text-kt-purple text-xs mono",
								children: [
									"Topic: ",
									search.topic,
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setSearch({ topic: "" }),
										className: "hover:text-white",
										children: "×"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setSearch({
									search: "",
									country: "",
									level: "",
									topic: ""
								}),
								className: "text-xs text-muted-foreground hover:text-ink underline",
								children: "Clear all"
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "Programs",
					subtitle: `Showing ${sortedPrograms.length} of ${dataset.programs.length} programs`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "overflow-x-auto",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
								className: "w-full text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-b border-line",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("th", {
											className: "text-left py-3 px-2 font-semibold text-ink cursor-pointer hover:text-kt-purple",
											onClick: () => handleSort("university"),
											children: ["University ", search.sortBy === "university" && (search.sortOrder === "asc" ? "↑" : "↓")]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left py-3 px-2 font-semibold text-ink",
											children: "Program Name"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("th", {
											className: "text-left py-3 px-2 font-semibold text-ink cursor-pointer hover:text-kt-purple",
											onClick: () => handleSort("country"),
											children: ["Country ", search.sortBy === "country" && (search.sortOrder === "asc" ? "↑" : "↓")]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("th", {
											className: "text-left py-3 px-2 font-semibold text-ink cursor-pointer hover:text-kt-purple",
											onClick: () => handleSort("level"),
											children: ["Level ", search.sortBy === "level" && (search.sortOrder === "asc" ? "↑" : "↓")]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left py-3 px-2 font-semibold text-ink",
											children: "Topics"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left py-3 px-2 font-semibold text-ink",
											children: "Credits"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "text-left py-3 px-2 font-semibold text-ink",
											children: "Language"
										})
									]
								}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: sortedPrograms.map((program, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-b border-line hover:bg-panel-2 cursor-pointer",
									onClick: () => setExpandedRow(expandedRow === index ? null : index),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3 px-2 text-ink",
											children: program.university
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3 px-2",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
												href: program.url,
												target: "_blank",
												rel: "noopener noreferrer",
												className: "text-kt-purple hover:underline",
												onClick: (e) => e.stopPropagation(),
												children: program.program_name
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3 px-2 text-muted-foreground",
											children: program.country
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3 px-2",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "inline-block px-2 py-0.5 rounded bg-panel-2 border border-line text-xs",
												children: program.level
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3 px-2",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex flex-wrap gap-1",
												children: [(program.topics_canonical ?? program.topics ?? []).slice(0, 3).map((topic) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: `inline-block px-2 py-0.5 rounded text-xs border ${getTopicColor(topic)}`,
													onClick: (e) => {
														e.stopPropagation();
														handleTopicClick(topic);
													},
													children: topic
												}, topic)), (program.topics_canonical ?? program.topics ?? []).length > 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-xs text-muted-foreground",
													children: ["+", (program.topics_canonical ?? program.topics ?? []).length - 3]
												})]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3 px-2 text-muted-foreground mono text-xs",
											children: program.credits || "-"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3 px-2 text-muted-foreground",
											children: program.language_taught || "-"
										})
									]
								}, index)) })]
							})
						}),
						expandedRow !== null && sortedPrograms[expandedRow] && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 p-4 bg-panel-2 rounded-md border border-line",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
									className: "font-semibold text-ink mb-2",
									children: sortedPrograms[expandedRow].program_name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted-foreground mb-3",
									children: sortedPrograms[expandedRow].summary
								}),
								sortedPrograms[expandedRow].prerequisites && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-semibold text-ink",
										children: "Prerequisites: "
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted-foreground",
										children: sortedPrograms[expandedRow].prerequisites
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-semibold text-ink text-sm",
										children: "All topics: "
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex flex-wrap gap-1 mt-1",
										children: (sortedPrograms[expandedRow].topics_canonical ?? sortedPrograms[expandedRow].topics ?? []).map((topic) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: `inline-block px-2 py-0.5 rounded text-xs border ${getTopicColor(topic)}`,
											onClick: () => handleTopicClick(topic),
											children: topic
										}, topic))
									})]
								})
							]
						}),
						sortedPrograms.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { label: "No programs match your filters" })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 text-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: "Programs verified via automated page analysis"
					})
				})
			]
		})]
	});
}
//#endregion
export { ProgramsPage as component };
