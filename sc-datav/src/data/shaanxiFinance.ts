import type { ShaanxiCity } from "@/pages/Inv/constants";

/** 各地市销售额权重（%），相加 = 100 */
export const CITY_SALES_WEIGHTS: Record<ShaanxiCity, number> = {
  西安市: 22,
  铜川市: 5,
  宝鸡市: 12,
  咸阳市: 11,
  渭南市: 10,
  延安市: 8,
  汉中市: 9,
  榆林市: 13,
  安康市: 6,
  商洛市: 4,
};

export function citySalesShare(city: ShaanxiCity): number {
  return CITY_SALES_WEIGHTS[city] / 100;
}

export const PROVINCE_SALES_WEIGHT = 1;
