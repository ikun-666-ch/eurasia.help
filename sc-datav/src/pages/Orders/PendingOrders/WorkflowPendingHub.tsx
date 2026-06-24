import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useRoleApi } from "@/hooks/useRoleApi";
import FinancePending from "./FinancePending";
import InventoryPending from "./InventoryPending";
import SalesPending from "./SalesPending";
import {
  ActionBtn,
  BackLink,
  BodyArea,
  Header,
  PageRoot,
  Subtitle,
  TabBar,
  TabBtn,
  TabRow,
  Title,
  TopActions,
} from "./styles";
import {
  parseScopeParam,
  resolveWorkflowScopes,
  WORKFLOW_SCOPE_LABELS,
  type WorkflowScope,
} from "@/utils/workflowAccess";

type Props = {
  /** 限定展示的 tab；默认按 pageAccess 自动推断 */
  scopes?: WorkflowScope[];
};

export default function WorkflowPendingHub({ scopes: scopesProp }: Props) {
  const { pageAccess } = useRoleApi();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const scopes = useMemo(() => {
    const resolved = scopesProp ?? resolveWorkflowScopes(pageAccess);
    // 强制排序: 销售 → 库存 → 财务
    const order: WorkflowScope[] = ["sales", "inventory", "finance"];
    return order.filter(s => resolved.includes(s));
  }, [scopesProp, pageAccess]);

  const initialTab = useMemo(() => {
    const fromQuery = parseScopeParam(searchParams.get("scope"));
    if (fromQuery && scopes.includes(fromQuery)) return fromQuery;
    return scopes[0] ?? "sales";
  }, [searchParams, scopes]);

  const [tab, setTab] = useState<WorkflowScope>(initialTab);

  useEffect(() => {
    const fromQuery = parseScopeParam(searchParams.get("scope"));
    if (fromQuery && scopes.includes(fromQuery)) {
      setTab(fromQuery);
    }
  }, [searchParams, scopes]);

  const setTabAndUrl = (next: WorkflowScope) => {
    setTab(next);
    navigate(`/orders/pending?scope=${next}`, { replace: true });
  };

  if (scopes.length === 0) return null;

  return (
    <PageRoot>
      <Header>
        <div>
          <Title>待办中心</Title>
          <Subtitle>销售确认规格 · 库存发货出库 · 财务费用结算</Subtitle>
        </div>
        <TopActions>
          {tab === "sales" && scopes.includes("sales") ? (
            <ActionBtn
              type="button"
              $accent="orange"
              onClick={() => navigate("/orders/new")}>
              + 新建订单
            </ActionBtn>
          ) : null}
          <BackLink as={Link} to="/home">
            返回首页
          </BackLink>
        </TopActions>
      </Header>
      {scopes.length > 1 ? (
        <TabBar>
          <TabRow>
            {scopes.map((scope) => (
              <TabBtn
                key={scope}
                type="button"
                $active={tab === scope}
                onClick={() => setTabAndUrl(scope)}>
                {WORKFLOW_SCOPE_LABELS[scope]}
              </TabBtn>
            ))}
          </TabRow>
        </TabBar>
      ) : null}
      <BodyArea>
        {tab === "sales" && scopes.includes("sales") ? (
          <SalesPending embedded scope="sales" />
        ) : null}
        {tab === "inventory" && scopes.includes("inventory") ? (
          <InventoryPending embedded scope="inventory" />
        ) : null}
        {tab === "finance" && scopes.includes("finance") ? (
          <FinancePending embedded scope="finance" />
        ) : null}
      </BodyArea>
    </PageRoot>
  );
}
