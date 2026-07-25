import { useMemo, useState } from "react";
import type { Filters } from "../lib/dataset";
import { fmt, classNames } from "../lib/format";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

type Props = {
  filters: Filters;
  setFilters: (f: Filters | ((prev: Filters) => Filters)) => void;
  sources: string[];
  countries: string[];
  filteredCount: number;
  totalCount: number;
};

const TIERS = ["primary", "secondary"];
const LEARNING = ["formal", "informal"];
const STAR_STEPS = [0, 10, 50, 100, 500];

export function FilterRail({
  filters,
  setFilters,
  sources,
  countries,
  filteredCount,
  totalCount,
}: Props) {
  const [countryQuery, setCountryQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    const base = countries.filter((c) => c);
    if (!q) return base.slice(0, 60);
    return base.filter((c) => c.toLowerCase().includes(q)).slice(0, 60);
  }, [countries, countryQuery]);

  const toggle = (key: keyof Filters, v: string) =>
    setFilters((prev) => {
      const cur = (prev[key] as string[]) ?? [];
      const has = cur.includes(v);
      return { ...prev, [key]: has ? cur.filter((x) => x !== v) : [...cur, v] };
    });

  const filterContent = (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div>
        <div className="eyebrow">Filters</div>
        <div className="mt-2 mono text-sm tabular-nums text-ink">
          {fmt(filteredCount)}
          <span className="text-muted-foreground"> / {fmt(totalCount)} records</span>
        </div>
      </div>

      <Group label="Search">
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
          placeholder="title, provider, country…"
          className="mono w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:border-[color:var(--kt-purple)] transition-colors"
        />
      </Group>

      <Group label="Signal tier">
        <ToggleRow>
          <Chip
            active={filters.primary_only}
            onClick={() => setFilters((p) => ({ ...p, primary_only: !p.primary_only }))}
          >
            Primary-only
          </Chip>
        </ToggleRow>
        <ToggleRow>
          {TIERS.map((t) => (
            <Chip key={t} active={filters.tiers.includes(t)} onClick={() => toggle("tiers", t)}>
              {t}
            </Chip>
          ))}
        </ToggleRow>
      </Group>

      <Group label="Source">
        <ToggleRow>
          {sources.map((s) => (
            <Chip key={s} active={filters.sources.includes(s)} onClick={() => toggle("sources", s)}>
              {s}
            </Chip>
          ))}
        </ToggleRow>
      </Group>

      <Group label="Learning type">
        <ToggleRow>
          {LEARNING.map((l) => (
            <Chip
              key={l}
              active={filters.learning_types.includes(l)}
              onClick={() => toggle("learning_types", l)}
            >
              {l}
            </Chip>
          ))}
        </ToggleRow>
      </Group>

      <Group label={`Min GitHub stars · ${filters.min_stars}`}>
        <div className="flex items-center gap-1">
          {STAR_STEPS.map((s) => (
            <button
              key={s}
              onClick={() => setFilters((p) => ({ ...p, min_stars: s }))}
              className={classNames(
                "mono flex-1 py-1.5 text-xs rounded-md border transition-colors",
                filters.min_stars === s
                  ? "bg-[color:var(--kt-purple)] text-white border-transparent"
                  : "border-line text-muted-foreground hover:text-ink hover:border-[color:var(--kt-purple)]",
              )}
            >
              {s === 0 ? "any" : `≥${s}`}
            </button>
          ))}
        </div>
      </Group>

      <Group
        label={`Kotlin confidence · ${filters.conf_min.toFixed(2)}–${filters.conf_max.toFixed(2)}`}
      >
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={filters.conf_min}
            onChange={(e) =>
              setFilters((p) => ({
                ...p,
                conf_min: Math.min(Number(e.target.value), p.conf_max),
              }))
            }
            className="w-full accent-[color:var(--kt-purple)]"
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={filters.conf_max}
            onChange={(e) =>
              setFilters((p) => ({
                ...p,
                conf_max: Math.max(Number(e.target.value), p.conf_min),
              }))
            }
            className="w-full accent-[color:var(--kt-magenta)]"
          />
        </div>
      </Group>

      <Group label={`Country${filters.countries.length ? ` · ${filters.countries.length} picked` : ""}`}>
        <input
          type="text"
          value={countryQuery}
          onChange={(e) => setCountryQuery(e.target.value)}
          placeholder="filter countries…"
          className="mono w-full bg-panel-2 border border-line rounded-md px-3 py-2 text-xs text-ink placeholder:text-muted-foreground focus:outline-none focus:border-[color:var(--kt-purple)] mb-2"
        />
        <div className="max-h-40 sm:max-h-56 overflow-y-auto flex flex-col">
          {filteredCountries.map((c) => {
            const active = filters.countries.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggle("countries", c)}
                className={classNames(
                  "text-left mono text-xs px-2 py-1 rounded-md transition-colors",
                  active ? "bg-[color:var(--kt-purple)]/20 text-ink" : "text-muted-foreground hover:text-ink hover:bg-panel-2",
                )}
              >
                <span className="inline-block w-3">{active ? "×" : ""}</span> {c}
              </button>
            );
          })}
        </div>
      </Group>
    </div>
  );

  return (
    <>
      {/* Mobile filter button */}
      <div className="lg:hidden mb-4">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="panel w-full px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="eyebrow">Filters</span>
                <span className="mono text-sm tabular-nums text-ink">
                  {fmt(filteredCount)}
                  <span className="text-muted-foreground"> / {fmt(totalCount)}</span>
                </span>
              </div>
              <span className="text-muted-foreground text-xl">☰</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85%] sm:w-[350px] overflow-y-auto p-4 sm:p-6">
            {filterContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block panel p-4 sm:p-5 flex flex-col gap-4 sm:gap-6 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto lg:max-h-none lg:overflow-visible">
        {filterContent}
      </aside>
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:gap-2">
      <div className="eyebrow text-[10px] sm:text-[11px]">{label}</div>
      {children}
    </div>
  );
}
function ToggleRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        "mono text-[11px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-md border transition-colors",
        active
          ? "bg-[color:var(--kt-purple)] text-white border-transparent"
          : "border-line text-muted-foreground hover:text-ink hover:border-[color:var(--kt-purple)]",
      )}
    >
      {children}
    </button>
  );
}

