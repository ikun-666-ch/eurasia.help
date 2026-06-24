import { useEffect, useState } from "react";
import Chart from "@/components/chart";
import useRafInterval from "@/hooks/useRafInterval";
import { fetchInventoryLedger } from "@/api";
import { useRoleApi } from "@/hooks/useRoleApi";
import { BarChart } from "echarts/charts";
import type { EChartsType } from "echarts/core";
import { useRef } from "react";
import { SHANXI_CITIES } from "../constants";
import { useMapStyleStore } from "../stores";

const colors = ["#91AC9A", "#6E918C"];

function aggregateByCity(
  list: { city?: string; quantity: number }[]
): { labels: string[]; values: number[] } {
  const totals = new Map<string, number>();
  SHANXI_CITIES.forEach((c) => totals.set(c, 0));
  list.forEach((item) => {
    if (!item.city || !totals.has(item.city)) return;
    totals.set(item.city, (totals.get(item.city) ?? 0) + Number(item.quantity));
  });
  return {
    labels: [...SHANXI_CITIES],
    values: SHANXI_CITIES.map((c) =>
      Math.round((totals.get(c) ?? 0) * 10) / 10
    ),
  };
}

export default function Chart3({ refreshToken }: { refreshToken?: number }) {
  const { ready } = useRoleApi();
  const selectedCity = useMapStyleStore((s) => s.selectedCity);
  const [barData, setBarData] = useState<{ labels: string[]; values: number[] }>(
    { labels: [], values: [] }
  );
  const chartRef = useRef<EChartsType>(null);
  const tipIndex = useRef(0);

  useEffect(() => {
    if (!ready) return;
    fetchInventoryLedger().then((list) => setBarData(aggregateByCity(list)));
  }, [ready, refreshToken]);

  useRafInterval(
    () => {
      if (chartRef.current && barData.values.length) {
        chartRef.current.dispatchAction({
          type: "showTip",
          seriesIndex: 0,
          dataIndex: tipIndex.current,
        });
        tipIndex.current = (tipIndex.current + 1) % barData.values.length;
      }
    },
    3_000,
    true
  );

  if (!ready || !barData.labels.length) return null;

  const highlightIndex = selectedCity
    ? barData.labels.indexOf(selectedCity)
    : -1;

  return (
    <Chart
      ref={chartRef}
      use={[BarChart]}
      option={{
        tooltip: {
          trigger: "axis",
          backgroundColor: "rgba(110,145,140,0.3)",
          borderColor: colors[1],
          borderWidth: 1,
          borderRadius: 8,
          textStyle: { color: "#fff" },
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
          data: barData.labels.map((l) => l.replace("市", "")),
          axisLabel: {
            color: "rgba(255, 255, 255, 0.6)",
            interval: 0,
            rotate: 30,
            fontSize: 10,
          },
          axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
        },
        yAxis: {
          type: "value",
          axisLabel: { color: "rgba(255, 255, 255, 0.6)" },
          splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
        },
        series: [
          {
            type: "bar",
            data: barData.values.map((v, i) => ({
              value: v,
              itemStyle: {
                opacity: highlightIndex < 0 || highlightIndex === i ? 1 : 0.35,
                color: {
                  type: "linear",
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: colors[0] },
                    { offset: 1, color: colors[1] },
                  ],
                },
                borderRadius: [4, 4, 0, 0],
              },
            })),
          },
        ],
      }}
    />
  );
}
