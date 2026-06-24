import type { PageKey } from "./pageAccess";

export type WorkflowScope = "sales" | "inventory" | "finance";

export const WORKFLOW_SCOPE_LABELS: Record<WorkflowScope, string> = {
  sales: "销售待办",
  inventory: "库存待办",
  finance: "财务待办",
};

const PAGE_TO_SCOPE: Partial<Record<PageKey, WorkflowScope>> = {
  sal: "sales",
  orders: "sales",
  inv: "inventory",
  fin: "finance",
};

const PATH_PREFIX_TO_SCOPE: { prefix: string; scope: WorkflowScope }[] = [
  { prefix: "/inv", scope: "inventory" },
  { prefix: "/fin", scope: "finance" },
  { prefix: "/sal", scope: "sales" },
  { prefix: "/orders", scope: "sales" },
];

/** 根据 pageAccess 解析用户可处理的待办 scope（去重、固定顺序） */
export function resolveWorkflowScopes(pageAccess: string[]): WorkflowScope[] {
  const scopes: WorkflowScope[] = [];
  const seen = new Set<WorkflowScope>();

  for (const page of pageAccess) {
    const scope = PAGE_TO_SCOPE[page as PageKey];
    if (scope && !seen.has(scope)) {
      seen.add(scope);
      scopes.push(scope);
    }
  }

  return scopes;
}

export function scopeFromPath(pathname: string): WorkflowScope | null {
  for (const { prefix, scope } of PATH_PREFIX_TO_SCOPE) {
    if (pathname.startsWith(prefix)) return scope;
  }
  return null;
}

/**
 * 大屏 🔔 使用的 scope：优先当前面板，否则单一 scope 账号用唯一 scope，多 scope 汇总全部
 */
export function resolveBellScope(
  pathname: string,
  pageAccess: string[]
): WorkflowScope | undefined {
  const scopes = resolveWorkflowScopes(pageAccess);
  if (scopes.length === 0) return undefined;

  const pathScope = scopeFromPath(pathname);
  if (pathScope && scopes.includes(pathScope)) return pathScope;
  if (scopes.length === 1) return scopes[0];
  return undefined;
}

export function pendingPath(scope?: WorkflowScope): string {
  return scope ? `/orders/pending?scope=${scope}` : "/orders/pending";
}

export function parseScopeParam(
  value: string | null | undefined
): WorkflowScope | null {
  if (value === "sales" || value === "inventory" || value === "finance") {
    return value;
  }
  return null;
}
