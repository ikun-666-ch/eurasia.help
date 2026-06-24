import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import styled, { keyframes } from "styled-components";
import AutoFit from "@/components/autoFit";
import KpiRings from "./KpiRings";
import Modal from "./Modal";
import CategoryTreeSection from "./CategoryTreeSection";
import { useRoleApi } from "@/hooks/useRoleApi";
import {
  fetchCategories,
  fetchCustomers,
  fetchHealth,
  fetchRoles,
  fetchSkus,
  fetchSystemMetrics,
  fetchSystemSettings,
  fetchUsers,
  createUser,
  deleteUser,
  createSku,
  deleteSku,
  updateSku,
  updateSystemSettings,
  updateUser,
  resetUserPassword,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/api";
import { getRoleCode } from "@/api/client";
import type { CategoryNode, CustomerRow, RoleRow, SkuRow, SystemMetrics, UserRow } from "@/api/types";
import { usePanelRefresh } from "@/components/panelEditor/PanelRefreshContext";
import {
  apiQuotaStatusDanger,
  apiQuotaStatusLabel,
  apiQuotaStatusOk,
  apiQuotaThreshold,
  formatApiQuotaValue,
  formatBytes,
  categoryOptionLabel,
  flattenCategories,
  isUserDisabled,
  isUserOnline,
  USER_STATUS_OPTIONS,
} from "./adminUtils";
import {
  formatPageList,
  isGrantableExtraPage,
  NON_GRANTABLE_EXTRA_PAGES,
  PAGE_LABELS,
  PERM_EDIT_PAGES,
  type PageKey,
} from "@/utils/pageAccess";

/* ---------- Styles ---------- */

const scan = keyframes`
  0% { transform: translateY(-100%); opacity: 0; }
  50% { opacity: 0.35; }
  100% { transform: translateY(100vh); opacity: 0; }
`;

const Shell = styled.div`
  position: relative; width: 100vw; height: 100vh; overflow: hidden;
  background: radial-gradient(ellipse at 50% 0%, #132040 0%, #070b14 55%, #050810 100%);
  color: #e8f0ff; font-family: system-ui, -apple-system, "PingFang SC", sans-serif;
  &::before { content:""; position:absolute; inset:0; background-image: linear-gradient(rgba(48,97,219,.06) 1px,transparent 1px),linear-gradient(90deg, rgba(48,97,219,.06) 1px,transparent 1px); background-size:48px 48px; pointer-events:none; }
  &::after { content:""; position:absolute; left:0; right:0; top:0; height:120px; background:linear-gradient(180deg,rgba(56,189,248,.08),transparent); animation:${scan} 8s linear infinite; pointer-events:none; }
`;

const Layout = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: 72px 1fr;
  height: 100%;
  pointer-events: auto;
`;
const TopBar = styled.header`
  display:flex; align-items:center; justify-content:space-between; padding:0 28px;
  border-bottom:1px solid rgba(96,165,250,.25); background:linear-gradient(180deg,rgba(15,23,42,.92),rgba(15,23,42,.55)); backdrop-filter:blur(12px);
`;
const Brand = styled.div` h1{margin:0;font-size:22px;font-weight:600;letter-spacing:.12em;color:#f0f9ff;text-shadow:0 0 20px rgba(56,189,248,.45)} p{margin:4px 0 0;font-size:12px;color:rgba(186,230,253,.75)} `;
const TopMeta = styled.div` display:flex; align-items:center; gap:20px; font-size:12px; color:rgba(186,230,253,.8);
  span{padding:4px 10px;border:1px solid rgba(56,189,248,.35);border-radius:4px;background:rgba(14,116,144,.15)} `;
const HomeLink = styled(Link)` color:#7dd3fc; text-decoration:none; font-size:13px; &:hover{color:#bae6fd} `;
const Body = styled.div` display:grid; grid-template-columns:220px 1fr; min-height:0; `;
const SideNav = styled.nav` padding:20px 12px; border-right:1px solid rgba(96,165,250,.18); background:rgba(8,15,30,.65); `;
const NavItem = styled.button<{ $active?: boolean }>`
  width:100%; margin-bottom:8px; padding:12px 14px; text-align:left;
  border:1px solid ${({$active})=>$active?"rgba(56,189,248,.55)":"rgba(96,165,250,.12)"}; border-radius:6px;
  background:${({$active})=>$active?"linear-gradient(90deg,rgba(37,99,235,.35),rgba(14,116,144,.2))":"rgba(15,23,42,.4)"};
  color:${({$active})=>$active?"#f0f9ff":"rgba(226,232,240,.85)"}; font-size:14px; cursor:pointer; transition:border-color .2s,background .2s;
  &:hover{border-color:rgba(56,189,248,.45)}
`;
const Main = styled.main` padding:20px 24px 24px; overflow:auto; `;
const Panel = styled.section` border:1px solid rgba(96,165,250,.22); border-radius:8px; background:rgba(15,23,42,.55); overflow:hidden; `;
const PanelHead = styled.div` padding:12px 16px; font-size:15px; font-weight:600; letter-spacing:.06em; border-bottom:1px solid rgba(96,165,250,.15); background:linear-gradient(90deg,rgba(37,99,235,.2),transparent); display:flex; justify-content:space-between; align-items:center; `;

const Table = styled.table` width:100%; border-collapse:collapse; font-size:13px;
  th,td{padding:10px 14px; text-align:left; border-bottom:1px solid rgba(96,165,250,.1)}
  th{color:rgba(186,230,253,.85); font-weight:500; background:rgba(15,23,42,.8)}
  tr:hover td{background:rgba(37,99,235,.12)}
`;

const Status = styled.span<{ $ok?: boolean; $danger?: boolean }>`
  display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px;
  background:${({ $ok, $danger }) =>
    $danger
      ? "rgba(239,68,68,.2)"
      : $ok
        ? "rgba(34,197,94,.2)"
        : "rgba(234,179,8,.2)"};
  color:${({ $ok, $danger }) =>
    $danger ? "#fca5a5" : $ok ? "#86efac" : "#fde047"};
  border:1px solid ${({ $ok, $danger }) =>
    $danger
      ? "rgba(239,68,68,.45)"
      : $ok
        ? "rgba(34,197,94,.4)"
        : "rgba(234,179,8,.4)"};
`;

const ActionBtn = styled.button`
  background:none; border:1px solid rgba(96,165,250,.25); border-radius:4px; color:#7dd3fc;
  font-size:12px; padding:3px 8px; cursor:pointer; margin-right:6px; white-space:nowrap;
  &:hover{background:rgba(37,99,235,.25); border-color:rgba(56,189,248,.4)}
`;
const DangerBtn = styled(ActionBtn)` color:#fca5a5; border-color:rgba(248,113,113,.35); &:hover{background:rgba(248,113,113,.18)} `;
const AddBtn = styled.button`
  padding:6px 14px; border-radius:6px; border:1px solid #3061DB; background:linear-gradient(135deg,#3061DB,#4F46E5);
  color:#fff; font-size:12px; cursor:pointer; &:hover{box-shadow:0 0 10px rgba(48,97,219,.4)}
`;

const Field = styled.label` display:flex; flex-direction:column; gap:6px; margin-bottom:14px; font-size:13px; color:rgba(186,230,253,.8);
  input,select,textarea{ padding:8px 10px; border-radius:6px; border:1px solid rgba(96,165,250,.3); background:rgba(15,23,42,.8); color:#e8f0ff; font-size:13px; outline:none;
    &:focus{border-color:rgba(56,189,248,.6)}
  }
  textarea{min-height:70px; resize:vertical}
`;

const ToggleRow = styled.label` display:flex; align-items:center; gap:12px; cursor:pointer; user-select:none; input{width:18px;height:18px;accent-color:#38bdf8} `;
const Hint = styled.p` margin:12px 16px 16px; font-size:12px; line-height:1.6; color:rgba(186,230,253,.7); `;
const ErrorBox = styled.div` margin-bottom:16px; padding:12px 16px; border-radius:8px; border:1px solid rgba(248,113,113,.4); background:rgba(127,29,29,.35); color:#fecaca; font-size:13px; `;
const PermGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 16px;
  margin-top: 8px;
`;
const PermItem = styled.label<{ $locked?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ $locked }) => ($locked ? "rgba(186,230,253,.55)" : "rgba(226,232,240,.9)")};
  cursor: ${({ $locked }) => ($locked ? "default" : "pointer")};
  input {
    width: 16px;
    height: 16px;
    accent-color: #38bdf8;
    cursor: inherit;
  }
`;
const Toast = styled.div`
  position:fixed; top:20px; right:20px; z-index:200; padding:10px 16px; border-radius:6px;
  font-size:13px; animation:fadeIn .2s ease;
  background:${(p:{color?:string})=>p.color||"rgba(34,197,94,.2)"}; border:1px solid ${(p:{color?:string})=>p.color||"rgba(34,197,94,.4)"}; color:#fff;
`;

/* ---------- Constants ---------- */

const NAV = [
  { id: "users", label: "用户账号" },
  { id: "roles", label: "权限管理" },
  { id: "category", label: "品类与规格" },
  { id: "customers", label: "客户信息" },
  { id: "orders", label: "全部订单" },
  { id: "system", label: "系统监控" },
] as const;
type NavId = (typeof NAV)[number]["id"];

const CUSTOMER_LEVELS = ["A", "B", "C"];

const EMPTY_USER_DRAFT = {
  username: "",
  phone: "",
  displayName: "",
  password: "123456",
  roleId: 3,
};

const EMPTY_SKU_DRAFT = {
  variety: "",
  specification: "",
  categoryId: null as number | null,
};

const SkuSectionHead = styled.div`
  margin: 8px 0 12px;
  font-size: 14px;
  color: rgba(186, 206, 255, 0.85);
`;

/* ---------- Main Component ---------- */

export default function Admin() {
  const { ready, error } = useRoleApi();
  const navigate = useNavigate();
  const { version } = usePanelRefresh();
  const [active, setActive] = useState<NavId>("users");
  const [apiOk, setApiOk] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [skus, setSkus] = useState<SkuRow[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [autoFillEnabled, setAutoFillEnabled] = useState(false);
  const [lastAutoFillDate, setLastAutoFillDate] = useState<string | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [toast, setToast] = useState<{msg:string;color?:string}|null>(null);
  const isAdmin = getRoleCode() === "ADMIN";

  // Modal states
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUserDraft, setNewUserDraft] = useState(EMPTY_USER_DRAFT);
  const [resetPwUser, setResetPwUser] = useState<UserRow | null>(null);
  const [resetPwValue, setResetPwValue] = useState("");
  const [resetPwConfirm, setResetPwConfirm] = useState("");
  const [editPermUser, setEditPermUser] = useState<UserRow | null>(null);
  const [permDraft, setPermDraft] = useState<PageKey[]>([]);
  const [editSku, setEditSku] = useState<SkuRow | null>(null);
  const [newSkuOpen, setNewSkuOpen] = useState(false);
  const [newSkuDraft, setNewSkuDraft] = useState(EMPTY_SKU_DRAFT);
  const [editCustomer, setEditCustomer] = useState<CustomerRow | null>(null);
  const [newCustomer, setNewCustomer] = useState(false);

  const skuCount = skus.length;
  const flatCategories = useMemo(
    () => flattenCategories(categories),
    [categories]
  );

  const reloadCategories = useCallback(async () => {
    const tree = await fetchCategories();
    setCategories(tree);
  }, []);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, color: ok ? undefined : "rgba(239,68,68,.2)" });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const loadAll = useCallback(() => {
    if (!ready) return;
    fetchHealth().then(() => setApiOk(true)).catch(() => setApiOk(false));
    Promise.all([
      fetchUsers(), fetchRoles(), fetchSkus(), fetchCustomers(), fetchCategories(),
    ]).then(([u, r, s, cu, cat]) => {
      setUsers(u);
      setRoles(r);
      setSkus(s);
      setCustomers(cu);
      setCategories(cat);
      if (r.length > 0) {
        setNewUserDraft((d) => ({
          ...d,
          roleId: r.find((x) => x.id === 3)?.id ?? r[0].id,
        }));
      }
    });
    fetchSystemSettings().then(s => {
      setAutoFillEnabled(s.autoFillEnabled); setLastAutoFillDate(s.lastAutoFillDate);
    }).catch(() => {});
    fetchSystemMetrics().then(setSystemMetrics).catch(() => setSystemMetrics(null));
  }, [ready]);

  useEffect(() => { loadAll(); }, [loadAll, version]);

  const onToggleAutoFill = async () => {
    if (!isAdmin) return;
    setSettingsSaving(true);
    try {
      const s = await updateSystemSettings({ autoFillEnabled: !autoFillEnabled });
      setAutoFillEnabled(s.autoFillEnabled); setLastAutoFillDate(s.lastAutoFillDate);
      showToast(s.autoFillEnabled ? "自动填数已开启" : "自动填数已关闭");
    } catch { showToast("操作失败", false); }
    finally { setSettingsSaving(false); }
  };

  // --- User CRUD ---
  const handleUserEdit = async () => {
    if (!editUser) return;
    try {
      const u = await updateUser(editUser.id, {
        displayName: editUser.displayName,
        status: editUser.status,
        roleId: editUser.roleId,
        phone: editUser.phone?.trim() || "",
      });
      setUsers(prev => prev.map(x => x.id === u.id ? u : x));
      showToast("用户已更新");
      setEditUser(null);
    } catch { showToast("更新失败", false); }
  };

  const handleUserCreate = async () => {
    const username = newUserDraft.username.trim();
    const displayName = newUserDraft.displayName.trim();
    if (username.length < 3 || !displayName) {
      showToast("用户名至少 3 位且需填写姓名", false);
      return;
    }
    try {
      const created = await createUser({
        username,
        displayName,
        phone: newUserDraft.phone.trim() || undefined,
        password: newUserDraft.password || "123456",
        roleId: newUserDraft.roleId,
      });
      setUsers(prev => [...prev, created]);
      setNewUserOpen(false);
      setNewUserDraft((d) => ({
        ...EMPTY_USER_DRAFT,
        roleId: d.roleId,
      }));
      showToast("用户已创建");
    } catch { showToast("创建失败", false); }
  };

  const handleUserDelete = async (u: UserRow) => {
    if (!confirm(`确定删除用户「${u.displayName || u.username}」？`)) return;
    try {
      await deleteUser(u.id);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      showToast("用户已删除");
    } catch { showToast("删除失败", false); }
  };

  const handleResetPw = async () => {
    if (!resetPwUser) return;
    if (resetPwValue.length < 6) {
      showToast("新密码至少 6 位", false);
      return;
    }
    if (resetPwValue !== resetPwConfirm) {
      showToast("两次输入的密码不一致", false);
      return;
    }
    try {
      await resetUserPassword(resetPwUser.id, resetPwValue);
      showToast(`已重置 ${resetPwUser.username} 的密码`);
      setResetPwUser(null);
      setResetPwValue("");
      setResetPwConfirm("");
    } catch { showToast("重置失败", false); }
  };

  const openResetPw = (u: UserRow) => {
    setResetPwValue("");
    setResetPwConfirm("");
    setResetPwUser(u);
  };

  const closeResetPw = () => {
    setResetPwUser(null);
    setResetPwValue("");
    setResetPwConfirm("");
  };

  // --- Page permissions ---
  const openPermEdit = (u: UserRow) => {
    setEditPermUser(u);
    setPermDraft(
      (u.pageAccess as PageKey[]).filter(
        (p) => u.roleCode === "ADMIN" || !NON_GRANTABLE_EXTRA_PAGES.includes(p),
      ),
    );
  };

  const togglePermPage = (page: PageKey) => {
    if (!editPermUser) return;
    if (editPermUser.defaultPages.includes(page)) return;
    if (!isGrantableExtraPage(editPermUser.roleCode, page)) return;
    setPermDraft((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page],
    );
  };

  const handlePermSave = async () => {
    if (!editPermUser) return;
    if (editPermUser.roleCode === "ADMIN") {
      setEditPermUser(null);
      return;
    }
    const extraPages = permDraft.filter(
      (p) =>
        !editPermUser.defaultPages.includes(p) &&
        isGrantableExtraPage(editPermUser.roleCode, p as PageKey),
    );
    try {
      const u = await updateUser(editPermUser.id, { extraPages });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));
      showToast("页面权限已更新");
      setEditPermUser(null);
    } catch {
      showToast("更新失败", false);
    }
  };

  // --- SKU（品种·规格）CRUD ---
  const handleSkuSave = async () => {
    if (!editSku) return;
    const variety = editSku.variety.trim();
    const specification = editSku.specification.trim();
    if (!variety || !specification) {
      showToast("请填写品种和规格", false);
      return;
    }
    try {
      const row = await updateSku(editSku.id, {
        variety,
        specification,
        categoryId: editSku.categoryId ?? null,
      });
      setSkus(prev => prev.map(x => x.id === row.id ? row : x));
      showToast("品种规格已更新");
      setEditSku(null);
    } catch { showToast("更新失败", false); }
  };

  const handleSkuCreate = async () => {
    const variety = newSkuDraft.variety.trim();
    const specification = newSkuDraft.specification.trim();
    if (!variety || !specification) {
      showToast("请填写品种和规格", false);
      return;
    }
    try {
      const created = await createSku({
        variety,
        specification,
        categoryId: newSkuDraft.categoryId ?? null,
      });
      setSkus(prev => [...prev, created].sort((a, b) =>
        a.variety.localeCompare(b.variety, "zh-CN") ||
        a.specification.localeCompare(b.specification, "zh-CN")
      ));
      setNewSkuOpen(false);
      setNewSkuDraft(EMPTY_SKU_DRAFT);
      showToast("品种规格已添加");
    } catch { showToast("添加失败，可能已存在相同组合", false); }
  };

  const handleSkuDelete = async (row: SkuRow) => {
    if (!confirm(`确定删除「${row.variety} / ${row.specification}」？`)) return;
    try {
      await deleteSku(row.id);
      setSkus(prev => prev.filter(x => x.id !== row.id));
      showToast("已删除");
    } catch { showToast("删除失败，可能仍有库存记录", false); }
  };

  // --- Customer CRUD ---
  const handleCustomerSave = async () => {
    if (!editCustomer) return;
    try {
      if (editCustomer.id) {
        const c = await updateCustomer(editCustomer.id, {
          name: editCustomer.name, contactName: editCustomer.contactName,
          region: editCustomer.region, district: editCustomer.district, level: editCustomer.level,
        });
        setCustomers(prev => prev.map(x => x.id === c.id ? c : x));
        showToast("客户已更新");
      } else {
        const c = await createCustomer({
          name: editCustomer.name, contactName: editCustomer.contactName,
          region: editCustomer.region, district: editCustomer.district, level: editCustomer.level,
        });
        setCustomers(prev => [...prev, c]);
        showToast("客户已创建");
      }
      setEditCustomer(null); setNewCustomer(false);
    } catch { showToast("操作失败", false); }
  };

  const handleCustDelete = async (c: CustomerRow) => {
    if (!confirm(`确定删除「${c.name}」？`)) return;
    try {
      await deleteCustomer(c.id);
      setCustomers(prev => prev.filter(x => x.id !== c.id));
      showToast("已删除");
    } catch { showToast("删除失败", false); }
  };

  /* ---------- Render Helpers ---------- */

  const renderUsers = () => (
    <Table>
      <thead><tr><th>用户名</th><th>手机号</th><th>姓名</th><th>角色</th><th>状态</th><th>最近登录</th><th>操作</th></tr></thead>
      <tbody>
        {users.map(u => (
          <tr key={u.id}>
            <td>{u.username}</td>
            <td>{u.phone || "—"}</td>
            <td>{u.displayName}</td>
            <td>{u.roleName}</td>
            <td>
              <Status
                $ok={isUserOnline(u.status)}
                $danger={isUserDisabled(u.status)}>
                {u.status}
              </Status>
            </td>
            <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("zh-CN") : "—"}</td>
            <td>
              <ActionBtn onClick={() => setEditUser({...u})}>编辑</ActionBtn>
              <ActionBtn onClick={() => openResetPw(u)}>重置密码</ActionBtn>
              <DangerBtn onClick={() => void handleUserDelete(u)}>删除</DangerBtn>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );

  const renderPermissions = () => (
    <>
      <Table>
        <thead>
          <tr>
            <th>用户</th>
            <th>角色</th>
            <th>可访问页面</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>
                {u.displayName}
                <div style={{ fontSize: 11, color: "rgba(186,230,253,.55)" }}>{u.username}</div>
              </td>
              <td>{u.roleName}</td>
              <td>
                {u.roleCode === "ADMIN"
                  ? "全部页面"
                  : formatPageList(u.pageAccess as PageKey[])}
              </td>
              <td>
                {u.roleCode === "ADMIN" ? (
                  <span style={{ fontSize: 12, color: "rgba(186,230,253,.5)" }}>—</span>
                ) : (
                  <ActionBtn onClick={() => openPermEdit(u)}>配置权限</ActionBtn>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Hint>
        系统管理员默认拥有全部界面权限（含系统管理）。库存、销售、财务角色只能额外开通业务页面，不能授予系统管理权限。
      </Hint>
    </>
  );

  const renderSkus = () => (
    <Table>
      <thead><tr><th>品种</th><th>规格</th><th>关联品类</th><th>操作</th></tr></thead>
      <tbody>
        {skus.map(row => (
          <tr key={row.id}>
            <td>{row.variety}</td>
            <td>{row.specification}</td>
            <td>{row.categoryName || "—"}</td>
            <td>
              <ActionBtn onClick={() => setEditSku({ ...row })}>编辑</ActionBtn>
              <DangerBtn onClick={() => void handleSkuDelete(row)}>删除</DangerBtn>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );

  const renderCustomers = () => (
    <Table>
      <thead><tr><th>客户名称</th><th>联系人</th><th>所属地区</th><th>区县</th><th>等级</th><th>操作</th></tr></thead>
      <tbody>
        {customers.map(c => (
          <tr key={c.id}>
            <td>{c.name}</td>
            <td>{c.contactName}</td>
            <td>{c.region}</td>
            <td>{c.district || "—"}</td>
            <td>{c.level}</td>
            <td>
              <ActionBtn onClick={() => setEditCustomer({...c})}>编辑</ActionBtn>
              <DangerBtn onClick={() => handleCustDelete(c)}>删除</DangerBtn>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );

  const renderSystem = () => {
    const memOk =
      systemMetrics?.memoryUsagePercent == null ||
      systemMetrics.memoryUsagePercent < 85;
    const memDisplay = systemMetrics
      ? systemMetrics.memoryLimitBytes
        ? `${formatBytes(systemMetrics.memoryUsageBytes)} / ${formatBytes(systemMetrics.memoryLimitBytes)}${
            systemMetrics.memoryUsagePercent != null
              ? `（${systemMetrics.memoryUsagePercent}%）`
              : ""
          }`
        : formatBytes(systemMetrics.memoryUsageBytes)
      : "加载中…";

    return (
    <>
      <Table>
        <thead><tr><th>监控项</th><th>当前值</th><th>阈值</th><th>状态</th></tr></thead>
        <tbody>
          <tr><td>服务连通</td><td>{apiOk ? "正常" : "未连接"}</td><td>—</td><td><Status $ok={apiOk}>{apiOk ? "正常" : "异常"}</Status></td></tr>
          <tr><td>运行内存</td><td>{memDisplay}</td><td>&lt; 85%</td><td><Status $ok={memOk}>{memOk ? "正常" : "偏高"}</Status></td></tr>
          <tr><td>内存峰值</td><td>{systemMetrics ? formatBytes(systemMetrics.memoryPeakBytes) : "—"}</td><td>—</td><td><Status $ok>正常</Status></td></tr>
          <tr><td>会话缓存</td><td>{systemMetrics ? formatBytes(systemMetrics.cacheTotalBytes) : "—"}</td><td>—</td><td><Status $ok>正常</Status></td></tr>
          {systemMetrics?.cacheItems.map((item) => (
            <tr key={item.label}>
              <td style={{ paddingLeft: 28 }}>↳ {item.label}</td>
              <td>{formatBytes(item.bytes)}</td>
              <td>—</td>
              <td><Status $ok>正常</Status></td>
            </tr>
          ))}
          <tr><td>数据存储</td><td>{systemMetrics ? formatBytes(systemMetrics.storageBytes) : "—"}</td><td>—</td><td><Status $ok>正常</Status></td></tr>
          {systemMetrics?.apiQuotas.map((item) => (
            <tr key={item.label}>
              <td>{item.label}</td>
              <td title={item.message}>
                {formatApiQuotaValue(item.remaining, item.unit, item.configured)}
              </td>
              <td>{apiQuotaThreshold(item.label)}</td>
              <td>
                <Status
                  $ok={apiQuotaStatusOk(item.status)}
                  $danger={apiQuotaStatusDanger(item.status)}>
                  {apiQuotaStatusLabel(item.status)}
                </Status>
              </td>
            </tr>
          ))}
          <tr><td>用户总数</td><td>{users.length} 人</td><td>—</td><td><Status $ok>正常</Status></td></tr>
          <tr><td>角色数</td><td>{roles.length} 组</td><td>—</td><td><Status $ok>正常</Status></td></tr>
          <tr><td>品种规格</td><td>{skuCount} 条</td><td>—</td><td><Status $ok>正常</Status></td></tr>
          <tr><td>客户档案</td><td>{customers.length} 家</td><td>—</td><td><Status $ok>正常</Status></td></tr>
          <tr>
            <td>日更自动填数</td>
            <td>
              {isAdmin ? (
                <ToggleRow>
                  <input type="checkbox" checked={autoFillEnabled} disabled={settingsSaving} onChange={onToggleAutoFill} />
                  <span>{autoFillEnabled ? "已开启" : "已关闭"}</span>
                </ToggleRow>
              ) : (autoFillEnabled ? "已开启" : "已关闭")}
            </td>
            <td>每日 00:00</td>
            <td><Status $ok={autoFillEnabled}>{autoFillEnabled ? "自动" : "手动"}</Status></td>
          </tr>
          <tr><td>最近自动填数</td><td>{lastAutoFillDate ?? "—"}</td><td>—</td><td><Status $ok={!!lastAutoFillDate}>记录</Status></td></tr>
          {systemMetrics?.collectedAt && (
            <tr><td>更新时间</td><td>{systemMetrics.collectedAt}</td><td>—</td><td><Status $ok>—</Status></td></tr>
          )}
        </tbody>
      </Table>
      <Hint>
        运行内存与会话缓存为实时统计；数据存储包含业务库与本地配置体积。外部 API 配额（短信等）在打开本页时向服务商查询；短信低于 20 条显示「不足」，20–99 条显示「偏低」。快递100 查询单量需在快递100 企业管理后台查看。开启自动填数后每日零点写入日更趋势，关闭后图表留空。
        {!isAdmin && "（仅管理员可修改自动填数）"}
      </Hint>
    </>
    );
  };

  /* ---------- Render ---------- */

  return (
    <Shell>
      <AutoFit>
        <Layout>
          <TopBar>
            <Brand><h1>系统管理控制台</h1><p>核心关注：系统稳定性 · 数据基础配置</p></Brand>
            <TopMeta>
              <span>服务：{apiOk ? "正常" : "未连接"}</span>
              <HomeLink to="/home">← 返回首页</HomeLink>
            </TopMeta>
          </TopBar>
          <Body>
            <SideNav>
              {NAV.map(item => (
                <NavItem key={item.id} $active={active===item.id} onClick={() => { if (item.id === "orders") return navigate("/orders"); setActive(item.id); }}>{item.label}</NavItem>
              ))}
            </SideNav>
            <Main>
              {error && <ErrorBox>{error}</ErrorBox>}
              <KpiRings ready={ready} />
              <Panel>
                <PanelHead>
                  <span>{NAV.find(n=>n.id===active)?.label}</span>
                  {active==="users" && <AddBtn onClick={() => setNewUserOpen(true)}>+ 新增用户</AddBtn>}
                  {active==="customers" && <AddBtn onClick={() => { setEditCustomer({id:0,name:"",contactName:"",region:"",district:"",level:"B"}); setNewCustomer(true); }}>+ 新增客户</AddBtn>}
                  {active==="category" && <AddBtn onClick={() => setNewSkuOpen(true)}>+ 新增品种规格</AddBtn>}
                </PanelHead>
                {active==="users" && renderUsers()}
                {active==="roles" && renderPermissions()}
                {active==="category" && (
                  <>
                    <CategoryTreeSection
                      categories={categories}
                      onReload={reloadCategories}
                      showToast={showToast}
                      Modal={Modal}
                    />
                    <SkuSectionHead>品种规格（SKU）</SkuSectionHead>
                    {renderSkus()}
                  </>
                )}
                {active==="customers" && renderCustomers()}
                {active==="system" && renderSystem()}
              </Panel>
            </Main>
          </Body>
        </Layout>
      </AutoFit>

      <Modal title="编辑用户" open={!!editUser} onClose={()=>setEditUser(null)} onConfirm={handleUserEdit} confirmLabel="保存">
        {editUser && <>
          <Field>用户名 <input disabled value={editUser.username} /></Field>
          <Field>手机号
            <input
              value={editUser.phone ?? ""}
              maxLength={11}
              inputMode="numeric"
              onChange={e => setEditUser({ ...editUser, phone: e.target.value.replace(/\D/g, "") })}
              placeholder="11 位手机号"
            />
          </Field>
          <Field>姓名 <input value={editUser.displayName} onChange={e=>setEditUser({...editUser,displayName:e.target.value})} /></Field>
          <Field>角色 <select value={editUser.roleId} onChange={e=>setEditUser({...editUser,roleId:Number(e.target.value)})}>{roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
          <Field>状态 <select value={editUser.status} onChange={e=>setEditUser({...editUser,status:e.target.value})}>{USER_STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}</select></Field>
        </>}
      </Modal>

      <Modal title="新增用户" open={newUserOpen} onClose={() => setNewUserOpen(false)} onConfirm={handleUserCreate} confirmLabel="创建">
        <Field>用户名
          <input
            value={newUserDraft.username}
            onChange={e => setNewUserDraft({ ...newUserDraft, username: e.target.value })}
            placeholder="至少 3 个字符"
          />
        </Field>
        <Field>手机号
          <input
            value={newUserDraft.phone}
            maxLength={11}
            inputMode="numeric"
            onChange={e => setNewUserDraft({ ...newUserDraft, phone: e.target.value.replace(/\D/g, "") })}
            placeholder="11 位手机号（选填）"
          />
        </Field>
        <Field>姓名
          <input
            value={newUserDraft.displayName}
            onChange={e => setNewUserDraft({ ...newUserDraft, displayName: e.target.value })}
            placeholder="显示名称"
          />
        </Field>
        <Field>初始密码
          <input
            value={newUserDraft.password}
            onChange={e => setNewUserDraft({ ...newUserDraft, password: e.target.value })}
          />
        </Field>
        <Field>角色
          <select
            value={newUserDraft.roleId}
            onChange={e => setNewUserDraft({ ...newUserDraft, roleId: Number(e.target.value) })}>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </Field>
      </Modal>

      {/* Reset Password Modal */}
      <Modal title="重置密码" open={!!resetPwUser} onClose={closeResetPw} onConfirm={handleResetPw} confirmLabel="确认重置">
        {resetPwUser && <>
          <p style={{ color: "rgba(186,230,253,.8)", fontSize: 14, margin: "0 0 14px" }}>
            为用户 <strong>{resetPwUser.username}</strong> 设置新登录密码
          </p>
          <Field>新密码
            <input
              type="password"
              value={resetPwValue}
              onChange={e => setResetPwValue(e.target.value)}
              placeholder="至少 6 位"
              autoComplete="new-password"
            />
          </Field>
          <Field>确认密码
            <input
              type="password"
              value={resetPwConfirm}
              onChange={e => setResetPwConfirm(e.target.value)}
              placeholder="再次输入新密码"
              autoComplete="new-password"
            />
          </Field>
        </>}
      </Modal>

      <Modal
        title="配置页面权限"
        open={!!editPermUser}
        onClose={() => setEditPermUser(null)}
        onConfirm={handlePermSave}
        confirmLabel="保存">
        {editPermUser && (
          <>
            <p style={{ color: "rgba(186,230,253,.8)", fontSize: 14, margin: "0 0 12px" }}>
              用户 <strong>{editPermUser.displayName}</strong>（{editPermUser.roleName}）
            </p>
            <p style={{ color: "rgba(186,230,253,.65)", fontSize: 12, margin: "0 0 8px" }}>
              灰色勾选项为角色默认权限，不可取消；可额外勾选其他业务页面。「系统管理」仅限系统管理员角色。
            </p>
            <PermGrid>
              {PERM_EDIT_PAGES.map((page) => {
                const locked = editPermUser.defaultPages.includes(page);
                const grantable = isGrantableExtraPage(editPermUser.roleCode, page);
                const checked = permDraft.includes(page);
                return (
                  <PermItem key={page} $locked={locked || !grantable}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked || !grantable}
                      onChange={() => togglePermPage(page)}
                    />
                    <span>
                      {PAGE_LABELS[page]}
                      {locked ? "（默认）" : ""}
                    </span>
                  </PermItem>
                );
              })}
            </PermGrid>
          </>
        )}
      </Modal>

      <Modal title="编辑品种规格" open={!!editSku} onClose={() => setEditSku(null)} onConfirm={handleSkuSave} confirmLabel="保存">
        {editSku && <>
          <Field>品种
            <input value={editSku.variety} onChange={e => setEditSku({ ...editSku, variety: e.target.value })} />
          </Field>
          <Field>规格
            <input value={editSku.specification} onChange={e => setEditSku({ ...editSku, specification: e.target.value })} />
          </Field>
          <Field>关联品类
            <select
              value={editSku.categoryId ?? ""}
              onChange={e =>
                setEditSku({
                  ...editSku,
                  categoryId: e.target.value ? Number(e.target.value) : null,
                })
              }>
              <option value="">不关联</option>
              {flatCategories.map(c => (
                <option key={c.id} value={c.id}>{categoryOptionLabel(c)}</option>
              ))}
            </select>
          </Field>
        </>}
      </Modal>

      <Modal title="新增品种规格" open={newSkuOpen} onClose={() => setNewSkuOpen(false)} onConfirm={handleSkuCreate} confirmLabel="添加">
        <Field>品种
          <input
            autoFocus
            value={newSkuDraft.variety}
            onChange={e => setNewSkuDraft({ ...newSkuDraft, variety: e.target.value })}
            placeholder="如：国槐、银杏"
          />
        </Field>
        <Field>规格
          <input
            value={newSkuDraft.specification}
            onChange={e => setNewSkuDraft({ ...newSkuDraft, specification: e.target.value })}
            placeholder="如：胸径8cm、H1.5m"
          />
        </Field>
        <Field>关联品类
          <select
            value={newSkuDraft.categoryId ?? ""}
            onChange={e =>
              setNewSkuDraft({
                ...newSkuDraft,
                categoryId: e.target.value ? Number(e.target.value) : null,
              })
            }>
            <option value="">不关联</option>
            {flatCategories.map(c => (
              <option key={c.id} value={c.id}>{categoryOptionLabel(c)}</option>
            ))}
          </select>
        </Field>
      </Modal>

      {/* Customer Edit Modal */}
      <Modal title={newCustomer ? "新增客户" : "编辑客户"} open={!!editCustomer} onClose={()=>{setEditCustomer(null);setNewCustomer(false)}} onConfirm={handleCustomerSave} confirmLabel="保存">
        {editCustomer && <>
          <Field>客户名称 <input autoFocus value={editCustomer.name} onChange={e=>setEditCustomer({...editCustomer,name:e.target.value})} /></Field>
          <Field>联系人 <input value={editCustomer.contactName} onChange={e=>setEditCustomer({...editCustomer,contactName:e.target.value})} /></Field>
          <Field>所属地区 <input value={editCustomer.region} onChange={e=>setEditCustomer({...editCustomer,region:e.target.value})} placeholder="地市，如：西安市" /></Field>
          <Field>区县 <input value={editCustomer.district} onChange={e=>setEditCustomer({...editCustomer,district:e.target.value})} placeholder="如：雁塔区" /></Field>
          <Field>等级 <select value={editCustomer.level} onChange={e=>setEditCustomer({...editCustomer,level:e.target.value})}>{CUSTOMER_LEVELS.map(l=><option key={l} value={l}>{l==="A"?"A级":l==="B"?"B级":"C级"}</option>)}</select></Field>
        </>}
      </Modal>

      {/* Toast */}
      {toast && <Toast color={toast.color}>{toast.msg}</Toast>}
    </Shell>
  );
}
