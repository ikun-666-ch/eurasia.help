export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface LoginResult {
  token: string;
  username: string;
  displayName: string;
  roleCode: string;
  roleName: string;
  defaultPages: string[];
  extraPages: string[];
  pageAccess: string[];
}

export interface RegisterRoleOption {
  code: string;
  name: string;
}

export interface UserProfile {
  username: string;
  displayName: string;
  phone: string;
  phoneMasked: string;
  roleCode: string;
  roleName: string;
  defaultPages: string[];
  extraPages: string[];
  pageAccess: string[];
}

export type UpdateProfileResult = UserProfile & { token?: string };

export interface DashboardKpi {
  userCount: number;
  activeToday: number;
  roleCount: number;
  roleUsers: { name: string; value: number }[];
  categoryNodeCount: number;
  categorySlices: { name: string; value: number }[];
  customerCount: number;
  newCustomersThisWeek: number;
  systemUptimePercent: number;
}

export interface UserRow {
  id: number;
  username: string;
  phone: string;
  displayName: string;
  roleId: number;
  roleCode: string;
  roleName: string;
  /** 后端返回：在线 | 离线 | 禁用 */
  status: string;
  lastLoginAt: string | null;
  defaultPages: string[];
  extraPages: string[];
  pageAccess: string[];
}

export interface RoleRow {
  id: number;
  name: string;
  permissions: string;
  userCount: number;
}

export interface CategoryNode {
  id: number;
  name: string;
  level: number;
  children: CategoryNode[];
}

/** 品种 + 规格 */
export interface SkuRow {
  id: number;
  variety: string;
  specification: string;
  categoryId: number | null;
  categoryName: string | null;
}

export interface SkuCatalog {
  varieties: string[];
  specificationsByVariety: Record<string, string[]>;
}

export interface CustomerRow {
  id: number;
  name: string;
  contactName: string;
  region: string;
  district: string;
  level: string;
}

export interface InventoryLedgerRow {
  id: number;
  variety: string;
  specification: string;
  quantity: number;
  city: string;
  media?: string[];
}

export interface SalesOrderRow {
  id: number;
  orderNo: string;
  customerName: string;
  city: string;
  media?: string[];
  district: string;
  status: string;
  rejectedAt: string | null;
  totalAmount: number;
  satisfaction: number | null;
  createdAt: string;
  trackingNo: string;
  trackingCom: string;
  variety: string;
  specification: string;
  quantity: number;
  costAmount: number | null;
  profitAmount: number | null;
  salespersonId: number | null;
  salespersonName: string;
}

export interface WorkflowOrderRow extends SalesOrderRow {
  statusLabel: string;
  actionLabel: string;
}

export interface TrackingTrace {
  time?: string;
  ftime?: string;
  context?: string;
  status?: string;
}

export interface TrackingQueryResult {
  needPhone?: boolean;
  com?: string;
  num?: string;
  state?: string;
  message?: string;
  traces?: TrackingTrace[];
  order?: SalesOrderRow | null;
}

export interface FinancePieItem {
  name: string;
  value: number;
}

export interface FinanceSummary {
  months: string[];
  revenue: number[];
  profit: number[];
  assetValue: number;
  growthRates?: number[];
  pieItems?: FinancePieItem[];
  city?: string | null;
}

export interface FinanceSalesTrend {
  labels: string[];
  thisYear: number[];
  lastYear: number[];
  city?: string | null;
  manualRequired?: boolean;
  autoFillEnabled?: boolean;
}

export interface FinanceAssetStats {
  city?: string | null;
  items: {
    label: string;
    value: number;
    label2: string;
    value2: number;
    unit: string;
  }[];
}

export interface FinanceSalesByCity {
  cities: { city: string;
  media?: string[]; amount: number }[];
}

export interface FinanceSalesByDistrict {
  city: string | null;
  districts: { district: string; amount: number }[];
}

export interface SalesOrderRankRow {
  city?: string;
  district?: string;
  orderCount: number;
  totalAmount: number;
}

export interface SalesOrdersByCity {
  cities: { city: string;
  media?: string[]; orderCount: number; totalAmount: number }[];
}

export interface SalesOrdersByDistrict {
  city: string | null;
  districts: { district: string; orderCount: number; totalAmount: number }[];
}

export interface SalesOrderTrend {
  labels: string[];
  amounts: number[];
  city?: string | null;
  manualRequired?: boolean;
  autoFillEnabled?: boolean;
}

export interface SalesOrdersByMonth {
  city?: string | null;
  months: string[];
  orderCounts: number[];
  amounts: number[];
}

export interface SalesSummary {
  city?: string | null;
  totalAmount: number;
  orderCount: number;
  customerCount: number;
  regionCount: number;
  regionLabel: string;
  doneOrderCount: number;
  avgOrderAmount: number;
  trendLabels: string[];
  trendAmounts: number[];
  manualRequired?: boolean;
  autoFillEnabled?: boolean;
}

export interface SystemSettings {
  autoFillEnabled: boolean;
  lastAutoFillDate: string | null;
}

export interface SystemCacheItemMetric {
  label: string;
  bytes: number;
}

export type ApiQuotaStatus =
  | "normal"
  | "low"
  | "critical"
  | "unconfigured"
  | "error";

export interface ApiQuotaMetric {
  label: string;
  configured: boolean;
  remaining: number | null;
  unit: string;
  status: ApiQuotaStatus;
  message: string;
}

export interface SystemMetrics {
  memoryUsageBytes: number;
  memoryPeakBytes: number;
  memoryLimitBytes: number | null;
  memoryUsagePercent: number | null;
  cacheTotalBytes: number;
  cacheItems: SystemCacheItemMetric[];
  storageBytes: number;
  apiQuotas: ApiQuotaMetric[];
  collectedAt: string;
}

export interface InventoryDailyTrend {
  labels: string[];
  values: number[];
  city?: string | null;
  manualRequired?: boolean;
  autoFillEnabled?: boolean;
}

export interface InventoryIoTrend {
  labels: string[];
  inbound: number[];
  outbound: number[];
  manualRequired?: boolean;
  autoFillEnabled?: boolean;
}
