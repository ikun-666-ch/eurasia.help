/** 与后端 PageAccess 一致的页面 key */
export type PageKey =
  | "home"
  | "admin"
  | "inv"
  | "sal"
  | "fin"
  | "orders"
  | "profile";

export const ALL_PAGES: PageKey[] = [
  "home",
  "admin",
  "sal",
  "inv",
  "fin",
  "orders",
  "profile",
];

export const PAGE_LABELS: Record<PageKey, string> = {
  home: "首页",
  admin: "系统管理",
  inv: "库存管理",
  sal: "销售管理",
  fin: "财务管理",
  orders: "全部订单",
  profile: "个人中心",
};

export const ROLE_DEFAULT_PAGES: Record<string, PageKey[]> = {
  ADMIN: ["home", "admin", "sal", "inv", "fin", "orders", "profile"],
  INVENTORY: ["home", "inv", "profile"],
  SALES: ["home", "sal", "orders", "profile"],
  FINANCE: ["home", "fin", "profile"],
};

/** 非 ADMIN 角色不可被额外授予的页面 */
export const NON_GRANTABLE_EXTRA_PAGES: PageKey[] = ["admin"];

/** 权限配置弹窗中可选页面（不含系统管理） */
export const PERM_EDIT_PAGES: PageKey[] = ALL_PAGES.filter(
  (p) => !NON_GRANTABLE_EXTRA_PAGES.includes(p),
);

export function formatPageList(pages: PageKey[]): string {
  return pages.map((p) => PAGE_LABELS[p]).join("、");
}

/** 首页 3D 轮播：按业务流程 系统 → 销售 → 库存 → 财务 */
export const HOME_CAROUSEL = [
  { page: "admin" as PageKey, route: "/admin", image: "role_0" },
  { page: "sal" as PageKey, route: "/sal", image: "role_1" },
  { page: "inv" as PageKey, route: "/inv", image: "role_2" },
  { page: "fin" as PageKey, route: "/fin", image: "role_3" },
] as const;

/** @deprecated 使用 HOME_CAROUSEL */
export const CAROUSEL_PAGE_KEYS: PageKey[] = HOME_CAROUSEL.map((e) => e.page);

export function isGrantableExtraPage(roleCode: string, page: PageKey): boolean {
  if (roleCode === "ADMIN") return false;
  if (NON_GRANTABLE_EXTRA_PAGES.includes(page)) return false;
  const defaults = ROLE_DEFAULT_PAGES[roleCode] ?? ["home", "profile"];
  return !defaults.includes(page);
}

export function grantablePages(roleCode: string): PageKey[] {
  if (roleCode === "ADMIN") return [];
  return PERM_EDIT_PAGES.filter((p) => isGrantableExtraPage(roleCode, p));
}
