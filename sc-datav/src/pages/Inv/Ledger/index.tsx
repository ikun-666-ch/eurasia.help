import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import styled from "styled-components";
import {
  createInventoryRow,
  deleteInventoryRow,
  fetchInventoryLedger,
  fetchSkuCatalog,
  updateInventoryRow,
} from "@/api";
import MediaUpload from "@/components/MediaUpload";
import type { InventoryLedgerRow, SkuCatalog } from "@/api/types";
import { ApiError } from "@/api/client";
import { SHANXI_CITIES } from "@/data/shaanxiCityDistricts";
import { useRoleApi } from "@/hooks/useRoleApi";
import OrderWorkflowBar from "@/components/OrderWorkflowBar";

const PageRoot = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: radial-gradient(ellipse at 50% 0%, #132040 0%, #070b14 55%, #050810 100%);
  color: #e8f0ff;
`;

const Header = styled.header`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px 12px;
  border-bottom: 1px solid rgba(186, 206, 255, 0.15);
`;

const Title = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 600;
`;

const Subtitle = styled.p`
  margin: 6px 0 0;
  font-size: 13px;
  color: rgba(186, 206, 255, 0.65);
`;

const BackLink = styled(Link)`
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid rgba(48, 97, 219, 0.45);
  background: rgba(48, 97, 219, 0.12);
  color: #bdcfff;
  text-decoration: none;
  font-size: 13px;
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  padding: 16px 28px 24px;
  display: flex;
  flex-direction: column;
`;

const Panel = styled.div`
  flex: 1;
  min-height: 0;
  border: 1px solid rgba(48, 97, 219, 0.25);
  border-radius: 8px;
  background: rgba(8, 14, 28, 0.72);
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
`;

const AddBtn = styled.button`
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid rgba(56, 189, 248, 0.45);
  background: rgba(14, 116, 144, 0.35);
  color: #e8f0ff;
  font-size: 13px;
  cursor: pointer;
`;

const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(48, 97, 219, 0.15);
    text-align: left;
  }

  th {
    color: rgba(186, 206, 255, 0.65);
    position: sticky;
    top: 0;
    background: rgba(8, 14, 28, 0.95);
  }
`;

const ActionBtn = styled.button`
  padding: 4px 10px;
  margin-right: 6px;
  border-radius: 4px;
  border: 1px solid rgba(48, 97, 219, 0.45);
  background: rgba(48, 97, 219, 0.15);
  color: #bdcfff;
  font-size: 12px;
  cursor: pointer;
`;

const DangerBtn = styled(ActionBtn)`
  border-color: rgba(239, 68, 68, 0.45);
  color: #fecaca;
`;

const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: grid;
  place-items: center;
  z-index: 300;
`;

const ModalBox = styled.div`
  width: min(420px, 92vw);
  padding: 20px;
  border-radius: 8px;
  background: #0f172a;
  border: 1px solid rgba(48, 97, 219, 0.35);
`;

const Field = styled.label`
  display: block;
  margin-bottom: 12px;
  font-size: 13px;

  input,
  select {
    display: block;
    width: 100%;
    margin-top: 6px;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid rgba(48, 97, 219, 0.35);
    background: rgba(4, 8, 18, 0.65);
    color: #e8f0ff;
  }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
`;

const Toast = styled.div<{ $error?: boolean }>`
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  background: ${({ $error }) =>
    $error ? "rgba(127, 29, 29, 0.45)" : "rgba(20, 83, 45, 0.45)"};
  color: ${({ $error }) => ($error ? "#fecaca" : "#bbf7d0")};
`;

type RowDraft = {
  variety: string;
  specification: string;
  quantity: string;
  city: string;
};

const EMPTY_DRAFT: RowDraft = {
  variety: "",
  specification: "",
  quantity: "",
  city: "",
};