export function ActiveFilters({
  filters,
  setFilters,
}: {
  filters: Filters;
  setFilters: (f: Filters | ((p: Filters) => Filters)) => void;
}) {
  const chips: { label: string; onRemove: () => void }[] = [];
  if (filters.primary_only)
    chips.push({ label: "primary-only", onRemove: () => setFilters((p) => ({ ...p, primary_only: false })) });
  filters.sources.forEach((s) =>
    chips.push({
      label: `source: ${s}`,
      onRemove: () => setFilters((p) => ({ ...p, sources: p.sources.filter((x) => x !== s) })),
    }),
  );
  filters.tiers.forEach((s) =>
    chips.push({
      label: `tier: ${s}`,
      onRemove: () => setFilters((p) => ({ ...p, tiers: p.tiers.filter((x) => x !== s) })),
    }),
  );
  filters.learning_types.forEach((s) =>
    chips.push({
      label: s,
      onRemove: () => setFilters((p) => ({ ...p, learning_types: p.learning_types.filter((x) => x !== s) })),
    }),
  );
  filters.countries.forEach((s) =>
    chips.push({
      label: s,
      onRemove: () => setFilters((p) => ({ ...p, countries: p.countries.filter((x) => x !== s) })),
    }),
  );
  if (filters.min_stars > 0)
    chips.push({ label: `≥${filters.min_stars}★`, onRemove: () => setFilters((p) => ({ ...p, min_stars: 0 })) });
  if (filters.conf_min > 0 || filters.conf_max < 1)
    chips.push({
      label: `conf ${filters.conf_min.toFixed(2)}–${filters.conf_max.toFixed(2)}`,
      onRemove: () => setFilters((p) => ({ ...p, conf_min: 0, conf_max: 1 })),
    });
  if (filters.search)
    chips.push({ label: `"${filters.search}"`, onRemove: () => setFilters((p) => ({ ...p, search: "" })) });

  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
      {chips.map((c, i) => (
        <button
          key={i}
          onClick={c.onRemove}
          className="mono text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-1 rounded-md border border-line text-muted-foreground hover:text-ink hover:border-[color:var(--kt-magenta)] transition-colors"
        >
          {c.label} ×
        </button>
      ))}
      <button
        onClick={() =>
          setFilters((p) => ({
            ...p,
            primary_only: false,
            sources: [],
            tiers: [],
            learning_types: [],
            countries: [],
            min_stars: 0,
            conf_min: 0,
            conf_max: 1,
            search: "",
          }))
        }
        className="mono text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-1 rounded-md bg-[color:var(--kt-orange)]/15 text-[color:var(--kt-orange)] hover:bg-[color:var(--kt-orange)]/25"
      >
        clear all
      </button>
    </div>
  );
}
