import { fetchFinanceSalesTrend } from "@/api";
import Chart from "@/components/chart";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  MarkPointComponent,
  TooltipComponent,
} from "echarts/components";
import { useConfigStore } from "../stores";
import ChartFill from "./chartFill";
import ChartPlaceholder from "./chartPlaceholder";
import { resolveDailyTrendMessage } from "@/utils/dailyFillMessage";
import { useFinChartLoad } from "./useFinChartLoad";

const color = "#3061DB";

export default function Chart2({ refreshToken }: { refreshToken?: number }) {
  const selectedCity = useConfigStore((s) => s.selectedCity);
  const { data: trend, statusMessage } = useFinChartLoad(
    () => fetchFinanceSalesTrend(selectedCity),
    [selectedCity, refreshToken]
  );

  const emptyMessage = resolveDailyTrendMessage(statusMessage, trend);

  if (emptyMessage || !trend?.labels.length) {
    return <ChartPlaceholder message={emptyMessage ?? "需要手动填写"} />;
  }

  const { labels, thisYear } = trend;

  return (
    <ChartFill>
      <Chart
        use={[LineChart, TooltipComponent, GridComponent, MarkPointComponent]}
        option={{
          tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            textStyle: { color: "rgba(255, 255, 255,0.8)" },
            backgroundColor: "rgba(0, 0, 0,0.8)",
            borderColor: color,
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
            axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
            axisLabel: {
              interval: 0,
              color: "rgba(255, 255, 255, 0.6)",
              fontSize: 10,
            },
            splitLine: { show: false },
            axisTick: { show: false },
            data: labels,
          },
          yAxis: {
            type: "value",
            name: "万元",
            nameTextStyle: { color: "rgba(255,255,255,0.5)", fontSize: 10 },
            axisLabel: { color: "rgba(255, 255, 255, 0.6)" },
            splitLine: { show: false },
            axisLine: {
              show: true,
              lineStyle: { color: "rgba(255, 255, 255, 0.1)" },
            },
          },
          series: [
            {
              type: "line",
              symbol: "none",
              smooth: true,
              itemStyle: { color },
              areaStyle: {
                color: {
                  type: "linear",
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color },
                    { offset: 1, color: "rgba(0,0,0,0.1)" },
                  ],
                  global: false,
                },
              },
              markPoint: {
                symbol: "rect",
                symbolSize: [50, 20],
                symbolOffset: [0, -10],
                label: { color: "#ffffff" },
                data: [{ type: "max", name: "最大值" }],
              },
              data: thisYear,
            },
          ],
        }}
      />
    </ChartFill>
  );
}
