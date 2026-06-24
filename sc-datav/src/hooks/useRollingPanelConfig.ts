import { useEffect, useState } from "react";
import { fetchPanelConfig } from "@/api";
import { usePanelRefresh } from "@/components/panelEditor/PanelRefreshContext";

/**
 * 加载面板配置：数值沿用已保存/默认数据，日期每次按当天自动滚动。
 */
export function useRollingPanelConfig<T extends { labels: string[] }>(
  panelKey: string,
  normalize: (remote: Partial<T> | null) => T,
  refreshToken?: number
) {
  const { version } = usePanelRefresh();
  const [data, setData] = useState<T>(() => normalize(null));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    fetchPanelConfig(panelKey)
      .then((remote) => {
        if (!cancelled) {
          setData(
            normalize(
              remote && Object.keys(remote).length > 0
                ? (remote as Partial<T>)
                : null
            )
          );
        }
      })
      .catch(() => {
        if (!cancelled) setData(normalize(null));
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [panelKey, version, refreshToken]);

  return { data, setData, ready };
}
