import { useMemo } from "react";
import Chart from "@/components/chart";
import { LineChart } from "echarts/charts";
import styled from "styled-components";
import NumberAnimation from "@/components/numberAnimation";
import { fetchSalesSummary } from "@/api";
import { useConfigStore } from "../stores";
import { MANUAL_FILL_MESSAGE } from "@/utils/dailyFillMessage";
import ChartPlaceholder from "./chartPlaceholder";
import { useSalChartLoad } from "./useSalChartLoad";

const lineColor = "#000000";
const accentColor = "#ea580c";

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: 2fr repeat(2, minmax(0, 1fr));
  gap: 16px;
`;

const Statistics = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
`;

const StatisticsTitle = styled.div`
  font-size: 12px;
  color: rgba(0, 0, 0, 0.7);
`;

const TotalRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
`;

const StatisticsNumber = styled(NumberAnimation)`
  font-size: 28px;
  font-weight: 600;
  color: #ea580c;
`;

const UnitText = styled.span`
  font-size: 12px;
  color: rgba(0, 0, 0, 0.7);
`;

const Statistics1 = styled.div`
  display: flex;
  align-items: center;
  color: rgba(0, 0, 0, 0.8);
  font-size: 13px;
`;

const Statistics1Number = styled(NumberAnimation)`
  font-size: 20px;
  font-weight: 600;
  margin-left: auto;
  color: #ea580c;
`;

const MetricIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4em;
  height: 1.4em;
  margin-right: 6px;
  border-radius: 999px;
  border: 1px solid ${lineColor};
  font-size: 0.85em;
  line-height: 1;
  flex-shrink: 0;
`;

function formatTotal(amount: number) {
  if (amount >= 10000) {
    return {
      value: amount / 10000,
      unit: "万元",
      options: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    };
  }
  return {
    value: amount,
    unit: "元",
    options: { maximumFractionDigits: 0 },
  };
}

const metricIcons = ["📋", "👥", "🗺️", "✅"];

export default function Chart4({ refreshToken }: { refreshToken?: number }) {
  const selectedCity = useConfigStore((s) => s.selectedCity);
  const { data: summary, statusMessage } = useSalChartLoad(
    () => fetchSalesSummary(selectedCity),
    [selectedCity, refreshToken]
  );

  const metrics = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "订单笔数", value: summary.orderCount, unit: "笔" },
      { label: "客户数量", value: summary.customerCount, unit: "家" },
      {
        label: summary.regionLabel,
        value: summary.regionCount,
        unit: selectedCity ? "个" : "个",
      },
      {
        label: "已完成",
        value: summary.doneOrderCount,
        unit: "笔",
      },
    ];
  }, [summary, selectedCity]);

  const total = useMemo(
    () => (summary ? formatTotal(summary.totalAmount) : null),
    [summary]
  );

  const trendData = summary?.trendAmounts ?? [];
  const trendEmpty = summary?.manualRequired || trendData.length === 0;

  if (statusMessage || !summary || !total) {
    return (
      <ChartPlaceholder
        message={
          statusMessage ??
          (summary?.manualRequired ? MANUAL_FILL_MESSAGE : "暂无订单统计数据")
        }
      />
    );
  }

  return (
    <Wrapper>
      {trendEmpty ? (
        <ChartPlaceholder message={MANUAL_FILL_MESSAGE} />
      ) : (
      <Chart
        use={[LineChart]}
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
            top: 8,
            bottom: 8,
            left: 8,
            right: 8,
            outerBoundsMode: "same",
          },
          xAxis: { show: false, data: trendData, boundaryGap: false },
          yAxis: { show: false, type: "value" },
          series: {
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
            data: trendData,
          },
        }}
      />
      )}
      <Statistics>
        <StatisticsTitle>
          {selectedCity ? `${selectedCity}订单总额` : "全省订单总额"}
        </StatisticsTitle>
        <TotalRow>
          <StatisticsNumber value={total.value} options={total.options} />
          <UnitText>{total.unit}</UnitText>
        </TotalRow>
      </Statistics>
      {metrics.map((m, k) => (
        <Statistics1 key={m.label}>
          <MetricIcon>{metricIcons[k]}</MetricIcon>
          {m.label}
          <Statistics1Number
            value={m.value}
            options={{ maximumFractionDigits: 0 }}
          />
          <span style={{ marginLeft: 4, fontSize: 12, color: "rgba(0,0,0,0.5)" }}>
            {m.unit}
          </span>
        </Statistics1>
      ))}
    </Wrapper>
  );
}
