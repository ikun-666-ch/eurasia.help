import { getToken } from "./client";
import { api, setToken, setRoleCode, setPageAccess } from "./client";
import type {
  CategoryNode,
  CustomerRow,
  DashboardKpi,
  FinanceAssetStats,
  FinanceSummary,
  FinanceSalesByCity,
  FinanceSalesByDistrict,
  FinanceSalesTrend,
  InventoryLedgerRow,
  InventoryDailyTrend,
  InventoryIoTrend,
  LoginResult,
  RegisterRoleOption,
  RoleRow,
  SkuCatalog,
  SkuRow,
  SalesOrderRow,
  WorkflowOrderRow,
  SalesOrdersByCity,
  SalesOrdersByDistrict,
  SalesOrdersByMonth,
  SalesOrderTrend,
  SalesSummary,
  SystemSettings,
  SystemMetrics,
  TrackingQueryResult,
  UpdateProfileResult,
  UserProfile,
  UserRow,
} from "./types";

export async function login(username: string, password: string) {
  const data = await api.post<LoginResult>("/auth/login", { username, password });
  setToken(data.token);
  setRoleCode(data.roleCode);
  setPageAccess(data.pageAccess);
  return data;
}

export type LoginMasks = { self?: string; partner?: string };

export async function fetchLoginMasks() {
  return api.get<LoginMasks>("/auth/login-masks");
}

/** 白名单手机号发送验证码 */
export async function sendSmsCode(mobile: string) {
  return api.post<{ sent: boolean }>("/auth/sms/send", { mobile });
}

/** 手机号 + 验证码登录 */
export async function loginSms(mobile: string, code: string) {
  const data = await api.post<LoginResult>("/auth/sms/login", { mobile, code });
  setToken(data.token);
  setRoleCode(data.roleCode);
  setPageAccess(data.pageAccess);
  return data;
}


export async function initSlideCaptcha() {
  return api.post<{ token: string; expiresIn: number }>("/auth/captcha/slide/init", {});
}

export async function verifySlideCaptcha(body: {
  token: string;
  elapsedMs: number;
  trackWidth: number;
  slideDistance: number;
}) {
  return api.post<{ captchaToken: string; expiresIn: number }>(
    "/auth/captcha/slide/verify",
    body,
  );
}

export async function sendRegisterCode(mobile: string, captchaToken: string) {
  return api.post<{ sent: boolean }>("/auth/register/send-code", { mobile, captchaToken });
}

export async function sendForgotPasswordCode(mobile: string, captchaToken: string) {
  return api.post<{ sent: boolean }>("/auth/forgot-password/send-code", {
    mobile,
    captchaToken,
  });
}

export async function resetForgotPassword(body: {
  mobile: string;
  code: string;
  password: string;
}) {
  return api.post<void>("/auth/forgot-password/reset", body);
}

export async function fetchRegisterRoles() {
  return api.get<RegisterRoleOption[]>("/auth/register/roles");
}

export async function registerWithPhone(body: {
  mobile: string;
  code: string;
  password: string;
  displayName?: string;
  username?: string;
  roleCode: string;
  adminKey?: string;
}) {
  const data = await api.post<LoginResult>("/auth/register", body);
  setToken(data.token);
  setRoleCode(data.roleCode);
  setPageAccess(data.pageAccess);
  return data;
}

export function logout() {
  setToken(null);
  setRoleCode(null);
  setPageAccess(null);
}

export async function authLogout() {
  try {
    await api.post<void>("/auth/logout", {});
  } catch {
    // 忽略网络错误，仍清除本地登录态
  }
  logout();
}

export const fetchProfile = () => api.get<UserProfile>("/auth/me");

export const updateProfile = async (body: {
  username?: string;
  displayName?: string;
}) => {
  const data = await api.put<UpdateProfileResult>("/auth/me", body);
  if (data.token) {
    setToken(data.token);
  }
  if (data.pageAccess) {
    setPageAccess(data.pageAccess);
  }
  return data;
};

