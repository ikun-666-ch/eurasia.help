import type { CategoryNode } from "@/api/types";

/** 与后端 mapUserRow / parseStatus 一致 */
export const USER_STATUS_OPTIONS = ["在线", "离线", "禁用"] as const;

export function isUserOnline(status: string): boolean {
  return status === "在线" || status === "ONLINE";
}

export function isUserDisabled(status: string): boolean {
  return status === "禁用" || status === "DISABLED";
}

export function formatApiQuotaValue(
  remaining: number | null,
  unit: string,
  configured: boolean,
): string {
  if (remaining != null) {
    return `${remaining} ${unit}`;
  }
  return configured ? "已接入" : "未配置";
}

export function apiQuotaThreshold(label: string): string {
  return label.includes("短信") ? "≥ 20 条" : "—";
}

export function apiQuotaStatusLabel(status: string): string {
  switch (status) {
    case "normal":
      return "正常";
    case "low":
      return "偏低";
    case "critical":
      return "不足";
    case "unconfigured":
      return "未配置";
    case "error":
      return "异常";
    default:
      return "—";
  }
}

export function apiQuotaStatusOk(status: string): boolean | undefined {
  if (status === "normal") return true;
  if (status === "low") return false;
  return undefined;
}

export function apiQuotaStatusDanger(status: string): boolean {
  return status === "critical" || status === "error";
}

export function formatBytes(bytes: number): string {
  if (bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) => [n, ...flattenCategories(n.children ?? [])]);
}

export function categoryOptionLabel(node: CategoryNode): string {
  const pad = node.level > 1 ? "　└ " : "";
  return `${pad}${node.name}`;
}
