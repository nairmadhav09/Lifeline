"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export type ChartColors = {
  accent: string;
  context: string;
  grid: string;
  axis: string;
  text: string;
  meta: string;
  surface: string;
};

const FALLBACK: ChartColors = {
  accent: "#4338ca",
  context: "#818cf8",
  grid: "#eef0f3",
  axis: "#cbd5e1",
  text: "#0f172a",
  meta: "#64748b",
  surface: "#ffffff",
};

/**
 * SVG presentation attributes can't reliably resolve CSS variables, so read
 * the resolved token values and re-read whenever the theme changes.
 */
export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<ChartColors>(FALLBACK);

  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- computed styles are only available after mount
    setColors({
      accent: read("--chart-accent", FALLBACK.accent),
      context: read("--chart-context", FALLBACK.context),
      grid: read("--chart-grid", FALLBACK.grid),
      axis: read("--chart-axis", FALLBACK.axis),
      text: read("--foreground", FALLBACK.text),
      meta: read("--text-meta", FALLBACK.meta),
      surface: read("--card", FALLBACK.surface),
    });
  }, [resolvedTheme]);

  return colors;
}
