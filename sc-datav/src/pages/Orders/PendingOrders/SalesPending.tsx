import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ApiError } from "@/api/client";
import { fetchSkuCatalog, fetchWorkflowPending, submitSalesOrder, cancelSalesOrder } from "@/api";
import type { WorkflowOrderRow } from "@/api/types";
import { useRoleApi } from "@/hooks/useRoleApi";
import { orderStatusLabel } from "@/utils/formatRelative";
import { canCancelOrder } from "@/utils/salesWorkflow";
import {
  ActionBtn,
  BackLink,
  CardActions,
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
  TopActions,
  MediaRow,
  MediaLabel,
  MediaItem,
  MediaOverlay,
  MediaMore,
} from "./styles";

type DraftForm = {
  variety: string;
  specification: string;
  quantity: string;
  totalAmount: string;
};

function toDraft(row: WorkflowOrderRow): DraftForm {
  return {
    variety: row.variety,
    specification: row.specification,
    quantity: String(row.quantity),
    totalAmount: String(row.totalAmount),
  };
}

type Props = { embedded?: boolean; scope?: "sales" };

export default function SalesPending({ embedded = false, scope = "sales" }: Props) {
  const { ready, error: authError, roleCode, pageAccess } = useRoleApi();
  const location = useLocation();
  const navigate = useNavigate();

  const [rows, setRows] = useState<WorkflowOrderRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, DraftForm>>({});
  const [catalog, setCatalog] = useState<{
    varieties: string[];
    specificationsByVariety: Record<string, string[]>;
  }>({ varieties: [], specificationsByVariety: {} });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [overlay, setOverlay] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchWorkflowPending(scope);
      setRows(list);
      setDrafts(Object.fromEntries(list.map((r) => [r.id, toDraft(r)])));
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
    if (!ready) return;
    load();
    fetchSkuCatalog()
      .then(setCatalog)
      .catch(() => {});
  }, [ready, load, location.key]);

  useEffect(() => {
    if (!ready) return;
    const refresh = () => load();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [ready, load]);

  function patchDraft(id: number, patch: Partial<DraftForm>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
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

  async function handleSubmit(row: WorkflowOrderRow) {
    const draft = drafts[row.id];
    if (!draft) return;
    setBusyId(row.id);
    setToast(null);
    try {
      await submitSalesOrder(row.id, {
        variety: draft.variety,
        specification: draft.specification,
        quantity: Number(draft.quantity),
        totalAmount: Number(draft.totalAmount),
      });
      setToast({ text: `订单 ${row.orderNo} 已确认规格并提交审核` });
      await load();
    } catch (err) {
      setToast({
        text: err instanceof ApiError ? err.message : "提交失败",
        error: true,
      });
    } finally {
      setBusyId(null);
    }
  }

  const specsFor = useMemo(
    () => (variety: string) => catalog.specificationsByVariety[variety] ?? [],
    [catalog]
  );

  const visibleRows = useMemo(
    () => rows.filter((r) => r.status === "DRAFT"),
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
      {authError ? <Toast $error>{authError}</Toast> : null}
      {toast ? <Toast $error={toast.error}>{toast.text}</Toast> : null}
      <Content>
        {!ready || loading ? (
          <Empty>加载中…</Empty>
        ) : visibleRows.length === 0 ? (
          <Empty>
            暂无草稿订单。
            <br />
            <ActionBtn
              type="button"
              $accent="orange"
              style={{ marginTop: 16 }}
              onClick={() => navigate("/orders/new")}>
              + 新建订单
            </ActionBtn>
          </Empty>
        ) : (
          <CardList>
            {visibleRows.map((row) => {
              const draft = drafts[row.id];
              if (!draft) return null;
              const specs = specsFor(draft.variety);
              return (
                <OrderCard key={row.id}>
                  <CardHead>
                    <div>
                      <OrderNo>{row.orderNo}</OrderNo>
                      <Meta>
                        经办 {row.salespersonName || "未填写"} · {row.customerName} · {row.city}
                        {row.district ? ` · ${row.district}` : ""} ·{" "}
                        {row.statusLabel || orderStatusLabel(row.status, row.rejectedAt)}
                      </Meta>
                    </div>
                    <CardActions>
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
                        $accent="orange"
                        disabled={busyId === row.id}
                        onClick={() => handleSubmit(row)}>
                        {busyId === row.id ? "提交中…" : "确认规格并提交"}
                      </ActionBtn>
                    </CardActions>
                  </CardHead>
                  <FormGrid>
                    <Field>
                      品种
                      <select
                        value={draft.variety}
                        onChange={(e) => {
                          const variety = e.target.value;
                          const first = specsFor(variety)[0] ?? "";
                          patchDraft(row.id, { variety, specification: first });
                        }}>
                        {catalog.varieties.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field>
                      规格
                      <select
                        value={draft.specification}
                        onChange={(e) =>
                          patchDraft(row.id, { specification: e.target.value })
                        }>
                        {specs.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field>
                      数量（株）
                      <input
                        type="number"
                        min={1}
                        value={draft.quantity}
                        onChange={(e) =>
                          patchDraft(row.id, { quantity: e.target.value })
                        }
                      />
                    </Field>
                    <Field>
                      销售金额（元）
                      <input
                        type="number"
                        min={1}
                        step="0.01"
                        value={draft.totalAmount}
                        onChange={(e) =>
                          patchDraft(row.id, { totalAmount: e.target.value })
                        }
                      />
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
          <Title>销售待办</Title>
          <Subtitle>核对客户与品种规格，确认后提交至库存发货</Subtitle>
        </div>
        <TopActions>
          <ActionBtn type="button" onClick={() => load()} disabled={loading}>
            刷新
          </ActionBtn>
          <ActionBtn
            type="button"
            $accent="orange"
            onClick={() => navigate("/orders/new")}>
            + 新建订单
          </ActionBtn>
          <BackLink as={Link} to="/home">
            返回首页
          </BackLink>
        </TopActions>
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
