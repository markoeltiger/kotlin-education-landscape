import { useMemo, useRef, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Course } from "../lib/dataset";
import { fmt, classNames } from "../lib/format";
import { downloadCsv, toCsv } from "../lib/csv";

type Col = { key: keyof Course; label: string; w: string; align?: "right" };
const COLS: Col[] = [
  { key: "title", label: "Title", w: "minmax(200px,2fr)" },
  { key: "source", label: "Source", w: "90px" },
  { key: "signal_tier", label: "Tier", w: "90px" },
  { key: "learning_type", label: "Learning", w: "90px" },
  { key: "provider", label: "Provider", w: "minmax(140px,1fr)" },
  { key: "country", label: "Country", w: "130px" },
  { key: "subtype", label: "Subtype", w: "120px" },
  { key: "popularity", label: "Popularity", w: "90px", align: "right" },
  { key: "kotlin_confidence", label: "Conf.", w: "70px", align: "right" },
];

export function DataTable({ rows, data }: { rows?: Course[]; data?: Course[] }) {
  const actualRows: Course[] = rows ?? data ?? [];

  // useVirtualizer requires DOM refs — never run during SSR.
  // useEffect does not execute on the server, so isMounted stays false
  // and we render a skeleton instead of calling useVirtualizer.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const [sortKey, setSortKey] = useState<keyof Course>("popularity");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    if (!actualRows || !Array.isArray(actualRows)) return [];
    const arr = actualRows.slice();
    arr.sort((a, b) => {
      if (!a || !b) return 0;
      const av = a[sortKey] as unknown as string | number;
      const bv = b[sortKey] as unknown as string | number;
      if (typeof av === "number" && typeof bv === "number") return dir === "asc" ? av - bv : bv - av;
      const as = String(av ?? "");
      const bs = String(bv ?? "");
      return dir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return arr;
  }, [actualRows, sortKey, dir]);

  const parentRef = useRef<HTMLDivElement>(null);

  // On server: isMounted=false, so useVirtualizer is never called.
  // On client: isMounted=true after first paint, virtualizer is safe to use.
  const virt = useVirtualizer(
    isMounted
      ? { count: sorted.length, getScrollElement: () => parentRef.current, estimateSize: () => 40, overscan: 12 }
      : { count: 0, getScrollElement: () => null, estimateSize: () => 40 }
  );

  // Show a simple skeleton until the client has mounted
  if (!isMounted) {
    return (
      <div className="flex flex-col min-w-0">
        <div className="mono text-xs text-muted-foreground tabular-nums mb-3">
          {fmt(actualRows.length)} rows — loading table…
        </div>
        <div className="border border-line rounded-md overflow-hidden" style={{ height: 'min(520px, 60vh)' }}>
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Loading…
          </div>
        </div>
      </div>
    );
  }

  const gridTemplate = COLS.map((c) => c.w).join(" ");

  const onSort = (k: keyof Course) => {
    if (k === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setDir("desc");
    }
  };

  const exportCsv = () => {
    const csv = toCsv(sorted, COLS.map((c) => c.key));
    downloadCsv(`kotlin-edu-${sorted.length}-rows.csv`, csv);
  };

  return (
    <div className="flex flex-col min-w-0">
      <div className="flex items-center justify-between mb-3">
        <div className="mono text-xs text-muted-foreground tabular-nums">
          {fmt(sorted.length)} rows
        </div>
        <button
          onClick={exportCsv}
          className="mono text-[11px] uppercase tracking-[0.16em] px-3 py-1.5 rounded-md border border-line text-ink hover:border-[color:var(--kt-purple)] hover:text-[color:var(--kt-purple)] transition-colors"
        >
          Export CSV
        </button>
      </div>
      {/* Single scroll container — header + rows share the same overflow-x-auto
          so horizontal scroll moves both together. The header is sticky top-0
          inside this container for vertical scroll. */}
      <div className="border border-line rounded-md overflow-hidden">
        <div ref={parentRef} className="overflow-auto" style={{ height: 'min(520px, 60vh)' }}>
          {/* Minimum width forces horizontal scroll when viewport is narrow */}
          <div style={{ minWidth: `${COLS.reduce((acc, c) => {
            // parse minmax(200px,2fr) -> 200, 90px -> 90, etc.
            const m = c.w.match(/(\d+)px/);
            return acc + (m ? parseInt(m[1]) : 90);
          }, 0)}px` }}>
            {/* Sticky header inside the scroll container */}
            <div
              className="grid bg-panel-2 border-b border-line sticky top-0 z-10"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {COLS.map((c) => (
                <button
                  key={String(c.key)}
                  onClick={() => onSort(c.key)}
                  className={classNames(
                    "px-3 py-2 mono text-[10px] uppercase tracking-[0.16em] text-left hover:text-ink transition-colors",
                    sortKey === c.key ? "text-ink" : "text-muted-foreground",
                    c.align === "right" && "text-right",
                  )}
                >
                  {c.label}
                  {sortKey === c.key && <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>}
                </button>
              ))}
            </div>
            {/* Virtualised rows */}
            <div style={{ height: virt.getTotalSize(), position: "relative" }}>
              {virt.getVirtualItems().map((vi) => {
                const r = sorted[vi.index];
                return (
                  <div
                    key={vi.key}
                    className="grid absolute left-0 right-0 border-b border-line hover:bg-panel-2/60 transition-colors"
                    style={{
                      transform: `translateY(${vi.start}px)`,
                      height: vi.size,
                      gridTemplateColumns: gridTemplate,
                    }}
                  >
                    <Cell>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ink hover:text-[color:var(--kt-purple)] truncate block"
                        title={r.title}
                      >
                        {r.title}
                      </a>
                    </Cell>
                    <Cell mono muted>{r.source}</Cell>
                    <Cell>
                      <Badge tier={r.signal_tier as string}>{r.signal_tier}</Badge>
                    </Cell>
                    <Cell mono muted>{r.learning_type === "informal" ? "non-formal" : r.learning_type}</Cell>
                    <Cell mono>{r.provider}</Cell>
                    <Cell mono muted>{r.country || "—"}</Cell>
                    <Cell mono muted>{r.subtype || "—"}</Cell>
                    <Cell mono align="right">{fmt(r.popularity)}</Cell>
                    <Cell mono align="right">{r.kotlin_confidence.toFixed(2)}</Cell>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Cell({
  children,
  mono,
  muted,
  align,
}: {
  children: React.ReactNode;
  mono?: boolean;
  muted?: boolean;
  align?: "right";
}) {
  return (
    <div
      className={classNames(
        "px-3 py-2 text-[12px] flex items-center min-w-0 truncate",
        mono && "mono",
        muted ? "text-muted-foreground" : "text-ink",
        align === "right" && "justify-end tabular-nums",
      )}
    >
      {children}
    </div>
  );
}

function Badge({ tier, children }: { tier: string; children: React.ReactNode }) {
  const primary = tier === "primary";
  return (
    <span
      className={classNames(
        "mono text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded",
        primary
          ? "bg-[color:var(--kt-purple)]/20 text-[color:var(--kt-purple)]"
          : "bg-panel-2 text-muted-foreground border border-line",
      )}
    >
      {children}
    </span>
  );
}
