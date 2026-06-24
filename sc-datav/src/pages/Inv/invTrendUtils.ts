import {
  defaultInvTrend,
  recentDateLabels,
  type InvTrendConfig,
} from "@/components/panelEditor/panelConfigDefaults";
import { SHANXI_CITIES, TREND_WINDOW_DAYS } from "./constants";

export function trendSeriesLength(
  raw: Partial<InvTrendConfig> | null,
  fallback = 30
): number {
  if (raw?.labels?.length) return raw.labels.length;
  const cityLens = Object.values(raw?.cities ?? {}).map((a) => a?.length ?? 0);
  if (cityLens.length) return Math.max(...cityLens);
  return fallback;
}

/** 数值不变，横轴日期按「今天」往前推 N 天自动刷新 */
export function withRollingDateLabels(cfg: InvTrendConfig): InvTrendConfig {
  const len = Math.max(
    trendSeriesLength(cfg),
    ...SHANXI_CITIES.map((c) => cfg.cities[c]?.length ?? 0),
    1
  );
  const cities: Record<string, number[]> = {};
  for (const city of SHANXI_CITIES) {
    const prev = cfg.cities[city] ?? [];
    cities[city] = Array.from({ length: len }, (_, i) => Number(prev[i]) || 0);
  }
  return { labels: recentDateLabels(len), cities };
}

export function computeProvinceSeries(cfg: InvTrendConfig): number[] {
  return cfg.labels.map((_, i) =>
    SHANXI_CITIES.reduce((sum, city) => sum + (cfg.cities[city]?.[i] ?? 0), 0)
  );
}

export function getCitySeries(cfg: InvTrendConfig, city: string): number[] {
  return cfg.labels.map((_, i) => cfg.cities[city]?.[i] ?? 0);
}

export function latestCityTotals(cfg: InvTrendConfig): {
  labels: string[];
  values: number[];
} {
  const idx = Math.max(0, cfg.labels.length - 1);
  return {
    labels: [...SHANXI_CITIES],
    values: SHANXI_CITIES.map((city) => cfg.cities[city]?.[idx] ?? 0),
  };
}

export function normalizeInvTrend(
  raw: Partial<InvTrendConfig> | null
): InvTrendConfig {
  const base = defaultInvTrend();
  const hasCities =
    raw?.cities && Object.keys(raw.cities).length > 0;
  if (!hasCities && !raw?.labels?.length) {
    return withRollingDateLabels(base);
  }

  const len = trendSeriesLength(raw);
  const cities: Record<string, number[]> = {};
  for (const city of SHANXI_CITIES) {
    const prev = raw?.cities?.[city] ?? base.cities[city] ?? [];
    cities[city] = Array.from({ length: len }, (_, i) =>
      Number(prev[i] ?? base.cities[city]?.[i]) || 0
    );
  }
  return withRollingDateLabels({ labels: [], cities });
}

export function resizeInvTrendSeries(
  cfg: InvTrendConfig,
  city: string,
  values: number[]
): InvTrendConfig {
  const len = values.length;
  const cities: Record<string, number[]> = {};
  for (const c of SHANXI_CITIES) {
    const prev = cfg.cities[c] ?? [];
    cities[c] =
      c === city
        ? values
        : Array.from({ length: len }, (_, i) => prev[i] ?? 0);
  }
  return withRollingDateLabels({ labels: [], cities });
}

export function trendWindowStart(length: number) {
  return Math.max(0, length - TREND_WINDOW_DAYS);
}

export function trendWindowEnd(length: number) {
  return Math.max(0, length - 1);
}
