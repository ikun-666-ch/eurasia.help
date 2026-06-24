import { useRoleApi } from "@/hooks/useRoleApi";
import FinancePending from "./FinancePending";
import InventoryPending from "./InventoryPending";
import SalesPending from "./SalesPending";
import WorkflowPendingHub from "./WorkflowPendingHub";
import { Empty, PageRoot } from "./styles";
import { resolveWorkflowScopes } from "@/utils/workflowAccess";

export default function PendingOrdersPage() {
  const { ready, error, pageAccess } = useRoleApi();

  if (!ready) {
    return (
      <PageRoot>
        <Empty style={{ paddingTop: 80 }}>{error || "加载中…"}</Empty>
      </PageRoot>
    );
  }

  const scopes = resolveWorkflowScopes(pageAccess);

  if (scopes.length === 0) {
    return (
      <PageRoot>
        <Empty style={{ paddingTop: 80 }}>
          当前账号无待办权限，请重新登录或联系管理员
        </Empty>
      </PageRoot>
    );
  }

  if (scopes.length === 1) {
    switch (scopes[0]) {
      case "sales":
        return <SalesPending scope="sales" />;
      case "inventory":
        return <InventoryPending scope="inventory" />;
      case "finance":
        return <FinancePending scope="finance" />;
    }
  }

  return <WorkflowPendingHub scopes={scopes} />;
}
