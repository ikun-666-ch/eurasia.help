import { useEffect, useState } from "react";
import { fetchPanelConfig } from "@/api";
import { usePanelRefresh } from "@/components/panelEditor/PanelRefreshContext";

export function usePanelConfig<T extends Record<string, unknown>>(
  panelKey: string,
  defaultValue: () => T,
  refreshToken?: number
) {
  const { version } = usePanelRefresh();
  const [data, setData] = useState<T>(defaultValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    fetchPanelConfig(panelKey)
      .then((remote) => {
        if (cancelled) return;
        if (remote && Object.keys(remote).length > 0) {
          setData({ ...defaultValue(), ...(remote as Partial<T>) });
        } else {
          setData(defaultValue());
        }
      })
      .catch(() => {
        if (!cancelled) setData(defaultValue());
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
