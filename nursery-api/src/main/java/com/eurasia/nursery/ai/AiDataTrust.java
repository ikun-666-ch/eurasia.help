package com.eurasia.nursery.ai;

import com.eurasia.nursery.service.DailyDataService;
import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

/** 提醒模型区分演示数据、自动填数和业务表里的数字。 */
@Component
public class AiDataTrust {

    private static final ZoneId SHANGHAI = ZoneId.of("Asia/Shanghai");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final DailyDataService dailyDataService;

    public AiDataTrust(DailyDataService dailyDataService) {
        this.dailyDataService = dailyDataService;
    }

    public String note() {
        String now = ZonedDateTime.now(SHANGHAI).format(TIME);
        boolean autoFill = dailyDataService.isAutoFillEnabled();
        String fill = autoFill
                ? "自动填数当前是开启的。库存趋势、销售趋势、财务销售趋势里可能含系统补上的数字，这些不能说成已经核对过的经营实绩。"
                : "自动填数当前是关闭的。趋势如果缺数，就说明还没有手工填写，不要补造。";
        return """
                数据可信度（必须遵守）：
                - 当前时点：%s（北京时间）。报数字时写上这个时点，并写明工具结果里的时间范围。
                - 没有月份、日期或 labels 的汇总，是截至当前的累计，不要说成「本月」或「今年」，除非字段名就是本月或趋势轴上有日期。
                - 业务表里可能仍有系统初始化的演示数据。不要把演示数或自动补数说成已核实结论；要直接说明这一点。
                - %s
                """.formatted(now, fill);
    }
}
