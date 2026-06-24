import type { SalesOrderRow } from "@/api/types";
import { orderStatusLabel } from "@/utils/formatRelative";

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** 导出订单列表为 CSV（UTF-8 BOM，Excel 可直接打开） */
export function exportOrdersCsv(orders: SalesOrderRow[], filename?: string): void {
  const headers = [
    "订单号",
    "客户",
    "地市",
    "区县",
    "品种",
    "规格",
    "数量(株)",
    "金额(元)",
    "状态",
    "满意度",
    "快递单号",
    "销售员",
    "下单时间",
  ];

  const rows = orders.map((o) => [
    o.orderNo,
    o.customerName,
    o.city,
    o.district,
    o.variety,
    o.specification,
    o.quantity,
    o.totalAmount,
    orderStatusLabel(o.status, o.rejectedAt),
    o.satisfaction ?? "",
    o.trackingNo,
    o.salespersonName,
    o.createdAt,
  ]);

  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((r) => r.map(csvCell).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ?? `销售订单_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
