import type { ReactNode } from "react";
import { classNames } from "../lib/format";

export function Panel({
  title,
  subtitle,
  children,
  className,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={classNames("panel p-4 sm:p-5 flex flex-col min-w-0", className)}>
      <header className="flex items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div>
          <div className="eyebrow text-[10px] sm:text-[11px]">{subtitle ?? "Panel"}</div>
          <h3 className="text-[13px] sm:text-[15px] font-semibold text-ink mt-1">{title}</h3>
        </div>
        {action}
      </header>
      <div className="flex-1 min-w-0">{children}</div>
    </section>
  );
}

export function Empty({ label = "No data for current filters" }: { label?: string }) {
  return (
    <div className="h-full min-h-[120px] flex items-center justify-center text-center">
      <span className="mono text-xs text-muted-foreground uppercase tracking-[0.2em]">{label}</span>
    </div>
  );
}

export function Skeleton({ h = 200 }: { h?: number }) {
  return <div className="skeleton" style={{ height: h }} />;
}
