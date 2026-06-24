import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ApiError } from "@/api/client";
import { fetchWorkflowPending, shipSalesOrder, cancelSalesOrder, rejectSalesOrder } from "@/api";
import type { WorkflowOrderRow } from "@/api/types";
import MediaUpload from "@/components/MediaUpload";
import { useRoleApi } from "@/hooks/useRoleApi";
import { canCancelOrder, canRejectOrder } from "@/utils/salesWorkflow";
import { CARRIER_OPTIONS } from "./carriers";
import {
  ActionBtn,
  BackLink,
  CardActions,
  RejectBtn,
  CancelBtn,
  CardHead,
  CardList,
  Content,
  EmbeddedRoot,
  Empty,
  Field,
  FormGrid,
  Header,
  Meta,
  OrderCard,
  OrderNo,
  PageRoot,
  Subtitle,
  Title,
  Toast,
} from "./styles";

type ShipForm = {
  media: string[];
  trackingNo: string;
  trackingCom: string;
};

function toShipForm(row: WorkflowOrderRow): ShipForm {
  return {
    trackingNo: row.trackingNo || "",
    trackingCom: row.trackingCom || "",
    media: (() => { try { const m = row.media; if (!m) return []; if (Array.isArray(m)) return m; return JSON.parse(m as string); } catch { return []; } })(),
  };
}

type Props = { embedded?: boolean; scope?: "inventory" };

export default function InventoryPending({ embedded = false, scope = "inventory" }: Props) {
  const { roleCode, pageAccess } = useRoleApi();

  const [rows, setRows] = useState<WorkflowOrderRow[]>([]);
  const [forms, setForms] = useState<Record<number, ShipForm>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchWorkflowPending(scope);
      setRows(list);
      setForms(Object.fromEntries(list.map((r) => [r.id, toShipForm(r)])));
    } catch (err) {
      setToast({
        text: err instanceof ApiError ? err.message : "加载失败",
        error: true,
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  function patchForm(id: number, patch: Partial<ShipForm>) {
    setForms((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function handleReject(row: WorkflowOrderRow) {
    const reason = prompt(`请输入驳回订单 ${row.orderNo} 的原因（如：库存不足）：`);
    if (reason === null) return;
    setBusyId(row.id);
    setToast(null);
    try {
      await rejectSalesOrder(row.id, reason || "库存不足");
      setToast({ text: `订单 ${row.orderNo} 已驳回至销售草稿` });
      await load();
    } catch (err) {
      setToast({
        text: err instanceof ApiError ? err.message : "驳回失败",
        error: true,
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(row: WorkflowOrderRow) {
    if (!confirm(`确定取消订单 ${row.orderNo}？`)) return;
    setBusyId(row.id);
    setToast(null);
    try {
      await cancelSalesOrder(row.id);
      setToast({ text: `订单 ${row.orderNo} 已取消` });
      await load();
    } catch (err) {
      setToast({
        text: err instanceof ApiError ? err.message : "取消失败",
        error: true,
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleShip(row: WorkflowOrderRow) {
    const form = forms[row.id];
    if (!form?.trackingNo.trim()) {
      setToast({ text: "请填写快递单号", error: true });
      return;
    }
    setBusyId(row.id);
    setToast(null);
    try {
      const result: any = await shipSalesOrder(row.id, {
        trackingNo: form.trackingNo.trim(),
        trackingCom: form.trackingCom || undefined,
        media: form.media.length > 0 ? form.media : undefined,
      });
      const extra = result?.routeNote ? `（${result.routeNote}）` : "";
      setToast({ text: `订单 ${row.orderNo} 已出库发货${extra}` });
      await load();
    } catch (err) {
      setToast({
        text: err instanceof ApiError ? err.message : "发货失败",
        error: true,
      });
    } finally {
      setBusyId(null);
    }
  }

  const visibleRows = useMemo(
    () => rows.filter((r) => r.status === "CONFIRMED"),
    [rows]
  );

  const body = (
    <>
      {toast ? <Toast $error={toast.error}>{toast.text}</Toast> : null}
      <Content>
        {loading ? (
          <Empty>加载中…</Empty>
        ) : visibleRows.length === 0 ? (
          <Empty>暂无待发货订单</Empty>
        ) : (
          <CardList>
            {visibleRows.map((row) => {
              const form = forms[row.id];
              if (!form) return null;
              return (
                <OrderCard key={row.id}>
                  <CardHead>
                    <div>
                      <OrderNo>{row.orderNo}</OrderNo>
                      <Meta>
                        {row.salespersonName ? `销售员 ${row.salespersonName} · ` : ""}
                        {row.customerName} · {row.city}
                        {row.district ? ` · ${row.district}` : ""} · 待审核出库
                      </Meta>
                    </div>
                    <CardActions>
                      {canRejectOrder(pageAccess, row.status) && (
                        <RejectBtn
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => handleReject(row)}>
                          驳回至销售
                        </RejectBtn>
                      )}
                      {canCancelOrder(pageAccess, row.status, roleCode) && (
                        <CancelBtn
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => handleCancel(row)}>
                          取消订单
                        </CancelBtn>
                      )}
                      <ActionBtn
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => handleShip(row)}>
                        {busyId === row.id ? "处理中…" : "确认发货并出库"}
                      </ActionBtn>
                    </CardActions>
                  </CardHead>
                  <FormGrid>
                    <Field>
                      品种 / 规格
                      <span className="readonly">
                        {row.variety} / {row.specification}
                      </span>
                    </Field>
                    <Field>
                      数量
                      <span className="readonly">{row.quantity} 株</span>
                    </Field>
                    <Field>
                      销售金额
                      <span className="readonly">¥{row.totalAmount.toLocaleString()}</span>
                    </Field>
                    <Field>
                      快递单号
                      <input
                        required
                        value={form.trackingNo}
                        placeholder="填写运单号"
                        onChange={(e) =>
                          patchForm(row.id, { trackingNo: e.target.value })
                        }
                      />
                    </Field>
                    <Field>
                      快递公司
                      <select
                        value={form.trackingCom}
                        onChange={(e) =>
                          patchForm(row.id, { trackingCom: e.target.value })
                        }>
                        {CARRIER_OPTIONS.map((opt) => (
                          <option key={opt.value || "auto"} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <MediaUpload value={form.media} onChange={(urls) => patchForm(row.id, { media: urls })} label="上传发货凭证（可选）" />
                  </FormGrid>
                </OrderCard>
              );
            })}
          </CardList>
        )}
      </Content>
    </>
  );

  if (embedded) return <EmbeddedRoot>{body}</EmbeddedRoot>;

  return (
    <PageRoot>
      <Header>
        <div>
          <Title>库存待办</Title>
          <Subtitle>审核出库并填写快递单号，确认后转交财务结算</Subtitle>
        </div>
        <BackLink as={Link} to="/home">
          返回首页
        </BackLink>
      </Header>
      {body}
    </PageRoot>
  );
}
