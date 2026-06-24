import { useMemo, useState } from "react";
import styled from "styled-components";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/api";
import type { CategoryNode } from "@/api/types";

const Section = styled.div`
  margin-bottom: 28px;
`;

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
  color: rgba(186, 206, 255, 0.85);
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
    font-weight: 500;
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
  background: rgba(127, 29, 29, 0.25);
  color: #fecaca;
`;

const NameCell = styled.td<{ $depth: number }>`
  padding-left: ${({ $depth }) => 12 + $depth * 20}px;
`;

const Hint = styled.p`
  margin: 10px 0 0;
  font-size: 12px;
  color: rgba(186, 206, 255, 0.5);
`;

const Field = styled.label`
  display: block;
  margin-bottom: 14px;
  font-size: 13px;
  color: rgba(186, 206, 255, 0.85);

  input {
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

type FlatRow = CategoryNode & { depth: number; parentId: number | null };

function flattenTree(
  nodes: CategoryNode[],
  depth = 0,
  parentId: number | null = null
): FlatRow[] {
  return nodes.flatMap((node) => [
    { ...node, depth, parentId },
    ...flattenTree(node.children ?? [], depth + 1, node.id),
  ]);
}

type Props = {
  categories: CategoryNode[];
  onReload: () => Promise<void>;
  showToast: (msg: string, ok?: boolean) => void;
  Modal: React.ComponentType<{
    title: string;
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    confirmLabel?: string;
    children: React.ReactNode;
  }>;
};

export default function CategoryTreeSection({
  categories,
  onReload,
  showToast,
  Modal,
}: Props) {
  const rows = useMemo(() => flattenTree(categories), [categories]);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<number | null>(null);
  const [createName, setCreateName] = useState("");

  const openCreateRoot = () => {
    setCreateParentId(null);
    setCreateName("");
    setCreateOpen(true);
  };

  const openCreateChild = (parentId: number) => {
    setCreateParentId(parentId);
    setCreateName("");
    setCreateOpen(true);
  };

  const openEdit = (row: FlatRow) => {
    setEditId(row.id);
    setEditName(row.name);
    setEditOpen(true);
  };

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) {
      showToast("请填写品类名称", false);
      return;
    }
    try {
      await createCategory({
        name,
        parentId: createParentId,
        level: createParentId ? 2 : 1,
      });
      await onReload();
      setCreateOpen(false);
      showToast("品类已添加");
    } catch {
      showToast("添加失败", false);
    }
  };

  const handleEdit = async () => {
    if (!editId) return;
    const name = editName.trim();
    if (!name) {
      showToast("请填写品类名称", false);
      return;
    }
    try {
      await updateCategory(editId, { name });
      await onReload();
      setEditOpen(false);
      showToast("品类已更新");
    } catch {
      showToast("更新失败", false);
    }
  };

  const handleDelete = async (row: FlatRow) => {
    if (!confirm(`确定删除品类「${row.name}」？`)) return;
    try {
      await deleteCategory(row.id);
      await onReload();
      showToast("已删除");
    } catch {
      showToast("删除失败，请先删除子品类或解除 SKU 关联", false);
    }
  };

  return (
    <Section>
      <SectionHead>
        <span>苗木品类树（一级 / 二级）</span>
        <ActionBtn type="button" onClick={openCreateRoot}>
          + 新增一级品类
        </ActionBtn>
      </SectionHead>
      <Table>
        <thead>
          <tr>
            <th>品类名称</th>
            <th>层级</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ color: "rgba(186,206,255,.5)" }}>
                暂无品类，请先添加一级品类
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <NameCell $depth={row.depth}>{row.name}</NameCell>
                <td>{row.level === 1 ? "一级" : "二级"}</td>
                <td>
                  {row.level === 1 && (
                    <ActionBtn type="button" onClick={() => openCreateChild(row.id)}>
                      添加子类
                    </ActionBtn>
                  )}
                  <ActionBtn type="button" onClick={() => openEdit(row)}>
                    编辑
                  </ActionBtn>
                  <DangerBtn type="button" onClick={() => void handleDelete(row)}>
                    删除
                  </DangerBtn>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
      <Hint>二级品类可关联到下方「品种规格」；删除前请先删子品类。</Hint>

      <Modal
        title={createParentId ? "新增二级品类" : "新增一级品类"}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onConfirm={() => void handleCreate()}
        confirmLabel="添加">
        <Field>
          品类名称
          <input
            autoFocus
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder={createParentId ? "如：国槐、银杏" : "如：乔木类、灌木类"}
          />
        </Field>
      </Modal>

      <Modal
        title="编辑品类"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onConfirm={() => void handleEdit()}
        confirmLabel="保存">
        <Field>
          品类名称
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
        </Field>
      </Modal>
    </Section>
  );
}
