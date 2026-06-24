import { useEffect, useState } from "react";
import { fetchProfile } from "@/api";
import type { UserProfile } from "@/api/types";
import { ApiError, getToken, setPageAccess, setRoleCode } from "@/api/client";

/** 确认已登录且 token 可用；同步服务端角色与页面权限 */
export function useRoleApi() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    setProfile(null);

    if (!getToken()) {
      setError("未登录");
      return;
    }

    fetchProfile()
      .then((p) => {
        if (cancelled) return;
        setPageAccess(p.pageAccess);
        setRoleCode(p.roleCode);
        setProfile(p);
        setReady(true);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(
            e instanceof ApiError
              ? e.message
              : "无法连接后端，请检查 /api/health 是否正常"
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ready,
    error,
    profile,
    roleCode: profile?.roleCode ?? null,
    pageAccess: profile?.pageAccess ?? [],
  };
}