export const changePassword = (body: { oldPassword: string; newPassword: string }) =>
  api.put<void>("/auth/password", body);

export const sendChangePhoneCode = (mobile: string, captchaToken: string) =>
  api.post<{ sent: boolean }>("/auth/phone/send-code", { mobile, captchaToken });

export const changePhone = (body: { mobile: string; code: string; password: string }) =>
  api.put<UserProfile>("/auth/phone", body);

export const fetchSystemSettings = () =>
  api.get<SystemSettings>("/admin/system/settings");

export const fetchSystemMetrics = () =>
  api.get<SystemMetrics>("/admin/system/metrics");

export const updateSystemSettings = (body: { autoFillEnabled: boolean }) =>
  api.put<SystemSettings>("/admin/system/settings", body);

export const runDailyAutoFill = () =>
  api.post<SystemSettings>("/admin/system/daily-fill", {});

export const fetchHealth = () =>
  api.get<{ status: string; service: string }>("/health");

export const fetchDashboardKpi = () =>
  api.get<DashboardKpi>("/admin/dashboard/kpi");

export const fetchUsers = () => api.get<UserRow[]>("/admin/users");

export const fetchRoles = () => api.get<RoleRow[]>("/admin/roles");

export const fetchCategories = () =>
  api.get<CategoryNode[]>("/admin/categories");

export const fetchCustomers = () =>
  api.get<CustomerRow[]>("/admin/customers");

export const fetchInventoryLedger = () =>
  api.get<InventoryLedgerRow[]>("/inventory/ledger");

const inventoryCityQuery = (city?: string | null) =>
  city ? `?city=${encodeURIComponent(city)}` : "";

export const fetchInventoryDailyTrend = (city?: string | null) =>
  api.get<InventoryDailyTrend>(`/inventory/daily-trend${inventoryCityQuery(city)}`);

export const fetchInventoryIoTrend = (city?: string | null) =>
  api.get<InventoryIoTrend>("/inventory/io-trend" + (city ? "?city=" + encodeURIComponent(city) : ""));

export const fetchSalesOrders = (city?: string | null) =>
  api.get<SalesOrderRow[]>(`/sales/orders${salesCityQuery(city)}`);

export const createSalesOrder = (body: {
  customerId?: number;
  customerName?: string;
  city?: string;
  district?: string;
  variety: string;
  specification: string;
  quantity: number;
  totalAmount: number;
  media?: string[];
}) => api.post<SalesOrderRow>("/sales/orders", body);

export const fetchSalesCustomers = (params?: { city?: string; district?: string }) => {
  const q = new URLSearchParams();
  if (params?.city) q.set("city", params.city);
  if (params?.district) q.set("district", params.district);
  const qs = q.toString();
  return api.get<CustomerRow[]>(`/sales/customers${qs ? `?${qs}` : ""}`);
};

export const fetchWorkflowPending = (scope?: string) => {
  const qs = scope ? `?scope=${encodeURIComponent(scope)}` : "";
  return api.get<WorkflowOrderRow[]>(`/sales/workflow/pending${qs}`);
};

export const fetchWorkflowPendingCount = (scope?: string) => {
  const qs = scope ? `?scope=${encodeURIComponent(scope)}` : "";
  return api.get<{ count: number }>(`/sales/workflow/pending-count${qs}`);
};

export const submitSalesOrder = (
  id: number,
  body?: {
    variety?: string;
    specification?: string;
    quantity?: number;
    totalAmount?: number;
  }
) => api.post<SalesOrderRow>(`/sales/orders/${id}/submit`, body ?? {});


export const shipSalesOrder = (
  id: number,
  body: { trackingNo: string; trackingCom?: string; media?: string[] }
) => api.post<SalesOrderRow>(`/sales/orders/${id}/ship`, body);


export const settleSalesOrder = (
  id: number,
  body: { costAmount: number; profitAmount?: number; satisfaction?: number }
) => api.post<SalesOrderRow>(`/sales/orders/${id}/settle`, body);

