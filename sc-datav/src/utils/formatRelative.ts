export function formatRelativeTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "草稿",
  CONFIRMED: "待审核出库",
  SHIPPING: "已出库待结算",
  DONE: "已结算",
  CANCELLED: "已取消",
};

/** 订单状态展示（草稿且曾被库存驳回时附加标记） */
export function orderStatusLabel(
  status: string,
  rejectedAt?: string | null
): string {
  const base = ORDER_STATUS_LABEL[status] || status;
  if (status === "DRAFT" && rejectedAt) {
    return `${base}（被驳回）`;
  }
  return base;
}
