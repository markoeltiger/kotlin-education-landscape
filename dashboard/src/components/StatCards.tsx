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

export function StatCards({
  totals,
}: {
  totals: {
    total: number;
    universities: number;
    countries: number;
    primary: number;
    github: number;
    mooc: number;
  };
}) {
  const items = [
    { label: "Total records", value: totals.total },
    { label: "Universities", value: totals.universities },
    { label: "Countries", value: totals.countries },
    { label: "Primary educational", value: totals.primary },
    { label: "GitHub repos", value: totals.github },
    { label: "MOOC courses", value: totals.mooc },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {items.map((it) => (
        <div key={it.label} className="panel relative overflow-hidden p-5">
          <div
            className="absolute left-0 top-0 bottom-0 w-[3px]"
            style={{ background: "var(--gradient-kotlin-135)" }}
          />
          <div className="eyebrow">{it.label}</div>
          <div className="mono mt-2 text-3xl font-bold tabular-nums text-ink">
            <CountUp value={it.value} />
          </div>
        </div>
      ))}
    </div>
  );
}