export const cancelSalesOrder = (id: number) =>
  api.post<SalesOrderRow>(`/sales/orders/${id}/cancel`, {});

export const rejectSalesOrder = (id: number, reason?: string) =>
  api.post<SalesOrderRow>(`/sales/orders/${id}/reject`, { reason: reason || "" });

const financeCityQuery = (city?: string | null) =>
  city ? `?city=${encodeURIComponent(city)}` : "";

export const fetchFinanceSummary = (city?: string | null) =>
  api.get<FinanceSummary>(`/finance/summary${financeCityQuery(city)}`);

export const fetchFinanceSalesTrend = (city?: string | null) =>
  api.get<FinanceSalesTrend>(`/finance/sales-trend${financeCityQuery(city)}`);

export const fetchFinanceSalesByCity = () =>
  api.get<FinanceSalesByCity>("/finance/sales-by-city");

export const fetchFinanceSalesByDistrict = (city: string) =>
  api.get<FinanceSalesByDistrict>(
    `/finance/sales-by-district?city=${encodeURIComponent(city)}`
  );

export const fetchFinanceAssetStats = (city?: string | null) =>
  api.get<FinanceAssetStats>(`/finance/asset-stats${financeCityQuery(city)}`);

const salesCityQuery = (city?: string | null) =>
  city ? `?city=${encodeURIComponent(city)}` : "";

export const fetchSalesOrdersByCity = () =>
  api.get<SalesOrdersByCity>("/sales/orders-by-city");

export const fetchSalesOrdersByDistrict = (city: string) =>
  api.get<SalesOrdersByDistrict>(
    `/sales/orders-by-district?city=${encodeURIComponent(city)}`
  );

export const fetchSalesOrderTrend = (city?: string | null) =>
  api.get<SalesOrderTrend>(`/sales/order-trend${salesCityQuery(city)}`);

export const fetchSalesSummary = (city?: string | null) =>
  api.get<SalesSummary>(`/sales/summary${salesCityQuery(city)}`);

export const fetchSalesOrdersByMonth = (city?: string | null) =>
  api.get<SalesOrdersByMonth>(`/sales/orders-by-month${salesCityQuery(city)}`);

/** 快递100 物流查询（需后端配置 express_config） */
export const querySalesTracking = (body: {
  num: string;
  com?: string;
  phone?: string;
  orderId?: number;
}) => api.post<TrackingQueryResult>("/sales/tracking/query", body);

export const updateFinanceSettings = (body: {
  growthRates: number[];
  pieItems: { name: string; value: number }[];
  assetValue?: number;
}) => api.put<FinanceSummary>("/finance/settings", body);

export const updateFinanceSalesTrend = (body: {
  city: string;
  thisYear: number[];
  lastYear: number[];
}) => api.put<FinanceSalesTrend>("/finance/sales-trend", body);

export const updateFinanceAssetStats = (body: {
  city: string;
  items: FinanceAssetStats["items"];
}) => api.put<FinanceAssetStats>("/finance/asset-stats", body);

export const fetchPanelConfig = (panelKey: string) =>
  api.get<Record<string, unknown>>(`/panels/${encodeURIComponent(panelKey)}`);

export const savePanelConfig = (panelKey: string, payload: Record<string, unknown>) =>
  api.put<Record<string, unknown>>(
    `/panels/${encodeURIComponent(panelKey)}`,
    { payload }
  );

export const createUser = (body: {
  username: string;
  password?: string;
  displayName: string;
  phone?: string;
  roleId?: number;
}) => api.post<UserRow>("/admin/users", body);

export const updateUser = (
  id: number,
  body: {
    displayName?: string;
    status?: string;
    roleId?: number;
    phone?: string;
    extraPages?: string[];
  }
) => api.put<UserRow>(`/admin/users/${id}`, body);

export const deleteUser = (id: number) =>
  api.delete<void>(`/admin/users/${id}`);

export const resetUserPassword = (id: number, password: string) =>
  api.post<void>(`/admin/users/${id}/reset-password`, { password });

