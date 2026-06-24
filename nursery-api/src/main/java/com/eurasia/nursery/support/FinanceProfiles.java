package com.eurasia.nursery.support;

import java.util.LinkedHashMap;
import java.util.Map;

/** 对齐 PHP FinanceSchema.cityProfiles 默认值 */
public final class FinanceProfiles {

    private FinanceProfiles() {}

    public static Map<String, Map<String, Double>> cityProfiles() {
        Map<String, Map<String, Double>> m = new LinkedHashMap<>();
        m.put("西安市", profile(15, 22, 28, 26, 24, 22));
        m.put("铜川市", profile(8, 12, 22, 24, 28, 26));
        m.put("宝鸡市", profile(10, 16, 26, 28, 23, 23));
        m.put("咸阳市", profile(11, 17, 32, 22, 26, 20));
        m.put("渭南市", profile(9, 14, 24, 26, 27, 23));
        m.put("延安市", profile(14, 19, 20, 22, 30, 28));
        m.put("汉中市", profile(10, 15, 27, 25, 24, 24));
        m.put("榆林市", profile(18, 24, 35, 28, 20, 17));
        m.put("安康市", profile(7, 11, 23, 27, 26, 24));
        m.put("商洛市", profile(6, 10, 21, 23, 28, 28));
        return m;
    }

    private static Map<String, Double> profile(double cum, double yoy, double q1, double q2, double q3, double q4) {
        Map<String, Double> p = new LinkedHashMap<>();
        p.put("growth_rate_cumulative", cum);
        p.put("growth_rate_yoy", yoy);
        p.put("q1_share", q1);
        p.put("q2_share", q2);
        p.put("q3_share", q3);
        p.put("q4_share", q4);
        return p;
    }
}
