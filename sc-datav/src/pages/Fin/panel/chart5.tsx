import { useMemo } from "react";
import { RadarChart, type RadarSeriesOption } from "echarts/charts";
import Chart from "@/components/chart";
import {
  fetchFinanceSalesByCity,
  fetchFinanceSalesByDistrict,
} from "@/api";
import type { ComposeOption } from "echarts/core";
import {
  LegendComponent,
  TooltipComponent,
  type LegendComponentOption,
  type TooltipComponentOption,
} from "echarts/components";
import { useConfigStore } from "../stores";
import ChartFill from "./chartFill";
import ChartPlaceholder from "./chartPlaceholder";
import { useFinChartLoad } from "./useFinChartLoad";

type RadarOption = ComposeOption<
  RadarSeriesOption | TooltipComponentOption | LegendComponentOption
>;

const rings = [1000, 900, 800, 700, 600, 500, 400];

type RankRow = { name: string; amount: number };

export default function Chart5({ refreshToken }: { refreshToken?: number }) {
  const selectedCity = useConfigStore((s) => s.selectedCity);

  const { data: citySales, statusMessage: cityMsg } = useFinChartLoad(
    () => fetchFinanceSalesByCity(),
    [refreshToken],
    !selectedCity
  );

  const { data: districtSales, statusMessage: districtMsg } = useFinChartLoad(
    () => fetchFinanceSalesByDistrict(selectedCity!),
    [selectedCity, refreshToken],
    Boolean(selectedCity)
  );

  const statusMessage = selectedCity ? districtMsg : cityMsg;

  const { rows, subtitle, chartKey } = useMemo(() => {
    if (selectedCity) {
      const districts = districtSales?.districts ?? [];
      const sorted = [...districts].sort((a, b) => b.amount - a.amount);
      const rankRows: RankRow[] = sorted.map((d) => ({
        name: d.district,
        amount: d.amount,
      }));
      const total = rankRows.reduce((s, r) => s + r.amount, 0);
      return {
        rows: rankRows,
        subtitle:
          rankRows.length > 0
            ? `${selectedCity}下辖 ${rankRows.length} 区县 · 合计 ${(total / 10000).toFixed(1)} 万元`
            : "",
        chartKey: `district-${selectedCity}-${rankRows.map((r) => r.name).join(",")}`,
      };
    }

    const cities = citySales?.cities ?? [];
    const sorted = [...cities].sort((a, b) => b.amount - a.amount).slice(0, 5);
    return {
      rows: sorted.map((c) => ({
        name: c.city.replace(/市$/, ""),
        amount: c.amount,
      })),
      subtitle: "",
      chartKey: `province-${sorted.map((c) => c.city).join(",")}`,
    };
  }, [selectedCity, citySales, districtSales]);

  const { indicators, values, maxVal } = useMemo(() => {
    if (!rows.length) {
      return { indicators: [], values: [], maxVal: 100 };
    }
    const max = Math.max(...rows.map((r) => r.amount / 10000), 1);
    return {
      indicators: rows.map((r) => ({
        name: r.name,
        max: Math.ceil(max * 1.2),
      })),
      values: rows.map((r) => Math.round((r.amount / 10000) * 10) / 10),
      maxVal: Math.ceil(max * 1.2),
    };
  }, [rows]);

  if (statusMessage || !indicators.length) {
    return (
      <ChartPlaceholder
        message={
          statusMessage ??
          (selectedCity
            ? `${selectedCity}暂无区县销售数据，请运行 php scripts/reseed-finance.php`
            : "暂无销售订单数据，请运行 php scripts/reseed-finance.php")
        }
      />
    );
  }

  return (
    <ChartFill>
      <Chart<RadarOption>
        key={chartKey}
        use={[RadarChart, TooltipComponent, LegendComponent]}
        option={{
          title: subtitle
            ? {
                text: subtitle,
                left: "center",
                top: 4,
                textStyle: {
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 11,
                  fontWeight: "normal",
                },
              }
            : undefined,
          tooltip: {
            trigger: "item",
            formatter: (params) => {
              const p = Array.isArray(params) ? params[0] : params;
              if (!p || p.seriesIndex !== 0) return "";
              const idx = typeof p.dimensionIndex === "number" ? p.dimensionIndex : p.dataIndex;
              const name = indicators[idx]?.name ?? "";
              const val = values[idx];
              if (name === "" || val == null) return "";
              return `${name}<br/>销售额：${val} 万元`;
            },
          },
          radar: {
            center: ["50%", subtitle ? "56%" : "54%"],
            radius: subtitle ? "70%" : "64%",
            startAngle: 90,
            axisName: { show: false },
            indicator: indicators,
            splitLine: { show: false },
            splitArea: { show: false },
            axisLine: { show: false },
          },
          series: [
            {
              name: "销售额",
              type: "radar",
              data: [values],
              label: {
                show: true,
                formatter: (params) => {
                  const idx =
                    typeof params.dimensionIndex === "number"
                      ? params.dimensionIndex
                      : 0;
                  const name = indicators[idx]?.name ?? "";
                  const val = values[idx];
                  return name ? `${name}\n${val}` : `${val}`;
                },
                color: "#bdcfff",
                fontSize: 10,
                lineHeight: 14,
                align: "center",
                distance: 8,
              },
              symbolSize: [6, 6],
              lineStyle: { width: 0 },
              areaStyle: { color: "#bdcfff", opacity: 0.6 },
            },
            ...rings.map((ring) => ({
              type: "radar" as const,
              silent: true,
              data: [Array(indicators.length).fill(Math.min(ring, maxVal))],
              symbol: "none" as const,
              lineStyle: { width: 0 },
              itemStyle: { color: "#3061DB" },
              areaStyle: {
                color: "#3061DB",
                opacity: 0.06 + (1000 - ring) / 10000,
              },
            })),
          ],
        }}
      />
    </ChartFill>
  );
}
