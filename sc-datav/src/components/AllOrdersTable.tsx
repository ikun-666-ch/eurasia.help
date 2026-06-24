import { useEffect, useMemo, useState } from "react";
import SeamVirtualScroll from "@/components/seamVirtualScroll";
import { fetchSalesOrders } from "@/api";
import type { SalesOrderRow } from "@/api/types";
import { orderStatusLabel } from "@/utils/formatRelative";
import { useRoleApi } from "@/hooks/useRoleApi";

export type AllOrdersTableTheme = "sal" | "fin" | "page";
export type AllOrdersTableMode = "preview" | "full";

const tableThemes: Record<
  AllOrdersTableTheme,
  { header: { color: string }; body: { color: string } }
> = {
  sal: {
    header: { color: "rgba(0, 0, 0, 0.6)" },
    body: { color: "#000000" },
  },
  fin: {
    header: { color: "rgba(255, 255, 255, 0.6)" },
    body: { color: "#3061DB" },
  },
  page: {
    header: { color: "rgba(186, 206, 255, 0.75)" },
    body: { color: "#e8f0ff" },
  },
};

function formatAmountWan(amount: number) {
  return (amount / 10000).toFixed(2);
}

function formatOrderDate(iso: string, full = false) {
  if (!iso) return "—";
  if (full) {
    return iso.slice(0, 16).replace("T", " ");
  }
  const d = iso.slice(0, 10);
  const parts = d.split("-");
  return parts.length >= 3 ? `${parts[1]}-${parts[2]}` : d;
}

function buildPreviewRows(orders: SalesOrderRow[], city?: string | null) {
  return orders.map((o, idx) => ({
    value1: String(idx + 1),
    value2: o.orderNo,
    value3: o.customerName,
    value4: city ? o.district || "—" : o.city || "—",
    value5: formatAmountWan(o.totalAmount),
    value6: orderStatusLabel(o.status, o.rejectedAt),
    value7: formatOrderDate(o.createdAt),
  }));
}

function buildFullRows(orders: SalesOrderRow[]) {
  return orders.map((o, idx) => ({
    value1: String(idx + 1),
    value2: o.orderNo,
    value3: o.trackingNo || "—",
    value4: o.variety || "—",
    value5: o.specification || "—",
    value6: o.quantity > 0 ? String(o.quantity) : "—",
    value7: o.customerName,
    value8: o.city || "—",
    value9: o.district || "—",
    value10: formatAmountWan(o.totalAmount),
    value11: orderStatusLabel(o.status, o.rejectedAt),
    value12: formatOrderDate(o.createdAt, true),
  }));
}

interface AllOrdersTableProps {
  city?: string | null;
  refreshToken?: number;
  theme?: AllOrdersTableTheme;
  mode?: AllOrdersTableMode;
}

export default function AllOrdersTable({
  city,
  refreshToken,
  theme = "sal",
  mode = "preview",
}: AllOrdersTableProps) {
  const { ready, error: authError } = useRoleApi();
  const [orders, setOrders] = useState<SalesOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCity = mode === "full" ? null : city;

  useEffect(() => {
    if (!ready) {
      setLoading(!authError);
      if (authError) {
        setError(authError);
        setOrders([]);
      }
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSalesOrders(fetchCity)
      .then((list) => {
        if (cancelled) return;
        setOrders(list);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setOrders([]);
        setError(e instanceof Error ? e.message : "加载订单失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, authError, fetchCity, refreshToken]);

  const rows = useMemo(
    () =>
      mode === "full"
        ? buildFullRows(orders)
        : buildPreviewRows(orders, city),
    [mode, orders, city]
  );

  const regionTitle = city ? "区县" : "地市";

  const previewColumns = [
    { title: "序号", dataIndex: "value1", flex: 0.6, noScroll: true },
    { title: "订单号", dataIndex: "value2", align: "center" as const, flex: 1.1, noScroll: true },
    { title: "客户", dataIndex: "value3", flex: 1.2, noScroll: true },
    { title: regionTitle, dataIndex: "value4", align: "center" as const, flex: 0.9, noScroll: true },
    { title: "金额(万)", dataIndex: "value5", align: "right" as const, flex: 0.8, noScroll: true },
    { title: "状态", dataIndex: "value6", align: "center" as const, flex: 0.8, noScroll: true },
    { title: "日期", dataIndex: "value7", align: "right" as const, flex: 0.7, noScroll: true },
  ];

  const fullColumns = [
    { title: "序号", dataIndex: "value1", flex: 0.5, noScroll: true },
    { title: "订单号", dataIndex: "value2", flex: 1, noScroll: true },
    { title: "快递单号", dataIndex: "value3", flex: 1.1, noScroll: true },
    { title: "品种", dataIndex: "value4", flex: 0.8, noScroll: true },
    { title: "规格", dataIndex: "value5", flex: 0.9, noScroll: true },
    { title: "数量(株)", dataIndex: "value6", align: "right" as const, flex: 0.7, noScroll: true },
    { title: "客户", dataIndex: "value7", flex: 1.1, noScroll: true },
    { title: "地市", dataIndex: "value8", flex: 0.8, noScroll: true },
    { title: "区县", dataIndex: "value9", flex: 0.8, noScroll: true },
    { title: "金额(万)", dataIndex: "value10", align: "right" as const, flex: 0.7, noScroll: true },
    { title: "状态", dataIndex: "value11", align: "center" as const, flex: 0.7, noScroll: true },
    { title: "下单时间", dataIndex: "value12", align: "right" as const, flex: 1, noScroll: true },
  ];

  const emptyRow =
    mode === "full"
      ? {
          value1: "—",
          value2: loading ? "加载中…" : error || "暂无订单",
          value3: "",
          value4: "",
          value5: "",
          value6: "",
          value7: "",
          value8: "",
          value9: "",
          value10: "",
          value11: "",
          value12: "",
        }
      : {
          value1: "—",
          value2: loading ? "加载中…" : error || "暂无订单",
          value3: "",
          value4: "",
          value5: "",
          value6: "",
          value7: "",
        };

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        pointerEvents: mode === "preview" ? "none" : "auto",
      }}>
      <SeamVirtualScroll
      rowHeight={mode === "full" ? 44 : 50}
      autoScroll={mode === "preview" && rows.length > 0}
      speed={2800}
      styles={tableThemes[theme]}
      column={mode === "full" ? fullColumns : previewColumns}
      data={rows.length ? rows : [emptyRow]}
      />
    </div>
  );
}

export function useAllOrdersCount(refreshToken?: number) {
  const { ready } = useRoleApi();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    fetchSalesOrders()
      .then((list) => {
        if (!cancelled) setCount(list.length);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, refreshToken]);

  return count;
}
