import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import Chart from "@/components/chart";
import { GaugeChart, PieChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import type { ComposeOption } from "echarts/core";
import type { GaugeSeriesOption, PieSeriesOption } from "echarts/charts";
import { fetchDashboardKpi } from "@/api";
import type { DashboardKpi } from "@/api/types";
import ClickablePanel from "@/components/panelEditor/ClickablePanel";
import type { PanelEditorType } from "@/components/panelEditor/panelEditors";
import { usePanelRefresh } from "@/components/panelEditor/PanelRefreshContext";

type PieOption = ComposeOption<PieSeriesOption>;
type GaugeOption = ComposeOption<GaugeSeriesOption>;

const KpiRow = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  margin-bottom: 20px;
`;

const KpiCard = styled.div`
  display: flex;
  flex-direction: column;
  padding: 12px 14px 10px;
  border-radius: 8px;
  border: 1px solid rgba(96, 165, 250, 0.22);
  background: linear-gradient(145deg, rgba(30, 58, 138, 0.35), rgba(15, 23, 42, 0.6));
  box-shadow: inset 0 0 24px rgba(56, 189, 248, 0.06);
  min-height: 168px;

  label {
    font-size: 12px;
    color: rgba(186, 230, 253, 0.75);
    margin-bottom: 4px;
  }

  small {
    display: block;
    margin-top: 2px;
    font-size: 11px;
    color: rgba(148, 163, 184, 0.9);
    text-align: center;
  }
`;

const ChartBox = styled.div`
  flex: 1;
  min-height: 118px;
`;

const baseTooltip = {
  backgroundColor: "rgba(15, 23, 42, 0.92)",
  borderColor: "rgba(96, 165, 250, 0.35)",
  textStyle: { color: "#e8f0ff", fontSize: 12 },
};

function donutOption(
  data: { name: string; value: number }[],
  colors: string[],
  centerText: string
): PieOption {
  return {
    color: colors,
    tooltip: {
      ...baseTooltip,
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    series: [
      {
        type: "pie",
        radius: ["58%", "76%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: false,
        label: {
          show: true,
          position: "center",
          formatter: centerText,
          color: "#7dd3fc",
          fontSize: 20,
          fontWeight: 600,
          lineHeight: 24,
        },
        labelLine: { show: false },
        itemStyle: {
          borderRadius: 4,
          borderColor: "rgba(15, 23, 42, 0.8)",
          borderWidth: 2,
        },
        data,
      },
    ],
  };
}

function gaugeOption(value: number): GaugeOption {
  return {
    tooltip: { show: false },
    series: [
      {
        type: "gauge",
        startAngle: 90,
        endAngle: -270,
        radius: "88%",
        min: 0,
        max: 100,
        pointer: { show: false },
        progress: {
          show: true,
          overlap: false,
          roundCap: true,
          clip: false,
          itemStyle: { color: "#38bdf8" },
        },
        axisLine: {
          lineStyle: {
            width: 10,
            color: [[1, "rgba(56, 189, 248, 0.18)"]],
          },
        },
        splitLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        data: [{ value }],
        detail: {
          valueAnimation: true,
          formatter: "{value}%",
          color: "#7dd3fc",
          fontSize: 20,
          fontWeight: 600,
          offsetCenter: [0, 0],
        },
      },
    ],
  };
}

function buildCharts(kpi: DashboardKpi) {
  const inactive = Math.max(0, kpi.userCount - kpi.activeToday);
  const stockCustomers = Math.max(
    0,
    kpi.customerCount - kpi.newCustomersThisWeek
  );

  return [
    {
      label: "注册用户",
      subtitle: `今日活跃 ${kpi.activeToday} 人`,
      type: "pie" as const,
      option: donutOption(
        [
          { name: "今日活跃", value: kpi.activeToday },
          { name: "未活跃", value: inactive || 1 },
        ],
        ["#38bdf8", "rgba(56, 189, 248, 0.22)"],
        String(kpi.userCount)
      ),
    },
    {
      label: "角色权限组",
      subtitle: "RBAC 已启用",
      type: "pie" as const,
      option: donutOption(
        kpi.roleUsers.map((r) => ({ name: r.name, value: r.value })),
        ["#3061db", "#38bdf8", "#22d3ee", "#818cf8"],
        String(kpi.roleCount)
      ),
    },
    {
      label: "苗木品种规格",
      subtitle: `${kpi.categoryNodeCount} 条品种规格`,
      type: "pie" as const,
      option: donutOption(
        kpi.categorySlices.length
          ? kpi.categorySlices.map((c) => ({
              name: c.name,
              value: c.value,
            }))
          : [{ name: "暂无", value: 1 }],
        ["#34d399", "#38bdf8", "#a78bfa", "#fbbf24"],
        String(kpi.categoryNodeCount)
      ),
    },
    {
      label: "客户档案",
      subtitle: `本周新增 ${kpi.newCustomersThisWeek} 家`,
      type: "pie" as const,
      option: donutOption(
        [
          { name: "本周新增", value: kpi.newCustomersThisWeek || 1 },
          { name: "存量客户", value: stockCustomers || 1 },
        ],
        ["#fbbf24", "rgba(56, 189, 248, 0.22)"],
        String(kpi.customerCount)
      ),
    },
    {
      label: "系统可用率",
      subtitle: "近 30 天稳定运行",
      type: "gauge" as const,
      option: gaugeOption(kpi.systemUptimePercent),
    },
  ];
}

const KPI_EDITORS: PanelEditorType[] = [
  "api-admin-users",
  "api-admin-roles",
  "api-admin-categories",
  "api-admin-customers",
  "api-admin-kpi",
];

interface KpiRingsProps {
  ready: boolean;
}

export default function KpiRings({ ready }: KpiRingsProps) {
  const [kpi, setKpi] = useState<DashboardKpi | null>(null);
  const { version } = usePanelRefresh();

  useEffect(() => {
    if (!ready) return;
    fetchDashboardKpi().then(setKpi).catch(console.error);
  }, [ready, version]);

  const charts = useMemo(
    () => (kpi ? buildCharts(kpi) : []),
    [kpi]
  );

  if (!charts.length) {
    return (
      <KpiRow>
        <KpiCard style={{ gridColumn: "1 / -1", alignItems: "center" }}>
          <small>加载 KPI 数据…</small>
        </KpiCard>
      </KpiRow>
    );
  }

  return (
    <KpiRow>
      {charts.map((item, index) => (
        <KpiCard key={item.label}>
          <ClickablePanel title={item.label} editorType={KPI_EDITORS[index]}>
            <label>{item.label}</label>
            <ChartBox>
              {item.type === "pie" ? (
                <Chart<PieOption>
                  use={[PieChart, TooltipComponent]}
                  option={item.option}
                />
              ) : (
                <Chart<GaugeOption>
                  use={[GaugeChart, TooltipComponent]}
                  option={item.option}
                />
              )}
            </ChartBox>
            <small>{item.subtitle}</small>
          </ClickablePanel>
        </KpiCard>
      ))}
    </KpiRow>
  );
}
