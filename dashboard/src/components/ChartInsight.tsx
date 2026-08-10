import { useState, useEffect } from "react";

type ChartInsightProps = {
  insight?: string;
};

export function ChartInsight({ insight }: ChartInsightProps) {
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
    <div
      className={`mt-3 pt-3 border-t border-line ${isVisible ? "fade-in" : "opacity-0"}`}
    >
      <p className="text-[12.5px] text-muted-foreground italic leading-relaxed">
        <span className="mr-1">✦</span>
        {insight}
      </p>
    </div>
  );
}