export default function InvLedgerPage() {
  useRoleApi();

  const [rows, setRows] = useState<InventoryLedgerRow[]>([]);
  const [catalog, setCatalog] = useState<SkuCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [draft, setDraft] = useState<RowDraft>(EMPTY_DRAFT);
  const [media, setMedia] = useState<string[]>([]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, cat] = await Promise.all([
        fetchInventoryLedger(),
        fetchSkuCatalog().catch(() => null),
      ]);
      setRows(list);
      setCatalog(cat);
    } catch (err) {
      setToast({
        text: err instanceof ApiError ? err.message : "加载失败",
        error: true,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const specsFor = useMemo(
    () => (variety: string) => catalog?.specificationsByVariety[variety] ?? [],
    [catalog]
  );

  const openCreate = () => {
    setEditId(null);
    setDraft(EMPTY_DRAFT);
    setModalOpen(true);
  };

  const openEdit = (row: InventoryLedgerRow) => {
    setEditId(row.id);
    setDraft({
      variety: row.variety,
      specification: row.specification,
      quantity: String(row.quantity),
      city: row.city || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const variety = draft.variety.trim();
    const specification = draft.specification.trim();
    const quantity = Number(draft.quantity);
    if (!variety || !specification) {
      setToast({ text: "请填写品种和规格", error: true });
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      setToast({ text: "请填写有效数量", error: true });
      return;
    }
    try {
      if (editId) {
        const updated = await updateInventoryRow(editId, {
          variety,
          specification,
          quantity,
          city: draft.city || undefined,
        });
        setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        setToast({ text: "库存已更新" });
      } else {
        const created = await createInventoryRow({
          variety,
          specification,
          quantity,
          city: draft.city || undefined,
        });
        setRows((prev) => [...prev, created]);
        setToast({ text: "入库记录已添加（已写入 IN 流水）" });
      }
      setModalOpen(false);
    } catch (err) {
      setToast({
        text: err instanceof ApiError ? err.message : "保存失败",
        error: true,
      });
    }
  };

  const handleDelete = async (row: InventoryLedgerRow) => {
    if (!confirm(`确定删除「${row.variety} / ${row.specification}」库存记录？`)) return;
    try {
      await deleteInventoryRow(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setToast({ text: "已删除" });
    } catch (err) {
      setToast({
        text: err instanceof ApiError ? err.message : "删除失败",
        error: true,
      });
    }
  };

  return (
    <PageRoot>
      <OrderWorkflowBar />
      <Header>
        <div>
          <Title>库存入库管理</Title>
          <Subtitle>维护各地市苗木台账，新增入库自动记录 IN 流水</Subtitle>
        </div>
        <BackLink to="/home">返回首页</BackLink>
      </Header>
      <Body>
        <Panel>
          {toast ? <Toast $error={toast.error}>{toast.text}</Toast> : null}
          <Toolbar>
            <span>共 {rows.length} 条库存记录</span>
            <AddBtn type="button" onClick={openCreate}>
              + 新增入库
            </AddBtn>
          </Toolbar>
          <Scroll>
            {loading ? (
              <p>加载中…</p>
            ) : rows.length === 0 ? (
              <p style={{ color: "rgba(186,206,255,.5)" }}>暂无库存记录</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>品种</th>
                    <th>规格</th>
                    <th>数量(株)</th>
                    <th>地市</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.variety}</td>
                      <td>{row.specification}</td>
                      <td>{row.quantity}</td>
                      <td>{row.city || "—"}</td>
                      <td>
                        <ActionBtn type="button" onClick={() => openEdit(row)}>
                          编辑
                        </ActionBtn>
                        <DangerBtn type="button" onClick={() => void handleDelete(row)}>
                          删除
                        </DangerBtn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Scroll>
        </Panel>
      </Body>

      {modalOpen && (
        <ModalBackdrop onClick={() => setModalOpen(false)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px" }}>
              {editId ? "编辑库存" : "新增入库"}
            </h3>
            <Field>
              品种
              <select
                value={draft.variety}
                onChange={(e) =>
                  setDraft({ ...draft, variety: e.target.value, specification: "" })
                }>
                <option value="">请选择或下方手动输入</option>
                {(catalog?.varieties ?? []).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <input
                style={{ marginTop: 6 }}
                value={draft.variety}
                onChange={(e) => setDraft({ ...draft, variety: e.target.value })}
                placeholder="手动输入品种"
              />
            </Field>
            <Field>
              规格
              <select
                value={draft.specification}
                onChange={(e) => setDraft({ ...draft, specification: e.target.value })}>
                <option value="">请选择</option>
                {specsFor(draft.variety).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                style={{ marginTop: 6 }}
                value={draft.specification}
                onChange={(e) =>
                  setDraft({ ...draft, specification: e.target.value })
                }
                placeholder="手动输入规格"
              />
            </Field>
            <Field>
              数量（株）
              <input
                type="number"
                min={0}
                step={1}
                value={draft.quantity}
                onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
              />
            </Field>
            <Field>
              地市
              <select
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}>
                <option value="">全省 / 未指定</option>
                {SHANXI_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <MediaUpload value={media} onChange={setMedia} label="上传图片/视频（可选）" />
            <ModalActions>
              <ActionBtn type="button" onClick={() => setModalOpen(false)}>
                取消
              </ActionBtn>
              <AddBtn type="button" onClick={() => void handleSave()}>
                保存
              </AddBtn>
            </ModalActions>
          </ModalBox>
        </ModalBackdrop>
      )}
    </PageRoot>
  );
}
