import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useResizeObserver } from "../hooks/useResizeObserver";
import { Empty } from "./Panel";
import { fmt } from "../lib/format";

export function HorizontalBars({
  data,
  color = "#7F52FF",
  height = 340,
  onClick,
  activeKey,
}: {
  data: [string, number][];
  color?: string;
  height?: number;
  onClick?: (k: string) => void;
  activeKey?: string;
}) {
  const { ref, width } = useResizeObserver<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !width || !data.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const margin = { top: 4, right: 44, bottom: 4, left: 130 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const y = d3.scaleBand().domain(data.map((d) => d[0])).range([0, h]).padding(0.28);
    const x = d3.scaleLinear().domain([0, d3.max(data, (d) => d[1]) ?? 1]).range([0, w]);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    g.selectAll("text.lbl")
      .data(data)
      .join("text")
      .attr("x", -10)
      .attr("y", (d) => (y(d[0]) ?? 0) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .attr("class", "mono")
      .attr("fill", (d) => (d[0] === activeKey ? "#F5F5F7" : "#9B9BA1"))
      .attr("font-size", 11)
      .text((d) => (d[0].length > 22 ? d[0].slice(0, 21) + "…" : d[0]));

    g.selectAll("rect.bg")
      .data(data)
      .join("rect")
      .attr("x", 0)
      .attr("y", (d) => y(d[0]) ?? 0)
      .attr("width", w)
      .attr("height", y.bandwidth())
      .attr("fill", "#1F2024")
      .attr("rx", 3);

    g.selectAll("rect.bar")
      .data(data)
      .join("rect")
      .attr("x", 0)
      .attr("y", (d) => y(d[0]) ?? 0)
      .attr("width", (d) => x(d[1]))
      .attr("height", y.bandwidth())
      .attr("fill", (d) => (d[0] === activeKey ? "#C711E1" : color))
      .attr("rx", 3)
      .style("cursor", onClick ? "pointer" : "default")
      .on("click", (_e, d) => onClick?.(d[0]))
      .append("title")
      .text((d) => `${d[0]}: ${fmt(d[1])}`);

    g.selectAll("text.val")
      .data(data)
      .join("text")
      .attr("x", (d) => x(d[1]) + 6)
      .attr("y", (d) => (y(d[0]) ?? 0) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("class", "mono")
      .attr("fill", "#F5F5F7")
      .attr("font-size", 11)
      .text((d) => fmt(d[1]));
  }, [data, width, height, color, activeKey, onClick]);

  if (!data.length) return <Empty />;
  return (
    <div ref={ref} className="w-full">
      <svg ref={svgRef} width={width || 400} height={height} />
    </div>
  );
}

export function Donut({
  data,
  colors,
  height = 220,
  centerLabel,
}: {
  data: [string, number][];
  colors: string[];
  height?: number;
  centerLabel?: string;
}) {
  const { ref, width } = useResizeObserver<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !width || !data.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const size = Math.min(width, height);
    const radius = size / 2;
    const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

    const total = d3.sum(data, (d) => d[1]);
    const pie = d3.pie<[string, number]>().value((d) => d[1]).sort(null);
    const arc = d3.arc<d3.PieArcDatum<[string, number]>>().innerRadius(radius * 0.62).outerRadius(radius);

    g.selectAll("path")
      .data(pie(data))
      .join("path")
      .attr("d", arc as unknown as string)
      .attr("fill", (_d, i) => colors[i % colors.length])
      .attr("stroke", "#19191C")
      .attr("stroke-width", 2)
      .append("title")
      .text((d) => `${d.data[0]}: ${fmt(d.data[1])} (${((d.data[1] / total) * 100).toFixed(1)}%)`);

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("class", "mono")
      .attr("fill", "#F5F5F7")
      .attr("font-size", 22)
      .attr("font-weight", 700)
      .attr("dy", "-0.1em")
      .text(fmt(total));
    if (centerLabel)
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("class", "mono")
        .attr("fill", "#9B9BA1")
        .attr("font-size", 10)
        .attr("letter-spacing", "0.18em")
        .attr("dy", "1.2em")
        .text(centerLabel.toUpperCase());
  }, [data, width, height, colors, centerLabel]);

  if (!data.length) return <Empty />;
  return (
    <div className="flex flex-col gap-3">
      <div ref={ref} className="w-full">
        <svg ref={svgRef} width={width || 220} height={height} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
        {data.map(([k, v], i) => (
          <div key={k} className="mono text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: colors[i % colors.length] }}
            />
            {k} · <span className="text-ink">{fmt(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StackedBars({
  data,
  keys,
  colors,
  height = 320,
}: {
  data: { label: string; parts: Record<string, number> }[];
  keys: string[];
  colors: string[];
  height?: number;
}) {
  const { ref, width } = useResizeObserver<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !width || !data.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const margin = { top: 4, right: 60, bottom: 4, left: 130 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const y = d3.scaleBand().domain(data.map((d) => d.label)).range([0, h]).padding(0.28);
    const totals = data.map((d) => keys.reduce((s, k) => s + (d.parts[k] ?? 0), 0));
    const x = d3.scaleLinear().domain([0, d3.max(totals) ?? 1]).range([0, w]);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    g.selectAll("text.lbl")
      .data(data)
      .join("text")
      .attr("x", -10)
      .attr("y", (d) => (y(d.label) ?? 0) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .attr("class", "mono")
      .attr("fill", "#9B9BA1")
      .attr("font-size", 11)
      .text((d) => (d.label.length > 22 ? d.label.slice(0, 21) + "…" : d.label));

    data.forEach((d) => {
      let acc = 0;
      keys.forEach((k, i) => {
        const val = d.parts[k] ?? 0;
        if (val <= 0) return;
        g.append("rect")
          .attr("x", x(acc))
          .attr("y", y(d.label) ?? 0)
          .attr("width", x(acc + val) - x(acc))
          .attr("height", y.bandwidth())
          .attr("fill", colors[i])
          .append("title")
          .text(`${d.label} · ${k}: ${fmt(val)}`);
        acc += val;
      });
      g.append("text")
        .attr("x", x(acc) + 6)
        .attr("y", (y(d.label) ?? 0) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("class", "mono")
        .attr("fill", "#F5F5F7")
        .attr("font-size", 11)
        .text(fmt(acc));
    });
  }, [data, keys, colors, width, height]);

  if (!data.length) return <Empty />;
  return (
    <div>
      <div ref={ref} className="w-full">
        <svg ref={svgRef} width={width || 400} height={height} />
      </div>
      <div className="mt-2 flex flex-wrap gap-4 justify-center">
        {keys.map((k, i) => (
          <div key={k} className="mono text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: colors[i] }} />
            {k}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Histogram({
  values,
  bins = 10,
  height = 200,
  color = "#7F52FF",
}: {
  values: number[];
  bins?: number;
  height?: number;
  color?: string;
}) {
  const { ref, width } = useResizeObserver<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !width || !values.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const margin = { top: 8, right: 8, bottom: 28, left: 38 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const x = d3.scaleLinear().domain([0, 1]).range([0, w]);
    // Use fixed thresholds for 0.0-0.1, 0.1-0.2, etc. buckets
    const thresholds = Array.from({ length: bins }, (_, i) => i / bins);
    const hist = d3.bin<number, number>().domain([0, 1]).thresholds(thresholds)(values);
    const y = d3.scaleLinear().domain([0, d3.max(hist, (d) => d.length) ?? 1]).range([h, 0]);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    g.selectAll("rect")
      .data(hist)
      .join("rect")
      .attr("x", (d) => x(d.x0 ?? 0) + 1)
      .attr("y", (d) => y(d.length))
      .attr("width", (d) => Math.max(0, x(d.x1 ?? 0) - x(d.x0 ?? 0) - 2))
      .attr("height", (d) => h - y(d.length))
      .attr("fill", color)
      .attr("rx", 2)
      .append("title")
      .text((d) => `${(d.x0 ?? 0).toFixed(1)}–${(d.x1 ?? 0).toFixed(1)}: ${fmt(d.length)} records`);

    // Center tick marks at bin midpoints so each bar sits under its label
    const midpoints = hist.map((d) => ((d.x0 ?? 0) + (d.x1 ?? 0)) / 2);
    const xAxis = d3
      .axisBottom(x)
      .tickValues(midpoints)
      .tickFormat((v) => (v as number).toFixed(1))
      .tickSizeOuter(0);
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(xAxis)
      .call((sel) => sel.selectAll("text").attr("class", "mono").attr("fill", "#9B9BA1").attr("font-size", 9))
      .call((sel) => sel.selectAll("line,path").attr("stroke", "#3A3A3F"));

    const yAxis = d3.axisLeft(y).ticks(4).tickSizeOuter(0);
    g.append("g")
      .call(yAxis)
      .call((sel) => sel.selectAll("text").attr("class", "mono").attr("fill", "#9B9BA1"))
      .call((sel) => sel.selectAll("line,path").attr("stroke", "#3A3A3F"));
  }, [values, bins, width, height, color]);

  if (!values.length) return <Empty />;
  return (
    <div ref={ref} className="w-full">
      <svg ref={svgRef} width={width || 300} height={height} />
    </div>
  );
}

export function Funnel({
  steps,
  height = 220,
}: {
  steps: { label: string; value: number }[];
  height?: number;
}) {
  const { ref, width } = useResizeObserver<HTMLDivElement>();
  if (!steps.length) return <Empty />;
  const max = Math.max(...steps.map((s) => s.value));
  const colors = ["#7F52FF", "#9E3AE7", "#C711E1", "#E44857"];
  return (
    <div ref={ref} className="w-full flex flex-col gap-2" style={{ minHeight: height }}>
      {steps.map((s, i) => {
        const pct = (s.value / max) * 100;
        return (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-40 shrink-0">
              <div className="eyebrow">{s.label}</div>
              <div className="mono text-xl font-bold text-ink tabular-nums">{fmt(s.value)}</div>
            </div>
            <div className="flex-1 h-8 bg-panel-2 rounded-md overflow-hidden border border-line">
              <div
                className="h-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: colors[i % colors.length],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Simple horizontal bars with links for GitHub repos
export function GitHubRepoBars({
  repos,
  height = 400,
}: {
  repos: Array<{ title: string; url: string; popularity: number; subtype?: string }>;
  height?: number;
}) {
  if (!repos.length) return <Empty />;
  const maxStars = Math.max(...repos.map((r) => r.popularity)) || 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ maxHeight: height, overflowY: "auto" }}>
      {repos.map((r, i) => {
        const pct = (r.popularity / maxStars) * 100;
        return (
          <div
            key={r.url}
            className="relative flex items-center justify-between p-2.5 rounded-md overflow-hidden bg-panel-2/30 border border-line/40 hover:border-line transition-colors"
          >
            {/* The bar backplate */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-[color:var(--kt-purple)]/10 transition-all duration-500"
              style={{ width: `${pct}%`, zIndex: 0 }}
            />
            {/* Content */}
            <div className="relative flex items-center gap-3 z-10 min-w-0 flex-1 pr-4">
              <span className="mono text-[11px] text-muted-foreground w-5 shrink-0 text-right">
                {i + 1}.
              </span>
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="mono text-xs text-ink hover:text-[color:var(--kt-purple)] truncate font-medium focus:outline-none"
                title={r.title}
              >
                {r.title}
              </a>
              {r.subtype && (
                <span className="mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-panel/80 text-muted-foreground border border-line/30 shrink-0">
                  {r.subtype}
                </span>
              )}
            </div>
            <div className="relative z-10 mono text-xs font-bold text-[color:var(--kt-magenta)] tabular-nums shrink-0">
              ★ {fmt(r.popularity)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Simple table for MOOC courses
export function MoocCourseTable({
  courses,
}: {
  courses: Array<{ title: string; provider: string; source: string; url: string }>;
}) {
  if (!courses.length) return <Empty />;
  
  return (
    <div className="border border-line rounded-md overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-panel-2 border-b border-line">
          <tr>
            <th className="px-3 py-2 mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Title</th>
            <th className="px-3 py-2 mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Provider</th>
            <th className="px-3 py-2 mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Platform</th>
            <th className="px-3 py-2 mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Link</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c, i) => (
            <tr key={i} className="border-b border-line hover:bg-panel-2/40 transition-colors">
              <td className="px-3 py-2 text-xs text-ink truncate max-w-xs" title={c.title}>{c.title}</td>
              <td className="px-3 py-2 mono text-xs text-muted-foreground">{c.provider}</td>
              <td className="px-3 py-2 mono text-xs text-muted-foreground capitalize">{c.source}</td>
              <td className="px-3 py-2">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mono text-[10px] text-[color:var(--kt-purple)] hover:underline"
                >
                  Open
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
  const { ref, width } = useResizeObserver<HTMLDivElement>();
  if (!steps.length) return <Empty />;
  const max = Math.max(...steps.map((s) => s.value));
  const colors = ["#7F52FF", "#9E3AE7", "#C711E1", "#E44857"];
  return (
    <div ref={ref} className="w-full flex flex-col gap-2" style={{ minHeight: height }}>
      {steps.map((s, i) => {
        const pct = (s.value / max) * 100;
        return (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-40 shrink-0">
              <div className="eyebrow">{s.label}</div>
              <div className="mono text-xl font-bold text-ink tabular-nums">{fmt(s.value)}</div>
            </div>
            <div className="flex-1 h-8 bg-panel-2 rounded-md overflow-hidden border border-line">
              <div
                className="h-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: colors[i % colors.length],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
