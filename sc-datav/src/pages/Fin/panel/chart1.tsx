import { useMemo } from "react";
import Chart from "@/components/chart";
import { fetchFinanceSummary } from "@/api";
import { BarChart, PictorialBarChart } from "echarts/charts";
import styled from "styled-components";
import NumberAnimation from "@/components/numberAnimation";
import { PieChart, type PieSeriesOption } from "echarts/charts";
import type { ComposeOption } from "echarts/core";
import {
  GraphicComponent,
  GridComponent,
  TooltipComponent,
  type GridComponentOption,
  type LegendComponentOption,
  type TooltipComponentOption,
} from "echarts/components";
import { LegacyGridContainLabel } from "echarts/features";
import type { BarSeriesOption, PictorialBarSeriesOption } from "echarts";
import { useConfigStore } from "../stores";
import ChartPlaceholder from "./chartPlaceholder";
import { useFinChartLoad } from "./useFinChartLoad";

type BarOption = ComposeOption<
  | PictorialBarSeriesOption
  | BarSeriesOption
  | LegendComponentOption
  | GridComponentOption
>;

type PieOption = ComposeOption<PieSeriesOption | TooltipComponentOption>;

const color = ["#bdcfff", "#b693e2", "#91cfd4", "#3061DB"];

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Statistics = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const StatisticsTitle = styled.div`
  font-size: 15px;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
`;

const StatisticsNumber = styled(NumberAnimation)`
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 24px;
  font-weight: 600;
  color: #3061db;
  flex-shrink: 0;

  &::after {
    content: "万元";
    display: inline-block;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: normal;
  }
`;

const GrowthChart = styled.div`
  flex-shrink: 0;
  height: 68px;
  min-height: 68px;
  overflow: hidden;
`;

const PieChartWrap = styled.div`
  flex: 1;
  min-height: 0;
`;

const growthLabels = ["累计增长率", "同比增长率"];

