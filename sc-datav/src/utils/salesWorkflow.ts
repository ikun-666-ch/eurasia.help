import {
  resolveWorkflowScopes,
  type WorkflowScope,
} from "./workflowAccess";

/** 是否允许取消订单（与后端 SalesWorkflow::canCancelOrder 一致，基于 pageAccess） */
export function canCancelOrder(
  pageAccess: string[],
  status: string,
  roleCode?: string | null
): boolean {
  const s = status.toUpperCase();
  if (s === "DONE" || s === "CANCELLED") return false;

  const scopes = resolveWorkflowScopes(pageAccess);
  const hasSales = scopes.includes("sales");
  const hasInv = scopes.includes("inventory");
  const isAdmin = (roleCode ?? "").toUpperCase() === "ADMIN";

  if (s === "DRAFT" && hasSales) return true;
  if (s === "CONFIRMED" && (hasSales || hasInv)) return true;
  if (s === "SHIPPING" && (hasInv || isAdmin)) return true;
  return false;
}

/** 库存驳回至销售草稿（需库存待办 scope） */
export function canRejectOrder(
  pageAccess: string[],
  status: string
): boolean {
  if (!resolveWorkflowScopes(pageAccess).includes("inventory")) return false;
  return status.toUpperCase() === "CONFIRMED";
}

export function hasWorkflowScope(
  pageAccess: string[],
  scope: WorkflowScope
): boolean {
  return resolveWorkflowScopes(pageAccess).includes(scope);
}
