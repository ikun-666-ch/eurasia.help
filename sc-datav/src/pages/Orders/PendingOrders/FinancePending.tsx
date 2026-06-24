import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ApiError } from "@/api/client";
import { fetchWorkflowPending, settleSalesOrder } from "@/api";
import type { WorkflowOrderRow } from "@/api/types";
import { useRoleApi } from "@/hooks/useRoleApi";
import { CARRIER_OPTIONS } from "./carriers";
import {
  ActionBtn,
  BackLink,
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
  MediaRow,
  MediaLabel,
  MediaItem,
  MediaOverlay,
  MediaMore,
} from "./styles";

type FinanceForm = {
  costAmount: string;
  profitAmount: string;
  satisfaction: string;
};

function carrierLabel(code: string) {
  return CARRIER_OPTIONS.find((o) => o.value === code)?.label || code || "—";
}

function toFinanceForm(row: WorkflowOrderRow): FinanceForm {
  const cost = row.costAmount != null ? String(row.costAmount) : "";
  const profit =
    row.profitAmount != null
      ? String(row.profitAmount)
      : cost
        ? String(Math.max(0, row.totalAmount - Number(cost)))
        : String(row.totalAmount);
  return {
    costAmount: cost,
    profitAmount: profit,
    satisfaction: String(row.satisfaction ?? 5),
  };
}

type Props = { embedded?: boolean; scope?: "finance" };

export default function FinancePending({ embedded = false, scope = "finance" }: Props) {
  useRoleApi();

  const [rows, setRows] = useState<WorkflowOrderRow[]>([]);
  const [forms, setForms] = useState<Record<number, FinanceForm>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [overlay, setOverlay] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchWorkflowPending(scope);
      setRows(list);
      setForms(Object.fromEntries(list.map((r) => [r.id, toFinanceForm(r)])));
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

  function patchForm(id: number, patch: Partial<FinanceForm>, row?: WorkflowOrderRow) {
    setForms((prev) => {
      const next = { ...prev[id], ...patch };
      if (patch.costAmount !== undefined && row) {
        const cost = Number(patch.costAmount);
        if (!Number.isNaN(cost) && cost >= 0) {
          next.profitAmount = String(Math.max(0, row.totalAmount - cost));
        }
      }
      return { ...prev, [id]: next };
    });
  }

  async function handleSettle(row: WorkflowOrderRow) {
    const form = forms[row.id];
    const costAmount = Number(form?.costAmount);
    const profitAmount = Number(form?.profitAmount);
    const satisfaction = Number(form?.satisfaction);
    if (!form?.costAmount || Number.isNaN(costAmount) || costAmount <= 0) {
      setToast({ text: "请填写成本费用", error: true });
      return;
    }
    if (Number.isNaN(profitAmount) || profitAmount < 0) {
      setToast({ text: "请确认利润金额", error: true });
      return;
    }
    if (Number.isNaN(satisfaction) || satisfaction < 1 || satisfaction > 5) {
      setToast({ text: "请选择 1-5 分满意度", error: true });
      return;
    }
    setBusyId(row.id);
    setToast(null);
    try {
      await settleSalesOrder(row.id, { costAmount, profitAmount, satisfaction });
      setToast({ text: `订单 ${row.orderNo} 已结算完成` });
      await load();
    } catch (err) {
      setToast({
        text: err instanceof ApiError ? err.message : "结算失败",
        error: true,
      });
    } finally {
      setBusyId(null);
    }
  }

  const visibleRows = useMemo(
    () => rows.filter((r) => r.status === "SHIPPING"),
    [rows]
  );

  function parseMedia(row: WorkflowOrderRow): string[] {
    try {
      const m = row.media;
      if (!m) return [];
      if (Array.isArray(m)) return m;
      return JSON.parse(m as string);
    } catch {
      return [];
    }
  }

  const body = (
    <>
      {toast ? <Toast $error={toast.error}>{toast.text}</Toast> : null}
      <Content>
        {loading ? (
          <Empty>加载中…</Empty>
        ) : visibleRows.length === 0 ? (
          <Empty>暂无待结算订单</Empty>
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
                        {row.customerName} · 已出库待结算
                        {row.trackingNo
                          ? ` · 运单 ${row.trackingNo}${row.trackingCom ? `（${carrierLabel(row.trackingCom)}）` : ""}`
                          : ""}
                      </Meta>
                    </div>
                    <ActionBtn
                      type="button"
                      $accent="green"
                      disabled={busyId === row.id}
                      onClick={() => handleSettle(row)}>
                      {busyId === row.id ? "处理中…" : "确认费用与利润"}
                    </ActionBtn>
                  </CardHead>
                  <FormGrid>
                    <Field>
                      销售金额
                      <span className="readonly">¥{row.totalAmount.toLocaleString()}</span>
                    </Field>
                    <Field>
                      品种 / 规格
                      <span className="readonly">
                        {row.variety} / {row.specification} · {row.quantity} 株
                      </span>
                    </Field>
                    <Field>
                      成本费用（元）
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.costAmount}
                        placeholder="录入成本"
                        onChange={(e) =>
                          patchForm(row.id, { costAmount: e.target.value }, row)
                        }
                      />
                    </Field>
                    <Field>
                      利润（元）
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.profitAmount}
                        onChange={(e) =>
                          patchForm(row.id, { profitAmount: e.target.value })
                        }
                      />
                    </Field>
                    <Field>
                      客户满意度
                      <select
                        value={form.satisfaction}
                        onChange={(e) =>
                          patchForm(row.id, { satisfaction: e.target.value })
                        }>
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n} 分{n === 5 ? "（非常满意）" : n === 1 ? "（非常不满意）" : ""}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </FormGrid>
                  {(() => {
                    const media = parseMedia(row);
                    if (media.length === 0) return null;
                    return (
                      <MediaRow>
                        <MediaLabel>照片 / 视频</MediaLabel>
                        {media.slice(0, 4).map((url, i) => (
                          <MediaItem key={i} onClick={() => setOverlay(url)}>
                            {/\.(mp4|webm|mov|avi)$/i.test(url) ? (
                              <video src={url} muted />
                            ) : (
                              <img src={url} alt="发货凭证" />
                            )}
                          </MediaItem>
                        ))}
                        {media.length > 4 && <MediaMore>+{media.length - 4}</MediaMore>}
                      </MediaRow>
                    );
                  })()}
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
          <Title>财务待办</Title>
          <Subtitle>录入成本费用、确认利润后完成订单结算</Subtitle>
        </div>
        <BackLink as={Link} to="/home">
          返回首页
        </BackLink>
      </Header>
      {body}
      {overlay && (
        <MediaOverlay onClick={() => setOverlay(null)}>
          {/\.(mp4|webm|mov|avi)$/i.test(overlay) ? (
            <video src={overlay} controls autoPlay />
          ) : (
            <img src={overlay} alt="预览" />
          )}
        </MediaOverlay>
      )}
    </PageRoot>
  );
}
