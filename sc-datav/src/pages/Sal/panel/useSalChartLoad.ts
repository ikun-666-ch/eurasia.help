import { useEffect, useState } from "react";
import { useRoleApi } from "@/hooks/useRoleApi";

export function useSalChartLoad<T>(
  load: () => Promise<T>,
  deps: unknown[],
  enabled = true
) {
  const { ready, error: authError } = useRoleApi();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    load()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "数据加载失败");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, enabled, ...deps]);

  const statusMessage = !ready
    ? authError ?? "加载中…"
    : !enabled
      ? null
      : authError
        ? authError
        : loading
          ? "加载中…"
          : error
            ? error
            : null;

  return { ready, data, loading, error: authError ?? error, statusMessage };
}
