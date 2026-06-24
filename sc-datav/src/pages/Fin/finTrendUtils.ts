import { forecastDateLabels } from "@/components/panelEditor/panelConfigDefaults";
import { CITY_SALES_WEIGHTS } from "@/data/shaanxiFinance";
import { FIN_TREND_PANEL_KEY, SHANXI_CITIES, TREND_WINDOW_DAYS } from "./constants";

export type FinTrendConfig = {
  labels: string[];
  cities: Record<string, { thisYear: number[]; lastYear: number[] }>;
};

export { FIN_TREND_PANEL_KEY };

function trendSeriesLength(
  raw: Partial<FinTrendConfig> | null,
  fallback = 30
): number {
  if (raw?.labels?.length) return raw.labels.length;
  const lens = Object.values(raw?.cities ?? {}).flatMap((c) => [
    c?.thisYear?.length ?? 0,
    c?.lastYear?.length ?? 0,
  ]);
  if (lens.length) return Math.max(...lens);
  return fallback;
}

export function withRollingFinLabels(cfg: FinTrendConfig): FinTrendConfig {
  const len = Math.max(
    trendSeriesLength(cfg),
    ...SHANXI_CITIES.map(
      (c) =>
        Math.max(
          cfg.cities[c]?.thisYear?.length ?? 0,
          cfg.cities[c]?.lastYear?.length ?? 0
        ) || 0
    ),
    1
  );
  const cities: FinTrendConfig["cities"] = {};
  for (const city of SHANXI_CITIES) {
    const prev = cfg.cities[city] ?? { thisYear: [], lastYear: [] };
    cities[city] = {
      thisYear: Array.from({ length: len }, (_, i) => Number(prev.thisYear[i]) || 0),
      lastYear: Array.from({ length: len }, (_, i) => Number(prev.lastYear[i]) || 0),
    };
  }
  return { labels: forecastDateLabels(len), cities };
}

export function defaultFinTrend(): FinTrendConfig {
  const thisTpl = [2.45, 2.48, 2.5, 2.55, 2.58, 2.6, 2.63, 2.65, 2.68, 2.7];
  const lastTpl = [2.12, 2.14, 2.16, 2.18, 2.2, 2.22, 2.25, 2.27, 2.29, 2.31];
  const cities: FinTrendConfig["cities"] = {};

  SHANXI_CITIES.forEach((city) => {
    const weight = CITY_SALES_WEIGHTS[city] / 100;
    cities[city] = {
      thisYear: thisTpl.map((v) => Math.round(v * weight * 100) / 100),
      lastYear: lastTpl.map((v) => Math.round(v * weight * 100) / 100),
    };
  });

  return withRollingFinLabels({ labels: [], cities });
}

export function normalizeFinTrend(
  raw: Partial<FinTrendConfig> | null
): FinTrendConfig {
  const base = defaultFinTrend();
  const hasCities =
    raw?.cities && Object.keys(raw.cities).length > 0;
  if (!hasCities && !raw?.labels?.length) {
    return withRollingFinLabels(base);
  }

  const len = trendSeriesLength(raw);
  const cities: FinTrendConfig["cities"] = {};
  for (const city of SHANXI_CITIES) {
    const prev = raw?.cities?.[city] ?? base.cities[city] ?? {
      thisYear: [],
      lastYear: [],
    };
    cities[city] = {
      thisYear: Array.from({ length: len }, (_, i) =>
        Number(prev.thisYear?.[i] ?? base.cities[city]?.thisYear?.[i]) || 0
      ),
      lastYear: Array.from({ length: len }, (_, i) =>
        Number(prev.lastYear?.[i] ?? base.cities[city]?.lastYear?.[i]) || 0
      ),
    };
  }
  return withRollingFinLabels({ labels: [], cities });
}

export function computeProvinceThisYear(cfg: FinTrendConfig): number[] {
  return cfg.labels.map((_, i) =>
    SHANXI_CITIES.reduce((sum, city) => sum + (cfg.cities[city]?.thisYear[i] ?? 0), 0)
  );
}

export function computeProvinceLastYear(cfg: FinTrendConfig): number[] {
  return cfg.labels.map((_, i) =>
    SHANXI_CITIES.reduce((sum, city) => sum + (cfg.cities[city]?.lastYear[i] ?? 0), 0)
  );
}

export function getCityThisYear(cfg: FinTrendConfig, city: string): number[] {
  return cfg.labels.map((_, i) => cfg.cities[city]?.thisYear[i] ?? 0);
}

export function getCityLastYear(cfg: FinTrendConfig, city: string): number[] {
  return cfg.labels.map((_, i) => cfg.cities[city]?.lastYear[i] ?? 0);
}

export function resizeFinCitySeries(
  cfg: FinTrendConfig,
  city: string,
  thisYear: number[],
  lastYear: number[]
): FinTrendConfig {
  const len = thisYear.length;
  const cities: FinTrendConfig["cities"] = {};
  for (const c of SHANXI_CITIES) {
    const prev = cfg.cities[c] ?? { thisYear: [], lastYear: [] };
    cities[c] =
      c === city
        ? { thisYear, lastYear }
        : {
            thisYear: Array.from({ length: len }, (_, i) => prev.thisYear[i] ?? 0),
            lastYear: Array.from({ length: len }, (_, i) => prev.lastYear[i] ?? 0),
          };
  }
  return withRollingFinLabels({ labels: [], cities });
}

export function trendWindowStart(length: number) {
  return Math.max(0, length - TREND_WINDOW_DAYS);
}

export function trendWindowEnd(length: number) {
  return Math.max(0, length - 1);
}