export const updateRole = (
  id: number,
  body: { name?: string; permissions?: string }
) => api.put<RoleRow>(`/admin/roles/${id}`, body);

export const createCategory = (body: {
  name: string;
  parentId?: number | null;
  level?: number;
  sortOrder?: number;
}) => api.post<CategoryNode>("/admin/categories", body);

export const updateCategory = (
  id: number,
  body: { name?: string; sortOrder?: number }
) => api.put<CategoryNode>(`/admin/categories/${id}`, body);

export const deleteCategory = (id: number) =>
  api.delete<void>(`/admin/categories/${id}`);

export const fetchSkus = () => api.get<SkuRow[]>("/admin/skus");

export const fetchSkuCatalog = () =>
  api.get<SkuCatalog>("/inventory/sku-catalog");

export const createSku = (body: {
  variety: string;
  specification: string;
  categoryId?: number | null;
}) => api.post<SkuRow>("/admin/skus", body);

export const updateSku = (
  id: number,
  body: {
    variety?: string;
    specification?: string;
    categoryId?: number | null;
  }
) => api.put<SkuRow>(`/admin/skus/${id}`, body);

export const deleteSku = (id: number) =>
  api.delete<void>(`/admin/skus/${id}`);

export const createCustomer = (body: {
  name: string;
  contactName?: string;
  region?: string;
  district?: string;
  level?: string;
  phone?: string;
}) => api.post<CustomerRow>("/admin/customers", body);

export const updateCustomer = (
  id: number,
  body: {
    name?: string;
    contactName?: string;
    region?: string;
    district?: string;
    level?: string;
    phone?: string;
  }
) => api.put<CustomerRow>(`/admin/customers/${id}`, body);

export const deleteCustomer = (id: number) =>
  api.delete<void>(`/admin/customers/${id}`);

export const createInventoryRow = (body: {
  variety: string;
  specification: string;
  quantity: number;
  city?: string;
  warehouse?: string;
  media?: string[];
}) => api.post<InventoryLedgerRow>("/inventory/ledger", body);

export const updateInventoryRow = (
  id: number,
  body: {
    variety?: string;
    specification?: string;
    quantity?: number;
    city?: string;
    warehouse?: string;
  media?: string[];
  }
) => api.put<InventoryLedgerRow>(`/inventory/ledger/${id}`, body);

export const deleteInventoryRow = (id: number) =>
  api.delete<void>(`/inventory/ledger/${id}`);

export const updateSalesOrder = (
  id: number,
  body: {
    orderNo?: string;
    trackingNo?: string;
    trackingCom?: string;
    variety?: string;
    specification?: string;
    quantity?: number;
    customerName?: string;
    city?: string;
    district?: string;
    status?: string;
    totalAmount?: number;
    satisfaction?: number;
    createdAt?: string;
    media?: string[];
  }
) => api.put<SalesOrderRow>(`/sales/orders/${id}`, body);

export const updateFinanceMonth = (body: {
  yearMonth: string;
  revenue?: number;
  profit?: number;
  assetValue?: number;
}) => api.put<FinanceSummary>("/finance/monthly", body);

export const updateAssetValue = (assetValue: number) =>
  api.put<FinanceSummary>("/finance/asset-value", { assetValue });

export const uploadFiles = async (files: File[]): Promise<string[]> => {
  const base = import.meta.env.VITE_API_BASE ?? "/api";
  const token = getToken();

  const urls: string[] = [];
  for (const file of files) {
    const signResp = await fetch(`${base}/upload/sign?filename=${encodeURIComponent(file.name)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const signJson = await signResp.json();
    if (!signResp.ok || signJson.code !== 0) {
      throw new Error(signJson.message || "获取上传地址失败");
    }
    const { uploadUrl, publicUrl } = signJson.data;

    const putResp = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": "application/octet-stream" },
    });
    if (!putResp.ok) {
      throw new Error("直传 OSS 失败");
    }
    urls.push(publicUrl);
  }
  return urls;
};
