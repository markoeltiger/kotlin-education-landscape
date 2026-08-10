import { useEffect, useState } from "react";
import { fmt } from "../lib/format";

function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{fmt(n)}</>;
}

type CardItem = {
  label: string;
  value: number;
  /** Optional secondary number shown as "/ N secondary" below the main value */
  secondary?: number;
  /** If true, renders a PRIMARY tier badge */
  isPrimary?: boolean;
  /** Accent color override (CSS var string or hex) */
  accent?: string;
};

export function StatCards({
  totals,
}: {
  totals: {
    total: number;
    universities: number;
    countries: number;
    primary: number;
    secondary: number;
    github: number;
    mooc: number;
  };
}) {
  const items: CardItem[] = [
    { label: "Total records", value: totals.total },
    { label: "Universities", value: totals.universities },
    { label: "Countries", value: totals.countries },
    {
      label: "Primary signal",
      value: totals.primary,
      secondary: totals.secondary,
      isPrimary: true,
      accent: "var(--kt-purple)",
    },
    { label: "GitHub repos", value: totals.github },
    { label: "MOOC courses", value: totals.mooc },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
      {items.map((it) => (
        <div key={it.label} className="panel relative overflow-hidden p-3 sm:p-5">
          {/* Left accent bar — purple for primary-tier card, default gradient otherwise */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[3px]"
            style={{
              background: it.accent
                ? it.accent
                : "var(--gradient-kotlin-135)",
            }}
          />

          <div className="eyebrow text-[10px] sm:text-[11px]">{it.label}</div>

          <div className="mono mt-1 sm:mt-2 text-xl sm:text-3xl font-bold tabular-nums text-ink">
            <CountUp value={it.value} />
          </div>

          {/* Signal tier row — shown only on the primary card */}
          {it.isPrimary && (
            <div className="mt-1.5 sm:mt-2 flex flex-col gap-1">
              {/* PRIMARY pill */}
              <span
                className="inline-flex items-center gap-1 self-start mono text-[9px] sm:text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
                style={{
                  background: "color-mix(in srgb, var(--kt-purple) 20%, transparent)",
                  color: "var(--kt-purple)",
                  border: "1px solid color-mix(in srgb, var(--kt-purple) 35%, transparent)",
                }}
              >
                {/* Pulsing dot */}
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "var(--kt-purple)" }}
                />
                primary
              </span>

              {/* Secondary count */}
              {it.secondary !== undefined && (
                <span className="mono text-[10px] sm:text-[11px] tabular-nums text-muted-foreground">
                  + <CountUp value={it.secondary} />{" "}
                  <span className="text-[9px] sm:text-[10px]">secondary</span>
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
