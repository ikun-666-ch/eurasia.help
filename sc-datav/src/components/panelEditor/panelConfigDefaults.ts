export type DualLineConfig = {
  labels: string[];
  series1: number[];
  series2: number[];
  title1: string;
  title2: string;
};

/** 库存趋势：各地市序列；全省 = 各市值按日相加 */
export type InvTrendConfig = {
  labels: string[];
  cities: Record<string, number[]>;
};

export type IoLineConfig = {
  labels: string[];
  inbound: number[];
  outbound: number[];
};

export type BarConfig = {
  labels: string[];
  values: number[];
};

export type PieConfig = {
  items: { name: string; value: number }[];
};

export type RankBarConfig = {
  labels: string[];
  values: number[];
};

export type RevenueConfig = {
  values: number[];
  total: number;
  companyCount: number;
};

export type StatsConfig = {
  items: {
    label: string;
    value: number;
    label2: string;
    value2: number;
    unit: string;
  }[];
};

export type RadarConfig = {
  indicators: { name: string; max: number }[];
  values: number[];
};

export type AssetExtraConfig = {
  growthRates: number[];
  pieItems: { name: string; value: number }[];
};

function randSeries(n: number, max = 1000) {
  return Array.from({ length: n }, () => Math.round(Math.random() * max));
}

/** 未来 N 天 MM-DD 日期标签（含今天） */
export function forecastDateLabels(days: number): string[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}

/** 最近 N 天的 MM-DD 日期标签（含今天） */
export function recentDateLabels(days: number): string[] {
  const now = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}

export function resizeIoLineLabels(
  cfg: IoLineConfig,
  labels: string[]
): IoLineConfig {
  const len = labels.length;
  const pad = (arr: number[]) =>
    Array.from({ length: len }, (_, i) => arr[i] ?? 0);
  return { labels, inbound: pad(cfg.inbound), outbound: pad(cfg.outbound) };
}

function ioSeriesLength(raw: Partial<IoLineConfig> | null, fallback = 30): number {
  if (raw?.labels?.length) return raw.labels.length;
  return Math.max(raw?.inbound?.length ?? 0, raw?.outbound?.length ?? 0, fallback);
}

/** 数值不变，日期按今天往前自动滚动 */
export function withRollingIoLabels(cfg: IoLineConfig): IoLineConfig {
  const len = ioSeriesLength(cfg);
  return resizeIoLineLabels(cfg, recentDateLabels(len));
}

/** 将旧版 D1/D2 占位或已存配置规范为固定数值 + 滚动日期 */
export function normalizeIoLine(raw: Partial<IoLineConfig> | null): IoLineConfig {
  const base = defaultIoLine();
  const hasValues =
    (raw?.inbound?.length ?? 0) > 0 || (raw?.outbound?.length ?? 0) > 0;
  if (!hasValues && !raw?.labels?.length) {
    return withRollingIoLabels(base);
  }

  const len = ioSeriesLength(raw);
  const inbound = Array.from({ length: len }, (_, i) =>
    Number(raw?.inbound?.[i] ?? base.inbound[i]) || 0
  );
  const outbound = Array.from({ length: len }, (_, i) =>
    Number(raw?.outbound?.[i] ?? base.outbound[i]) || 0
  );
  return withRollingIoLabels({ labels: [], inbound, outbound });
}

import type { ShaanxiCity } from "@/pages/Inv/constants";
import { CITY_LATEST_TOTALS } from "@/data/shaanxiInventory";

export function defaultInvTrend(): InvTrendConfig {
  const days = 30;

  const cityNames = [
    "西安市",
    "铜川市",
    "宝鸡市",
    "咸阳市",
    "渭南市",
    "延安市",
    "汉中市",
    "榆林市",
    "安康市",
    "商洛市",
  ];

  const cities: Record<string, number[]> = {};
  cityNames.forEach((city, ci) => {
    const target = CITY_LATEST_TOTALS[city as ShaanxiCity];
    cities[city] = Array.from({ length: days }, (_, i) => {
      if (i === days - 1) return target;
      const t = i / Math.max(days - 1, 1);
      return Math.round(target * (0.88 + t * 0.12) + Math.sin(i * 0.45 + ci) * 6);
    });
    cities[city][days - 1] = target;
  });

  return { labels: recentDateLabels(days), cities };
}

export function defaultDualLine(): DualLineConfig {
  const labels = Array.from({ length: 12 }, (_, i) => `06-${String(i + 1).padStart(2, "0")}`);
  return {
    labels,
    series1: randSeries(12, 1000),
    series2: randSeries(12, 800),
    title1: "全省",
    title2: "西安市",
  };
}

export function defaultIoLine(): IoLineConfig {
  const days = 30;
  const labels = recentDateLabels(days);
  return {
    labels,
    inbound: randSeries(days, 500),
    outbound: randSeries(days, 400),
  };
}

export function defaultBar(labels = ["Q1", "Q2", "Q3", "Q4"], values = [2000, 3000, 4000, 5000]): BarConfig {
  return { labels, values };
}

export function defaultPie(): PieConfig {
  return {
    items: [
      { name: "一季度", value: 40 },
      { name: "二季度", value: 25 },
      { name: "三季度", value: 20 },
      { name: "四季度", value: 15 },
    ],
  };
}

export function defaultRankBar(): RankBarConfig {
  return {
    labels: ["西安", "宝鸡", "咸阳", "渭南", "汉中"],
    values: [92, 85, 78, 72, 68],
  };
}

export function defaultRevenue(): RevenueConfig {
  return { values: randSeries(12, 900), total: 99608, companyCount: 7792 };
}

export function defaultStats(): StatsConfig {
  return {
    items: [
      { label: "苗圃地块", value: 128, label2: "覆盖", value2: 86, unit: "处" },
      { label: "育苗大棚", value: 45, label2: "在用", value2: 38, unit: "座" },
      { label: "灌溉设施", value: 210, label2: "正常", value2: 198, unit: "套" },
      { label: "仓储库位", value: 64, label2: "占用", value2: 51, unit: "个" },
    ],
  };
}

export function defaultRadar(): RadarConfig {
  return {
    indicators: [
      { name: "西安", max: 100 },
      { name: "宝鸡", max: 100 },
      { name: "咸阳", max: 100 },
      { name: "渭南", max: 100 },
      { name: "汉中", max: 100 },
    ],
    values: [88, 72, 65, 58, 50],
  };
}

export function defaultAssetExtra(): AssetExtraConfig {
  return {
    growthRates: [12, 18, 8, 15],
    pieItems: [
      { name: "Q1", value: 30 },
      { name: "Q2", value: 25 },
      { name: "Q3", value: 25 },
      { name: "Q4", value: 20 },
    ],
  };
}

export function csvNums(s: string) {
  return s
    .split(/[,，\s]+/)
    .map((x) => Number(x.trim()))
    .filter((n) => !Number.isNaN(n));
}

export function csvStr(s: string) {
  return s.split(/[,，]/).map((x) => x.trim()).filter(Boolean);
}
