import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import styled from "styled-components";
import { getPageAccess } from "@/api/client";
import { fetchWorkflowPendingCount } from "@/api";
import { useRoleApi } from "@/hooks/useRoleApi";
import { hasWorkflowScope } from "@/utils/salesWorkflow";
import {
  pendingPath,
  resolveBellScope,
  resolveWorkflowScopes,
} from "@/utils/workflowAccess";

const Bar = styled.div`
  position: absolute;
  top: 14px;
  right: 24px;
  z-index: 200;
  display: flex;
  gap: 8px;
  pointer-events: auto;
`;

const Btn = styled.button<{ $accent?: "orange" | "cyan" }>`
  margin: 0;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  letter-spacing: 0.06em;
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid
    ${({ $accent }) =>
      $accent === "orange"
        ? "rgba(234, 88, 12, 0.55)"
        : "rgba(56, 189, 248, 0.45)"};
  background: ${({ $accent }) =>
    $accent === "orange"
      ? "rgba(234, 88, 12, 0.25)"
      : "rgba(14, 116, 144, 0.35)"};
  color: ${({ $accent }) =>
    $accent === "orange" ? "rgba(255, 237, 213, 0.95)" : "rgba(186, 230, 253, 0.95)"};

  &:hover {
    background: ${({ $accent }) =>
      $accent === "orange"
        ? "rgba(234, 88, 12, 0.45)"
        : "rgba(14, 116, 144, 0.55)"};
  }
`;

const BellBtn = styled.button`
  position: relative;
  margin: 0;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  border: 1px solid rgba(56, 189, 248, 0.45);
  background: rgba(14, 116, 144, 0.35);

  &:hover {
    background: rgba(14, 116, 144, 0.55);
  }
`;

const BellBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  border: 2px solid rgba(8, 14, 28, 0.9);
`;

type Props = {
  showNewOrder?: boolean;
  showLedger?: boolean;
};

/** 大屏右上角：新建订单 / 待处理 / 入库管理（待办随当前面板与页面权限变化） */
export default function OrderWorkflowBar({
  showNewOrder = false,
  showLedger = false,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { ready, pageAccess } = useRoleApi();
  const [count, setCount] = useState(0);

  const pages = pageAccess.length > 0 ? pageAccess : getPageAccess();
  const bellScope = useMemo(
    () => resolveBellScope(location.pathname, pages),
    [location.pathname, pages]
  );
  const workflowScopes = useMemo(() => resolveWorkflowScopes(pages), [pages]);

  const refreshCount = useCallback(() => {
    fetchWorkflowPendingCount(bellScope)
      .then((d) => setCount(d.count))
      .catch(() => setCount(0));
  }, [bellScope]);

  useEffect(() => {
    if (!ready) return;
    refreshCount();
    const timer = window.setInterval(refreshCount, 15_000);
    return () => window.clearInterval(timer);
  }, [ready, refreshCount, location.key]);

  const canCreate = showNewOrder && hasWorkflowScope(pages, "sales");
  const canLedger = showLedger && hasWorkflowScope(pages, "inventory");
  const showPending = workflowScopes.length > 0;

  if (!ready || (!canCreate && !showPending && !canLedger)) return null;

  return (
    <Bar>
      {canLedger && (
        <Btn
          type="button"
          onClick={() => navigate("/inv/ledger")}>
          入库管理
        </Btn>
      )}
      {canCreate && (
        <Btn
          type="button"
          $accent="orange"
          onClick={() => navigate("/orders/new")}>
          新建订单
        </Btn>
      )}
      {showPending && (
        <BellBtn
          type="button"
          title="待处理"
          aria-label={`待处理${count > 0 ? `，${count} 条` : ""}`}
          onClick={() => navigate(pendingPath(bellScope))}>
          🔔
          {count > 0 ? (
            <BellBadge>{count > 99 ? "99+" : count}</BellBadge>
          ) : null}
        </BellBtn>
      )}
    </Bar>
  );
}
