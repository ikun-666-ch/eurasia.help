import { fetchSalesOrderTrend } from "@/api";
import Chart from "@/components/chart";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  MarkPointComponent,
  TooltipComponent,
} from "echarts/components";
import { useConfigStore } from "../stores";
import { resolveDailyTrendMessage } from "@/utils/dailyFillMessage";
import ChartPlaceholder from "./chartPlaceholder";
import { useSalChartLoad } from "./useSalChartLoad";

const lineColor = "#000000";
const accentColor = "#ea580c";

export default function Chart2({ refreshToken }: { refreshToken?: number }) {
  const selectedCity = useConfigStore((s) => s.selectedCity);
  const { data: trend, statusMessage } = useSalChartLoad(
    () => fetchSalesOrderTrend(selectedCity),
    [selectedCity, refreshToken]
  );

  const emptyMessage = resolveDailyTrendMessage(statusMessage, trend);

  if (emptyMessage || !trend?.labels.length) {
    return <ChartPlaceholder message={emptyMessage ?? "需要手动填写"} />;
  }

  const { labels, amounts } = trend;

  return (
    <Chart
      use={[LineChart, TooltipComponent, GridComponent, MarkPointComponent]}
      option={{
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          textStyle: { color: "rgba(0, 0, 0,0.8)" },
          backgroundColor: "rgba(255, 245, 232,0.8)",
          borderColor: accentColor,
          borderWidth: 1,
          borderRadius: 8,
          valueFormatter: (v: number) => `${v} 万元`,
        },
        grid: {
          top: 16,
          bottom: 16,
          left: 16,
          right: 16,
          outerBoundsMode: "same",
        },
        xAxis: {
          type: "category",
          boundaryGap: false,
          axisLine: { lineStyle: { color: "rgba(0, 0, 0, 0.1)" } },
          axisLabel: {
            interval: 4,
            color: "rgba(0, 0, 0, 0.6)",
            fontSize: 10,
          },
          splitLine: { show: false },
          axisTick: { show: false },
          data: labels,
        },
        yAxis: {
          type: "value",
          name: "万元",
          nameTextStyle: { color: "rgba(0,0,0,0.45)", fontSize: 10 },
          axisLabel: { color: "rgba(0, 0, 0, 0.6)" },
          splitLine: { show: false },
          axisLine: {
            show: true,
            lineStyle: { color: "rgba(0, 0, 0, 0.1)" },
          },
        },
        series: [
          {
            type: "line",
            symbol: "none",
            smooth: true,
            itemStyle: { color: lineColor },
            lineStyle: { color: lineColor, width: 2 },
            areaStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: "rgba(0, 0, 0, 0.12)" },
                  { offset: 1, color: "rgba(255,255,255,0.1)" },
                ],
                global: false,
              },
            },
            markPoint: {
              symbol: "rect",
              symbolSize: [50, 20],
              symbolOffset: [0, -10],
              itemStyle: { color: lineColor },
              label: { color: "#ffffff" },
              data: [{ type: "max", name: "最大值" }],
            },
            data: amounts,
          },
        ],
      }}
    />
  );
}
