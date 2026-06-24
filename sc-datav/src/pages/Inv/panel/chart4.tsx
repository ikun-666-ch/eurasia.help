import { useEffect, useState } from "react";
import SeamVirtualScroll from "@/components/seamVirtualScroll";
import { fetchInventoryLedger } from "@/api";
import { ApiError } from "@/api/client";
import { useRoleApi } from "@/hooks/useRoleApi";
import { useMapStyleStore } from "../stores";

type Row = {
  value1: string;
  value2: string;
  value3: string;
  value4: string;
};

export default function Charts4({ refreshToken }: { refreshToken?: number }) {
  const { ready, error: authError } = useRoleApi();
  const selectedCity = useMapStyleStore((s) => s.selectedCity);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      setLoading(!authError);
      if (authError) {
        setError(authError);
        setRows([]);
      }
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchInventoryLedger()
      .then((list) => {
        if (cancelled) return;
        const filtered = selectedCity
          ? list.filter((item) => item.city === selectedCity)
          : list;
        setRows(
          filtered.map((item, idx) => ({
            value1: `${idx + 1}`,
            value2: item.variety,
            value3: item.specification,
            value4: Number(item.quantity).toFixed(1),
          }))
        );
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setRows([]);
        setError(
          e instanceof ApiError
            ? e.message
            : "加载库存台账失败，请确认后端与数据库已启动"
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, authError, refreshToken, selectedCity]);

  const placeholder: Row[] = loading
    ? [{ value1: "—", value2: "加载中…", value3: "", value4: "" }]
    : error
      ? [{ value1: "—", value2: error, value3: "", value4: "" }]
      : [{ value1: "—", value2: "暂无库存记录", value3: "", value4: "" }];

  return (
    <SeamVirtualScroll
      rowHeight={50}
      autoScroll={false}
      column={[
        { title: "", dataIndex: "value1" },
        { title: "品种", dataIndex: "value2" },
        { title: "规格", dataIndex: "value3" },
        { title: "数量(万株)", dataIndex: "value4" },
      ]}
      data={rows.length ? rows : placeholder}
    />
  );
}
