import type { ApiResponse } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

let token: string | null =
  typeof localStorage !== "undefined"
    ? localStorage.getItem("nursery_token")
    : null;

export function setToken(value: string | null) {
  token = value;
  if (value) {
    localStorage.setItem("nursery_token", value);
  } else {
    localStorage.removeItem("nursery_token");
  }
}

export function setRoleCode(value: string | null) {
  if (value) {
    localStorage.setItem("nursery_role", value);
  } else {
    localStorage.removeItem("nursery_role");
  }
}

export function getRoleCode() {
  return typeof localStorage !== "undefined"
    ? localStorage.getItem("nursery_role")
    : null;
}

export function setPageAccess(pages: string[] | null) {
  if (pages && pages.length > 0) {
    localStorage.setItem("nursery_pages", JSON.stringify(pages));
  } else {
    localStorage.removeItem("nursery_pages");
  }
}

export function getPageAccess(): string[] {
  if (typeof localStorage === "undefined") return [];
  const raw = localStorage.getItem("nursery_pages");
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

export function hasPageAccess(page: string): boolean {
  const role = getRoleCode();
  if (role === "ADMIN") return true;
  return getPageAccess().includes(page);
}

export function getToken() {
  return token;
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError("无法连接后端，请检查 /api/ 是否已配置并可访问");
  }

  const text = await res.text();
  let json: ApiResponse<T>;
  try {
    json = JSON.parse(text) as ApiResponse<T>;
  } catch {
    throw new ApiError(
      res.status === 401
        ? "未登录或登录已过期，请刷新页面重试"
        : `接口返回异常 (${res.status})，服务器繁忙，请稍后重试`
    );
  }

  if (res.status === 401 || json.code === 401) {
    setToken(null);
    if (
      typeof window !== "undefined" &&
      !window.location.hash.includes("/login")
    ) {
      const base = window.location.pathname + window.location.search;
      window.location.replace(`${base}#/login`);
    }
    throw new ApiError(json.message || "未登录或登录已过期，请重新登录");
  }

  if (!res.ok || json.code !== 0) {
    throw new ApiError(json.message || `请求失败 (${res.status})`);
  }
  return json.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
