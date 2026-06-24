import { fetchInventoryDailyTrend } from "@/api";
import Chart from "@/components/chart";
import { LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { useMapStyleStore } from "../stores";
import { TREND_WINDOW_DAYS } from "../constants";
import { trendWindowEnd, trendWindowStart } from "../invTrendUtils";
import { resolveDailyTrendMessage } from "@/utils/dailyFillMessage";
import { useInvChartLoad } from "./useInvChartLoad";

const colors = ["#ACA891", "#6E918C"];

export default function Chart1({ refreshToken }: { refreshToken?: number }) {
  const selectedCity = useMapStyleStore((s) => s.selectedCity);
  const { data: trend, statusMessage } = useInvChartLoad(
    () => fetchInventoryDailyTrend(selectedCity),
    [selectedCity, refreshToken]
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

  const { labels, values } = trend;
  const winStart = trendWindowStart(labels.length);
  const winEnd = trendWindowEnd(labels.length);

  return (
    <Chart
      use={[
        LineChart,
        TitleComponent,
        VisualMapComponent,
        TooltipComponent,
        GridComponent,
        DataZoomComponent,
      ]}
      option={{
        visualMap: {
          show: false,
          type: "continuous",
          seriesIndex: 0,
          min: 0,
          max: Math.max(...values, 350),
          color: colors,
        },
        title: {
          left: "center",
          text: selectedCity ?? "全省",
          textStyle: { color: "rgba(255, 255, 255, 0.6)" },
        },
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
          top: "14%",
          left: 16,
          right: 16,
          bottom: 48,
          outerBoundsMode: "same",
        },
        xAxis: {
          axisLabel: { color: "rgba(255, 255, 255, 0.6)" },
          data: labels,
        },
        yAxis: {
          name: "万株",
          nameTextStyle: { color: "rgba(255, 255, 255, 0.45)", fontSize: 10 },
          axisLabel: { color: "rgba(255, 255, 255, 0.6)" },
          splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
        },
        dataZoom: [
          {
            type: "slider",
            show: labels.length > TREND_WINDOW_DAYS,
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
        series: [{ type: "line", showSymbol: false, smooth: true, data: values }],
      }}
    />
  );
}
