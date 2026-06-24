import { fetchInventoryIoTrend } from "@/api";
import { useMapStyleStore } from "../stores";
import Chart from "@/components/chart";
import { LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkPointComponent,
  TooltipComponent,
} from "echarts/components";
import { TREND_WINDOW_DAYS } from "../constants";
import { trendWindowEnd, trendWindowStart } from "../invTrendUtils";
import { resolveDailyTrendMessage } from "@/utils/dailyFillMessage";
import { useInvChartLoad } from "./useInvChartLoad";

const colors = ["#ACA891", "#6E918C"];

export default function Chart2({ refreshToken }: { refreshToken?: number }) {
  const selectedCity = useMapStyleStore((s) => s.selectedCity);
  const { data: trend, statusMessage } = useInvChartLoad(
    () => fetchInventoryIoTrend(selectedCity),
    [refreshToken, selectedCity]
  );

  const emptyMessage = resolveDailyTrendMessage(statusMessage, trend);

  if (emptyMessage || !trend?.labels.length) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.55)",
          fontSize: 13,
        }}>
        {emptyMessage ?? "需要手动填写"}
      </div>
    );
  }

  const { labels, inbound, outbound } = trend;
  const winStart = trendWindowStart(labels.length);
  const winEnd = trendWindowEnd(labels.length);
  const showSlider = labels.length > TREND_WINDOW_DAYS;

  return (
    <Chart
      use={[
        LineChart,
        LegendComponent,
        DataZoomComponent,
        MarkPointComponent,
        TooltipComponent,
        GridComponent,
      ]}
      option={{
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "line" },
          textStyle: { color: "#fff" },
          backgroundColor: "rgba(110,145,140,0.3)",
          borderColor: colors[1],
          borderWidth: 1,
          borderRadius: 8,
        },
        grid: {
          top: 28,
          bottom: showSlider ? 48 : 16,
          left: 16,
          right: 16,
          outerBoundsMode: "same",
        },
        legend: {
          right: 16,
          top: 0,
          data: [
            { name: "入库", icon: "none", textStyle: { color: colors[0] } },
            { name: "出库", icon: "none", textStyle: { color: colors[1] } },
          ],
        },
        xAxis: {
          type: "category",
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
          axisLabel: { color: "rgba(255, 255, 255, 0.6)" },
          splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
          axisLine: {
            show: true,
            lineStyle: { color: "rgba(255, 255, 255, 0.1)" },
          },
        },
        dataZoom: [
          {
            type: "slider",
            show: showSlider,
            height: 18,
            bottom: 6,
            borderColor: "rgba(255,255,255,0.15)",
            fillerColor: "rgba(110,145,140,0.25)",
            handleStyle: { color: colors[0] },
            textStyle: { color: "rgba(255,255,255,0.5)", fontSize: 10 },
            startValue: winStart,
            endValue: winEnd,
          },
          {
            type: "inside",
            startValue: winStart,
            endValue: winEnd,
          },
        ],
        series: [
          {
            name: "入库",
            type: "line",
            symbol: "none",
            smooth: true,
            itemStyle: { color: colors[0] },
            markPoint: {
              symbol: "rect",
              symbolSize: [50, 20],
              symbolOffset: [0, -10],
              data: [{ type: "max", name: "最大值" }],
            },
            data: inbound,
          },
          {
            name: "出库",
            type: "line",
            symbol: "none",
            smooth: true,
            itemStyle: { color: colors[1] },
            markPoint: {
              symbol: "rect",
              symbolSize: [50, 20],
              symbolOffset: [0, -10],
              data: [{ type: "max", name: "最大值" }],
            },
            data: outbound,
          },
        ],
      }}
    />
  );
}
