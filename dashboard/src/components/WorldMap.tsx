import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import { aliasCountry } from "../lib/countryAliases";
import { useResizeObserver } from "../hooks/useResizeObserver";
import { fmt } from "../lib/format";

type Props = {
  countryCounts: Map<string, number>;
  activeCountries: string[];
  onToggleCountry: (c: string) => void;
};

type World = FeatureCollection<Geometry, { name: string }>;

const WORLD_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

let worldPromise: Promise<World> | null = null;
function loadWorld(): Promise<World> {
  if (!worldPromise) {
    worldPromise = fetch(WORLD_URL)
      .then((r) => r.json())
      .then((topo) => topojson.feature(topo, topo.objects.countries) as unknown as World);
  }
  return worldPromise;
}

export function WorldMap({ countryCounts, activeCountries, onToggleCountry }: Props) {
  const { ref, width } = useResizeObserver<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; name: string; value: number } | null>(null);

  useEffect(() => {
    loadWorld().then(setWorld).catch((e) => console.warn("world atlas load failed", e));
  }, []);

  const aliased = useMemo(() => {
    const m = new Map<string, number>();
    for (const [k, v] of countryCounts) {
      if (!k) continue;
      m.set(aliasCountry(k), (m.get(aliasCountry(k)) ?? 0) + v);
    }
    return m;
  }, [countryCounts]);

  const activeSet = useMemo(() => new Set(activeCountries.map(aliasCountry)), [activeCountries]);

  const height = width < 640 ? 300 : width < 1024 ? 380 : 460;

  useEffect(() => {
    if (!world || !svgRef.current || !width) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const projection = d3.geoNaturalEarth1().fitSize([width, height], world);
    const path = d3.geoPath(projection);

    const max = d3.max(Array.from(aliased.values())) ?? 1;
    const color = d3
      .scaleLog<string>()
      .domain([1, Math.max(2, max)])
      .range(["#241F36", "#C711E1"])
      .interpolate(d3.interpolateHcl)
      .clamp(true);

    const g = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on("zoom", (event) => g.attr("transform", event.transform.toString()));
    svg.call(zoom);

    // graticule
    const graticule = d3.geoGraticule10();
    g.append("path")
      .datum(graticule)
      .attr("d", path as unknown as string)
      .attr("fill", "none")
      .attr("stroke", "#2A2B30")
      .attr("stroke-width", 0.5);

    const unmatched: string[] = [];

    g.selectAll("path.country")
      .data(world.features as Feature<Geometry, { name: string }>[])
      .enter()
      .append("path")
      .attr("class", "country")
      .attr("d", path as unknown as string)
      .attr("fill", (d) => {
        const v = aliased.get(d.properties.name);
        if (!v) return "#1F2024";
        return color(v);
      })
      .attr("stroke", (d) => (activeSet.has(d.properties.name) ? "#F5F5F7" : "#141418"))
      .attr("stroke-width", (d) => (activeSet.has(d.properties.name) ? 1.2 : 0.5))
      .style("cursor", "pointer")
      .on("mousemove", (event: MouseEvent, d) => {
        const name = d.properties.name;
        const v = aliased.get(name) ?? 0;
        const rect = svgRef.current!.getBoundingClientRect();
        setTip({ x: event.clientX - rect.left, y: event.clientY - rect.top, name, value: v });
      })
      .on("mouseleave", () => setTip(null))
      .on("click", (_e, d) => {
        // find original (un-aliased) name that produced this aliased name
        const aliasedName = d.properties.name;
        for (const [orig] of countryCounts) {
          if (aliasCountry(orig) === aliasedName) {
            onToggleCountry(orig);
            return;
          }
        }
        onToggleCountry(aliasedName);
      });

    // Log unmatched dataset countries once
    for (const [k] of countryCounts) {
      if (!k) continue;
      const a = aliasCountry(k);
      if (!world.features.some((f) => (f.properties as { name: string }).name === a)) {
        unmatched.push(k);
      }
    }
    if (unmatched.length) console.warn("[WorldMap] unmatched country names:", unmatched);
  }, [world, width, aliased, activeSet, countryCounts, onToggleCountry]);

  const max = d3.max(Array.from(aliased.values())) ?? 1;
  const legendStops = [1, Math.max(2, Math.round(max / 50)), Math.max(5, Math.round(max / 10)), Math.max(10, Math.round(max / 3)), max];

  return (
    <div ref={ref} className="relative w-full">
      <svg ref={svgRef} width={width || 800} height={height} className="block" />
      {tip && (
        <div
          className="pointer-events-none absolute z-10 panel px-3 py-2 mono text-xs"
          style={{ left: tip.x + 12, top: tip.y + 12, background: "#19191C" }}
        >
          <div className="text-ink">{tip.name}</div>
          <div className="text-muted-foreground">
            {tip.value ? `${fmt(tip.value)} records` : "no data"}
          </div>
        </div>
      )}
      <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
        <div className="eyebrow text-[10px] sm:text-[11px]">Universities · log scale</div>
        <div
          className="h-2 w-full sm:flex-1 rounded-sm"
          style={{
            background:
              "linear-gradient(90deg, #241F36 0%, #4B2E8A 40%, #7F52FF 70%, #C711E1 100%)",
          }}
        />
        <div className="mono text-[10px] sm:text-[11px] tabular-nums text-muted-foreground flex gap-2 sm:gap-3">
          {legendStops.map((v, i) => (
            <span key={i}>{fmt(v)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
