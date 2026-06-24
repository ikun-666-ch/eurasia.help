import type { ShaanxiCity } from "@/pages/Inv/constants";

/** 各地市当前库存合计（万株），相加 = 全省总量 */
export const CITY_LATEST_TOTALS: Record<ShaanxiCity, number> = {
  西安市: 42,
  铜川市: 28,
  宝鸡市: 38,
  咸阳市: 35,
  渭南市: 32,
  延安市: 26,
  汉中市: 34,
  榆林市: 36,
  安康市: 30,
  商洛市: 29,
};

export const PROVINCE_INVENTORY_TOTAL = Object.values(
  CITY_LATEST_TOTALS
).reduce((s, v) => s + v, 0);
