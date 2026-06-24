import { useMemo, type ReactNode } from "react";
import SeamVirtualScroll from "@/components/seamVirtualScroll";
import { fetchFinanceSummary } from "@/api";
import { useConfigStore } from "../stores";
import ChartFill from "./chartFill";
import ChartPlaceholder from "./chartPlaceholder";
import { useFinChartLoad } from "./useFinChartLoad";

export default function Chart6({ refreshToken }: { refreshToken?: number }) {
  const selectedCity = useConfigStore((s) => s.selectedCity);
  const { data: summary, statusMessage } = useFinChartLoad(
    () => fetchFinanceSummary(selectedCity),
    [selectedCity, refreshToken]
  );

  const data = useMemo(() => {
    if (!summary) return [] as Record<string, ReactNode>[];
    return summary.months.map((m, k) => {
      const rev =
        Math.round((Number(summary.revenue[k] || 0) / 10000) * 10) / 10;
      const profit =
        Math.round((Number(summary.profit[k] || 0) / 10000) * 10) / 10;
      const ok = rev > 0 && profit >= 0;
      return {
        value1: k + 1,
        value2: `${m.replace("-", "年")}月报`,
        value3: rev,
        value4: profit,
        value5: (
          <span style={{ color: ok ? "#86efac" : "#fca5a5" }}>
            {ok ? "已核对" : "待复核"}
          </span>
        ),
      };
    });
  }, [summary]);

  if (statusMessage) {
    return <ChartPlaceholder message={statusMessage} />;
  }

  return (
    <ChartFill>
    <SeamVirtualScroll
      rowHeight={50}
      styles={{
        header: { color: "rgba(255, 255, 255, 0.6)" },
        body: { color: "#3061DB" },
      }}
      column={[
        { title: "序号", dataIndex: "value1", noScroll: true },
        { title: "报表项目", dataIndex: "value2", align: "center", noScroll: true },
        { title: "收入(万)", dataIndex: "value3", align: "right", noScroll: true },
        { title: "利润(万)", dataIndex: "value4", align: "right", noScroll: true },
        { title: "处理状态", dataIndex: "value5", align: "right", noScroll: true },
      ]}
      data={
        data.length
          ? data
          : [{ value1: "—", value2: "加载中…", value3: "", value4: "", value5: "" }]
      }
    />
    </ChartFill>
  );
}