export default function Chart1({ refreshToken }: { refreshToken?: number }) {
  const selectedCity = useConfigStore((s) => s.selectedCity);
  const { data: summary, statusMessage } = useFinChartLoad(
    () => fetchFinanceSummary(selectedCity),
    [selectedCity, refreshToken]
  );

  const assetWan = (summary?.assetValue ?? 0) / 10000;
  const growthRates = summary?.growthRates ?? [12, 18];
  const pieItems = summary?.pieItems ?? [];

  const yName = growthLabels;
  const xData = [growthRates[0] ?? 0, growthRates[1] ?? 0];
  const barWidth = 7;
  const list = yName.map((name, i) => ({ name, value: xData[i] ?? 0 }));

  const pieData = useMemo(
    () =>
      pieItems.map((cur, i) => ({
        value: cur.value,
        name: cur.name,
        itemStyle: {
          borderRadius: 6,
          color: color[i % color.length],
        },
      })),
    [pieItems]
  );

  if (statusMessage || !summary) {
    return (
      <ChartPlaceholder
        message={statusMessage ?? "暂无财务数据，请运行 php scripts/reseed-finance.php"}
      />
    );
  }

  return (
    <Wrapper>
      <Statistics>
        <StatisticsTitle>
          {selectedCity ? `${selectedCity}资产` : "资产总值"}
        </StatisticsTitle>
        <StatisticsNumber
          value={assetWan}
          options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
        />
      </Statistics>

      <GrowthChart>
        <Chart<BarOption>
          use={[
            PictorialBarChart,
            BarChart,
            GridComponent,
            LegacyGridContainLabel,
          ]}
          option={{
            grid: { containLabel: true, top: 4, left: 0, right: 40, bottom: 4 },
            xAxis: {
              splitLine: { show: false },
              axisLabel: { show: false },
              axisTick: { show: false },
              axisLine: { show: false },
            },
            yAxis: {
              gridIndex: 0,
              inverse: true,
              position: "right",
              axisLine: { show: false },
              axisTick: { show: false },
              axisLabel: {
                margin: 6,
                fontSize: 11,
                color: "rgba(255,255,255,0.75)",
              },
              data: yName,
            },
            series: [
              {
                type: "bar",
                barWidth,
                legendHoverLink: false,
                silent: true,
                itemStyle: {
                  color: {
                    type: "linear",
                    x: 0,
                    y: 0,
                    x2: 1,
                    y2: 0,
                    colorStops: [
                      { offset: 0, color: "#000000" },
                      { offset: 1, color: "#3061DB" },
                    ],
                  },
                },
                data: list,
                z: 1,
                animationEasing: "elasticOut",
              },
              {
                type: "pictorialBar",
                animationDuration: 0,
                symbolRepeat: "fixed",
                symbolMargin: "20%",
                symbol: "rect",
                symbolSize: barWidth,
                itemStyle: { color: "#83848d" },
                label: {
                  show: true,
                  position: "right",
                  distance: 4,
                  color: "#3061DB",
                  fontSize: 11,
                  formatter: `{c}%`,
                },
                data: xData,
                z: 0,
                animationEasing: "elasticOut",
              },
              {
                type: "pictorialBar",
                itemStyle: { color: "#000" },
                symbolRepeat: "fixed",
                symbolMargin: barWidth / 2,
                symbol: "rect",
                symbolClip: true,
                symbolSize: [2, barWidth],
                symbolPosition: "start",
                symbolOffset: [0, 0],
                data: list,
                z: 2,
                animationEasing: "elasticOut",
              },
            ],
          }}
        />
      </GrowthChart>

      <PieChartWrap>
        <Chart<PieOption>
          key={selectedCity ?? "province"}
          use={[PieChart, TooltipComponent, GraphicComponent]}
          option={{
            color,
            tooltip: {
              trigger: "item",
              formatter: "{b}: {c}%",
              textStyle: { fontSize: 11 },
            },
            graphic: {
              elements: [
                {
                  type: "image",
                  style: {
                    image:
                      "data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHBhdGggZD0iTTAgMGgxMDI0djEwMjRIMFYweiIgZmlsbD0iI0ZGRiIgZmlsbC1vcGFjaXR5PSIuMDEiLz48cGF0aCBkPSJNMTkyIDIzMC43ODRMNTQ0LjE5MiAxMjggODk2IDIzMC43ODR2MjEwLjc1MmE1MTQuNjI0IDUxNC42MjQgMCAwIDEtMzUyIDQ4OC4yNTYgNTE0LjY4OCA1MTQuNjg4IDAgMCAxLTM1Mi00ODguMzJWMjMwLjc4NHoiIGZpbGw9IiNiZGNmZmYiIGRhdGEtc3BtLWFuY2hvci1pZD0iYTMxM3guc2VhcmNoX2luZGV4LjAuaTE1Ljc1NzUzYTgxM2xOelgxIiBjbGFzcz0ic2VsZWN0ZWQiLz48cGF0aCBkPSJNMTI4IDQ0MS40NzJWMjMwLjc4NHEwLTUuMTIuODMyLTEwLjI0dDIuNDMyLTkuOTg0cTEuNjY0LTQuOTI4IDQuMDMyLTkuNDcyIDIuNDMyLTQuNjA4IDUuNTA0LTguNzA0IDMuMDcyLTQuMTYgNi43ODQtNy42OCAzLjcxMi0zLjU4NCA4LTYuNTI4IDQuMjI0LTIuOTQ0IDguODk2LTUuMTIgNC42MDgtMi4yNCA5LjYtMy43MTJMNTI2LjIwOCA2Ni41NnExNy45Mi01LjI0OCAzNS45MDQgMEw5MTMuOTIgMTY5LjM0NHE0Ljk5MiAxLjQ3MiA5LjYgMy42NDggNC42NzIgMi4yNCA4Ljk2IDUuMTIgNC4yMjQgMy4wMDggNy45MzYgNi41OTIgMy43MTIgMy41ODQgNi43ODQgNy42OCAzLjA3MiA0LjE2IDUuNTA0IDguNzA0IDIuMzY4IDQuNTQ0IDQuMDMyIDkuNDcyIDEuNiA0Ljg2NCAyLjQzMiA5Ljk4NC44MzIgNS4xMi44MzIgMTAuMjR2MjEwLjc1MnEwIDE4Ni44OC0xMDkuMjQ4IDMzOC4zNjgtMTA5LjI0OCAxNTEuNTUyLTI4Ni40NjQgMjEwLjU2LTkuODU2IDMuMzI4LTIwLjIyNCAzLjMyOHQtMjAuMjI0LTMuMjY0cS0xNzcuMjgtNTkuMDcyLTI4Ni41OTItMjEwLjYyNFExMjggNjI4LjI4OCAxMjggNDQxLjQ3MnptMTI4IDBxMCAxNDUuNTM2IDg1LjEyIDI2My41NTIgODUuMTIgMTE4LjA4IDIyMy4xNjggMTY0LjAzMmwtMjAuMjI0IDYwLjczNi0yMC4yMjQtNjAuNzM2cTEzNy45ODQtNDUuOTUyIDIyMy4xMDQtMTYzLjk2OFE4MzIgNTg3LjAwOCA4MzIgNDQxLjUzNlYyMzAuNzg0aDY0bC0xNy45MiA2MS40NEw1MjYuMjA4IDE4OS40NGwxNy45Mi02MS40NCAxNy45MiA2MS40NEwyMDkuOTIgMjkyLjIyNCAxOTIgMjMwLjc4NGg2NHYyMTAuNjg4eiIgZmlsbD0iI2JkY2ZmZiIgZGF0YS1zcG0tYW5jaG9yLWlkPSJhMzEzeC5zZWFyY2hfaW5kZXguMC5pMTQuNzU3NTNhODEzbE56WDEiLz48cGF0aCBkPSJNNDgzLjUyIDM1Ny41NjhoMTc2TDU1MiA0OTQuNTI4aDE0Ni42MjRMNDY0IDc0OC42NzJsNDguODk2LTE4NS43OTJoLTEzNi45Nkw0ODMuNTIgMzU3LjUwNHoiIGZpbGw9IiNGRkYiLz48L3N2Zz4=",
                    width: 30,
                    height: 30,
                  },
                  left: "center",
                  top: "middle",
                },
              ],
            },
            series: [
              {
                name: "",
                type: "pie",
                center: ["50%", "50%"],
                radius: ["28%", "42%"],
                padAngle: 3,
                label: {
                  show: true,
                  fontSize: 10,
                  lineHeight: 13,
                  minMargin: 6,
                  edgeDistance: 14,
                  alignTo: "edge",
                  formatter: "{name|{b}}\n{val|{c}%}",
                  color: "rgba(255,255,255,0.85)",
                  rich: {
                    name: { fontSize: 10, lineHeight: 13 },
                    val: { fontSize: 9, color: "#9ca3af", lineHeight: 12 },
                  },
                },
                labelLine: {
                  length: 8,
                  length2: 6,
                  maxSurfaceAngle: 70,
                  smooth: 0.2,
                },
                labelLayout: {
                  hideOverlap: true,
                  moveOverlap: "shiftY",
                },
                data: pieData,
              },
            ],
          }}
        />
      </PieChartWrap>
    </Wrapper>
  );
}
