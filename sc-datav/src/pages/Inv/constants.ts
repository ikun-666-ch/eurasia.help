/** 陕西省 GeoJSON 中的 10 个地市（与 sc.json / 台账 city 字段一致） */
export const SHANXI_CITIES = [
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
] as const;

export type ShaanxiCity = (typeof SHANXI_CITIES)[number];

export const INV_TREND_PANEL_KEY = "inv.trend";

export const TREND_WINDOW_DAYS = 10;
