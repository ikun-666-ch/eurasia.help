import { SHANXI_CITIES, type ShaanxiCity } from "@/pages/Inv/constants";

/** 陕西市区县映射表 */
export const SHAANXI_CITY_DISTRICTS: Record<ShaanxiCity, readonly string[]> = {
  西安市: [
    "雁塔区",
    "未央区",
    "长安区",
    "碑林区",
    "莲湖区",
    "新城区",
    "灞桥区",
    "鄠邑区",
    "临潼区",
    "高陵区",
    "阎良区",
    "蓝田县",
    "周至县",
  ],
  铜川市: ["耀州区", "王益区", "印台区", "宜君县"],
  宝鸡市: [
    "渭滨区",
    "金台区",
    "陈仓区",
    "凤翔区",
    "岐山县",
    "扶风县",
    "眉县",
    "陇县",
    "千阳县",
    "麟游县",
    "凤县",
    "太白县",
  ],
  咸阳市: [
    "秦都区",
    "渭城区",
    "兴平市",
    "杨陵区",
    "彬州市",
    "三原县",
    "泾阳县",
    "乾县",
    "礼泉县",
    "武功县",
    "永寿县",
    "长武县",
    "旬邑县",
    "淳化县",
  ],
  渭南市: [
    "临渭区",
    "韩城市",
    "蒲城县",
    "华阴市",
    "大荔县",
    "华州区",
    "富平县",
    "澄城县",
    "合阳县",
    "白水县",
    "潼关县",
  ],
  延安市: [
    "宝塔区",
    "安塞区",
    "子长市",
    "志丹县",
    "吴起县",
    "延川县",
    "洛川县",
    "富县",
    "甘泉县",
    "延长县",
    "宜川县",
    "黄龙县",
    "黄陵县",
  ],
  汉中市: [
    "汉台区",
    "南郑区",
    "城固县",
    "洋县",
    "西乡县",
    "勉县",
    "宁强县",
    "略阳县",
    "镇巴县",
    "留坝县",
    "佛坪县",
  ],
  榆林市: [
    "榆阳区",
    "神木市",
    "府谷县",
    "靖边县",
    "定边县",
    "横山区",
    "绥德县",
    "米脂县",
    "佳县",
    "吴堡县",
    "清涧县",
    "子洲县",
  ],
  安康市: [
    "汉滨区",
    "旬阳市",
    "紫阳县",
    "汉阴县",
    "石泉县",
    "平利县",
    "岚皋县",
    "白河县",
    "宁陕县",
    "镇坪县",
  ],
  商洛市: ["商州区", "洛南县", "山阳县", "丹凤县", "商南县", "镇安县", "柞水县"],
};

export { SHANXI_CITIES };

/** 与 SalesSchema::skuLines 品种一致 */
export const NURSERY_VARIETIES = ["国槐", "银杏", "白皮松", "紫叶李", "连翘"] as const;

export function districtsForCity(city: string): string[] {
  if (!city) return [];
  const list = SHAANXI_CITY_DISTRICTS[city as ShaanxiCity];
  return list ? [...list] : [];
}

export function mergeSelectOptions(base: readonly string[], current: string): string[] {
  const set = new Set(base);
  if (current.trim()) set.add(current.trim());
  return [...set].sort((a, b) => a.localeCompare(b, "zh-CN"));
}
