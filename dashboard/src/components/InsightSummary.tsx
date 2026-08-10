import { useState, useEffect } from "react";

type InsightSummaryProps = {
  insight?: string;
};

export function InsightSummary({ insight }: InsightSummaryProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in after a short delay
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  if (!insight) {
    return null;
  }

  return (
    <section
      className={`panel p-4 sm:p-5 mb-4 sm:mb-6 ${isVisible ? "fade-in" : "opacity-0"}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] kt-gradient-text">
          ✦ AI Summary
        </span>
      </div>
      <p className="text-[15px] sm:text-[16px] leading-relaxed text-ink">
        {insight}
      </p>
    </section>
  );
}
