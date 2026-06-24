import { useMemo, type ReactNode } from "react";
import SeamVirtualScroll from "@/components/seamVirtualScroll";
import {
  fetchSalesOrdersByCity,
  fetchSalesOrdersByDistrict,
} from "@/api";
import { useConfigStore } from "../stores";
import ChartPlaceholder from "./chartPlaceholder";
import { useSalChartLoad } from "./useSalChartLoad";

function formatAmount(v: number): ReactNode {
  if (v >= 10000) {
    return `${(v / 10000).toFixed(1)} 万`;
  }
  return `${Math.round(v).toLocaleString()} 元`;
}

export default function Chart1({ refreshToken }: { refreshToken?: number }) {
  const selectedCity = useConfigStore((s) => s.selectedCity);

  const { data: cityData, statusMessage: cityMsg } = useSalChartLoad(
    () => fetchSalesOrdersByCity(),
    [refreshToken],
    !selectedCity
  );

  const { data: districtData, statusMessage: districtMsg } = useSalChartLoad(
    () => fetchSalesOrdersByDistrict(selectedCity!),
    [selectedCity, refreshToken],
    Boolean(selectedCity)
  );

  const statusMessage = selectedCity ? districtMsg : cityMsg;

  const rows = useMemo(() => {
    if (selectedCity) {
      return [...(districtData?.districts ?? [])].sort(
        (a, b) => b.totalAmount - a.totalAmount
      );
    }
    return [...(cityData?.cities ?? [])].sort(
      (a, b) => b.totalAmount - a.totalAmount
    );
  }, [selectedCity, cityData, districtData]);

  const tableData = useMemo(
    () =>
      rows.map((row, i) => ({
        rank: `NO.${i + 1}`,
        name: "district" in row ? row.district : row.city.replace(/市$/, ""),
        count: `${row.orderCount} 笔`,
        amount: formatAmount(row.totalAmount),
      })),
    [rows]
  );

  if (statusMessage) {
    return <ChartPlaceholder message={statusMessage} />;
  }

  if (!tableData.length) {
    return (
      <ChartPlaceholder
        message={
          selectedCity
            ? `${selectedCity}暂无区县订单数据，请运行 php scripts/reseed-sales.php`
            : "暂无订单数据，请运行 php scripts/reseed-sales.php"
        }
      />
    );
  }

  const listHint = selectedCity
    ? `${selectedCity}下辖 ${tableData.length} 个区县，按金额排序`
    : `全省 ${tableData.length} 个地市，按金额排序`;

  return (
    <>
      <div
        style={{
          fontSize: 11,
          color: "rgba(0,0,0,0.45)",
          marginBottom: 6,
          flexShrink: 0,
        }}>
        {listHint}
      </div>
      <SeamVirtualScroll
      autoScroll={false}
      rowHeight={42}
      styles={{
        header: { color: "rgba(0, 0, 0, 0.6)" },
        body: { color: "#000000" },
      }}
      column={[
        { title: "排名", dataIndex: "rank", flex: 0.7, noScroll: true },
        {
          title: selectedCity ? "区县" : "地市",
          dataIndex: "name",
          flex: 1.2,
          noScroll: true,
        },
        { title: "订单数", dataIndex: "count", align: "center", noScroll: true },
        { title: "金额", dataIndex: "amount", align: "right", noScroll: true },
      ]}
      data={tableData}
    />
    </>
  );
}
