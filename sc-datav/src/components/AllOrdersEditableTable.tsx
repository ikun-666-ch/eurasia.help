import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { fetchSalesOrders, fetchSkuCatalog, updateSalesOrder, cancelSalesOrder, uploadFiles } from "@/api";
import { getRoleCode } from "@/api/client";
import type { SalesOrderRow, SkuCatalog } from "@/api/types";
import {
  SHANXI_CITIES,
  districtsForCity,
  mergeSelectOptions,
} from "@/data/shaanxiCityDistricts";
import { ORDER_STATUS_LABEL, orderStatusLabel } from "@/utils/formatRelative";
import { canCancelOrder } from "@/utils/salesWorkflow";
import { exportOrdersCsv } from "@/utils/exportOrdersCsv";
import { useRoleApi } from "@/hooks/useRoleApi";
import TrackingQueryModal from "@/components/TrackingQueryModal";

const STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABEL).map(([code, label]) => ({
  code,
  label,
}));

const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(186, 206, 255, 0.35) transparent;
`;

const TableWrap = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

const FilterBar = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(48, 97, 219, 0.2);
`;

const FilterGroup = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(186, 206, 255, 0.75);
  white-space: nowrap;
`;

const FilterSelect = styled.select`
  min-width: 120px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(48, 97, 219, 0.45);
  background: rgba(8, 14, 28, 0.95);
  color: #e8f0ff;
  font: inherit;
  outline: none;
`;

const FilterInput = styled.input`
  width: 72px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(48, 97, 219, 0.45);
  background: rgba(8, 14, 28, 0.95);
  color: #e8f0ff;
  font: inherit;
  text-align: center;
  outline: none;
`;

const FilterSearchInput = styled.input`
  width: 200px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(48, 97, 219, 0.45);
  background: rgba(8, 14, 28, 0.95);
  color: #e8f0ff;
  font: inherit;
  outline: none;

  &::placeholder {
    color: rgba(186, 206, 255, 0.35);
  }
`;

const FilterSearchBtn = styled.button`
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid rgba(56, 189, 248, 0.45);
  background: rgba(14, 116, 144, 0.35);
  color: rgba(186, 230, 253, 0.95);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: rgba(14, 116, 144, 0.55);
  }
`;

const FilterDateInput = styled.input`
  width: 132px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(48, 97, 219, 0.45);
  background: rgba(8, 14, 28, 0.95);
  color: #e8f0ff;
  font: inherit;
  outline: none;

  &::-webkit-calendar-picker-indicator {
    filter: invert(0.85);
    cursor: pointer;
  }
`;

const FilterReset = styled.button`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(48, 97, 219, 0.35);
  background: transparent;
  color: rgba(186, 206, 255, 0.85);
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background: rgba(48, 97, 219, 0.12);
  }
`;

const FilterExportBtn = styled.button`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(34, 197, 94, 0.45);
  background: rgba(20, 83, 45, 0.25);
  color: #bbf7d0;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background: rgba(20, 83, 45, 0.45);
  }
`;


const MediaCell = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  justify-content: flex-start;
  padding: 4px 4px;
  min-height: 40px;
  align-items: center;
  overflow-x: auto;
  max-width: 100%;
`;

const MediaThumb = styled.div`
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(48, 97, 219, 0.25);
  background: #0a0f1e;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.15s;

  &:hover {
    transform: scale(1.08);
    border-color: rgba(56, 189, 248, 0.5);
  }

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .play-icon {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.35);
    color: white;
    font-size: 14px;
    pointer-events: none;
  }
`;

const MediaOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  img, video {
    max-width: 90vw;
    max-height: 90vh;
    border-radius: 8px;
    object-fit: contain;
  }
`;

const FilterSummary = styled.span`
  margin-left: auto;
  font-size: 12px;
  color: rgba(186, 206, 255, 0.55);
`;

const EmptyHint = styled.div`
  padding: 48px 16px;
  text-align: center;
  color: rgba(186, 206, 255, 0.55);
  font-size: 13px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: #e8f0ff;
`;

const Th = styled.th`
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 10px 8px;
  text-align: center;
  font-weight: 500;
  color: rgba(186, 206, 255, 0.85);
  background: rgba(12, 20, 40, 0.96);
  border-bottom: 1px solid rgba(48, 97, 219, 0.35);
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 0;
  border-bottom: 1px solid rgba(48, 97, 219, 0.12);
  text-align: center;
  vertical-align: middle;
`;

const SeqCell = styled.div`
  padding: 10px 8px;
  text-align: center;
  color: rgba(186, 206, 255, 0.7);
`;

const CellButton = styled.button<{ $empty?: boolean }>`
  width: 100%;
  min-height: 40px;
  padding: 8px;
  border: none;
  background: transparent;
  color: ${(p) => (p.$empty ? "rgba(186, 206, 255, 0.35)" : "#e8f0ff")};
  font: inherit;
  text-align: center;
  cursor: pointer;

  &:hover {
    background: rgba(48, 97, 219, 0.12);
  }
`;

const TrackBtn = styled.button`
  min-height: 36px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(48, 97, 219, 0.45);
  background: rgba(48, 97, 219, 0.15);
  color: #bdcfff;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const CancelLink = styled.button`
  min-height: 36px;
  padding: 6px 10px;
  margin-right: 6px;
  border-radius: 6px;
  border: 1px solid rgba(248, 113, 113, 0.45);
  background: rgba(127, 29, 29, 0.3);
  color: #fecaca;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
`;

const CellInput = styled.input`
  width: 100%;
  min-height: 40px;
  padding: 8px;
  border: 1px solid rgba(48, 97, 219, 0.55);
  background: rgba(8, 14, 28, 0.95);
  color: #e8f0ff;
  font: inherit;
  text-align: center;
  outline: none;
  box-sizing: border-box;
`;

const StatusWrap = styled.div`
  position: relative;
  width: 100%;
`;

const SelectMenu = styled.div<{ $scrollable?: boolean }>`
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  min-width: 112px;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid rgba(48, 97, 219, 0.45);
  background: rgba(8, 14, 28, 0.98);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  ${(p) =>
    p.$scrollable
      ? `
    max-height: 240px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(186, 206, 255, 0.35) transparent;
  `
      : ""}
`;

const StatusOption = styled.button<{ $active?: boolean }>`
  display: block;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: ${(p) => (p.$active ? "rgba(48, 97, 219, 0.22)" : "transparent")};
  color: ${(p) => (p.$active ? "#e8f0ff" : "rgba(186, 206, 255, 0.9)")};
  font: inherit;
  text-align: center;
  cursor: pointer;

  &:hover {
    background: rgba(48, 97, 219, 0.16);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const StatusToggle = styled(CellButton)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
`;

const StatusChevron = styled.span`
  font-size: 10px;
  color: rgba(186, 206, 255, 0.55);
`;

type EditableKey =
  | "orderNo"
  | "trackingNo"
  | "variety"
  | "specification"
  | "quantity"
  | "customerName"
  | "city"
  | "district"
  | "totalAmountWan"
  | "createdAt"
  | "media";

function formatAmountWan(amount: number) {
  return (amount / 10000).toFixed(2);
}

function formatOrderDate(iso: string) {
  if (!iso) return "";
  return iso.slice(0, 16).replace("T", " ");
}

function orderDateKey(iso: string) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function displayValue(order: SalesOrderRow, key: EditableKey): string {
  switch (key) {
    case "orderNo":
      return order.orderNo;
    case "trackingNo":
      return order.trackingNo;
    case "variety":
      return order.variety;
    case "specification":
      return order.specification;
    case "quantity":
      return order.quantity > 0 ? String(order.quantity) : "";
    case "customerName":
      return order.customerName;
    case "city":
      return order.city;
    case "district":
      return order.district;
    case "totalAmountWan":
      return formatAmountWan(order.totalAmount);
    case "createdAt":
      return formatOrderDate(order.createdAt);
    case "media":
      return "";
    default:
      return "";
  }
}

function buildPatch(
  key: EditableKey,
  raw: string
): Parameters<typeof updateSalesOrder>[1] {
  const v = raw.trim();
  switch (key) {
    case "orderNo":
      return { orderNo: v };
    case "trackingNo":
      return { trackingNo: v };
    case "variety":
      return { variety: v };
    case "specification":
      return { specification: v };
    case "quantity":
      return { quantity: Math.max(0, parseInt(v, 10) || 0) };
    case "customerName":
      return { customerName: v };
    case "city":
      return { city: v };
    case "district":
      return { district: v };
    case "totalAmountWan":
      return { totalAmount: Math.round(parseFloat(v || "0") * 10000 * 100) / 100 };
    case "createdAt":
      return { createdAt: v };
    case "media":
      return { media: v ? JSON.parse(v) : [] };
    default:
      return {};
  }
}

function EditableCell({
  value,
  empty,
  onSave,
}: {
  value: string;
  empty?: boolean;
  onSave: (next: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <CellInput
        autoFocus
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          }
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <CellButton
      type="button"
      $empty={empty && !value}
      onClick={() => setEditing(true)}
      title="点击编辑">
      {value || (empty ? "点击填写" : "—")}
    </CellButton>
  );
}

function OrderSelectCell({
  value,
  options,
  emptyHint,
  scrollable,
  formatLabel,
  disabled,
  disabledTitle,
  onSave,
}: {
  value: string;
  options: readonly string[];
  emptyHint?: boolean;
  scrollable?: boolean;
  formatLabel?: (value: string) => string;
  disabled?: boolean;
  disabledTitle?: string;
  onSave: (next: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const label = value ? (formatLabel ? formatLabel(value) : value) : emptyHint ? "点击选择" : "—";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const pick = async (next: string) => {
    if (saving || disabled) return;
    if (next === value) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <StatusWrap ref={wrapRef}>
      <StatusToggle
        type="button"
        $empty={emptyHint && !value}
        disabled={disabled || saving}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
        title={disabled ? disabledTitle : "点击展开选择"}>
        <span>{label}</span>
        {!disabled && <StatusChevron>{open ? "▲" : "▼"}</StatusChevron>}
      </StatusToggle>
      {open && !disabled && (
        <SelectMenu $scrollable={scrollable}>
          {options.map((option) => (
            <StatusOption
              key={option}
              type="button"
              $active={option === value}
              disabled={saving}
              onClick={() => void pick(option)}>
              {formatLabel ? formatLabel(option) : option}
            </StatusOption>
          ))}
        </SelectMenu>
      )}
    </StatusWrap>
  );
}

function OrderStatusCell({
  status,
  onSave,
}: {
  status: string;
  onSave: (code: string) => Promise<void>;
}) {
  return (
    <OrderSelectCell
      value={status}
      options={STATUS_OPTIONS.map(({ code }) => code)}
      formatLabel={(code) => ORDER_STATUS_LABEL[code] || code}
      onSave={onSave}
    />
  );
}

const COLUMNS: { key: EditableKey; title: string; emptyHint?: boolean }[] = [
  { key: "orderNo", title: "订单号" },
  { key: "trackingNo", title: "快递单号", emptyHint: true },
  { key: "variety", title: "品种" },
  { key: "specification", title: "规格" },
  { key: "quantity", title: "数量(株)" },
  { key: "customerName", title: "客户" },
  { key: "city", title: "地市" },
  { key: "district", title: "区县" },
  { key: "totalAmountWan", title: "金额(万)" },
  { key: "media", title: "发货凭证" },
  { key: "createdAt", title: "下单时间" },
];


function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|avi|mkv)$/i.test(url);
}

function MediaContent({ media }: { media: string[] }) {
  const [preview, setPreview] = useState<string | null>(null);
  if (!media || media.length === 0) return <CellButton $empty>—</CellButton>;
  return (
    <>
      <MediaCell>
        {media.slice(0, 4).map((url, i) => (
          <MediaThumb key={i} onClick={(e) => { e.stopPropagation(); setPreview(url); }}>
            {isVideoUrl(url) ? (
              <>
                <video src={url} preload="metadata" />
                <div className="play-icon">▶</div>
              </>
            ) : (
              <img src={url} alt="" loading="lazy" />
            )}
          </MediaThumb>
        ))}
        {media.length > 4 && <span style={{ fontSize: 11, color: "rgba(186,206,255,0.55)" }}>+{media.length - 4}</span>}
      </MediaCell>
      {preview && (
        <MediaOverlay onClick={() => setPreview(null)}>
          {isVideoUrl(preview) ? (
            <video src={preview} controls autoPlay onClick={(e) => e.stopPropagation()} />
          ) : (
            <img src={preview} alt="" />
          )}
        </MediaOverlay>
      )}
    </>
  );
}

const AddMediaBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 4px;
  border: 1px dashed rgba(56, 189, 248, 0.45);
  background: transparent;
  color: rgba(56, 189, 248, 0.8);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &:hover { border-color: #38bdf8; background: rgba(56,189,248,0.1); }
`;

function EditableMediaCell({ media, onSave }: { media: string[]; onSave: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selected = Array.from(files).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (selected.length === 0) return;
    setUploading(true);
    try {
      const urls = await uploadFiles(selected);
      onSave([...(media || []), ...urls]);
    } catch (e: any) {
      alert(e.message || "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const remove = (idx: number) => {
    onSave((media || []).filter((_, i) => i !== idx));
  };

  if (!media || media.length === 0) {
    return (
      <MediaCell>
        <span style={{ fontSize: 11, color: "rgba(186,206,255,0.45)", marginRight: 4 }}>—</span>
        {uploading ? <span style={{ fontSize: 11, color: "#4ade80" }}>上传中…</span> : (
          <AddMediaBtn onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }} title="添加媒体">+</AddMediaBtn>
        )}
        <input ref={inputRef} type="file" multiple accept="image/*,video/*" style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
      </MediaCell>
    );
  }

  return (
    <>
      <MediaCell>
        {media.slice(0, 4).map((url, i) => (
          <MediaThumb key={i} onClick={(e) => { e.stopPropagation(); setPreview(url); }}>
            {isVideoUrl(url) ? (
              <>
                <video src={url} preload="metadata" />
                <div className="play-icon">▶</div>
              </>
            ) : (
              <img src={url} alt="" loading="lazy" />
            )}
            <RemoveMediaBtn onClick={(e) => { e.stopPropagation(); remove(i); }} title="移除">×</RemoveMediaBtn>
          </MediaThumb>
        ))}
        {media.length > 4 && <span style={{ fontSize: 11, color: "rgba(186,206,255,0.55)" }}>+{media.length - 4}</span>}
        {uploading ? <span style={{ fontSize: 11, color: "#4ade80" }}>…</span> : (
          <AddMediaBtn onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }} title="添加媒体">+</AddMediaBtn>
        )}
        <input ref={inputRef} type="file" multiple accept="image/*,video/*" style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
      </MediaCell>
      {preview && (
        <MediaOverlay onClick={() => setPreview(null)}>
          {isVideoUrl(preview) ? (
            <video src={preview} controls autoPlay onClick={(e) => e.stopPropagation()} />
          ) : (
            <img src={preview} alt="" />
          )}
        </MediaOverlay>
      )}
    </>
  );
}

const RemoveMediaBtn = styled.button`
  position: absolute;
  top: 1px;
  right: 1px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.55);
  color: #fff;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { background: rgba(255,60,60,0.75); }
`;

export default function AllOrdersEditableTable() {
  const { ready, error: authError, roleCode, pageAccess } = useRoleApi();
  const isAdmin = roleCode === "ADMIN" || getRoleCode() === "ADMIN";
  const canEditSatisfaction =
    isAdmin || roleCode === "FINANCE" || getRoleCode() === "FINANCE";
  const [orders, setOrders] = useState<SalesOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<SalesOrderRow | null>(null);
  const [varietyFilter, setVarietyFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [skuCatalog, setSkuCatalog] = useState<SkuCatalog | null>(null);

  useEffect(() => {
    if (!ready) return;
    fetchSkuCatalog()
      .then(setSkuCatalog)
      .catch(() => setSkuCatalog(null));
  }, [ready]);

  const varietyOptions = useMemo(() => {
    const set = new Set(skuCatalog?.varieties ?? []);
    orders.forEach((o) => {
      if (o.variety) set.add(o.variety);
    });
    return [...set].sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [orders, skuCatalog]);

  const varietyEditOptions = useMemo(
    () => skuCatalog?.varieties ?? [],
    [skuCatalog]
  );

  const cityEditOptions = useMemo(() => [...SHANXI_CITIES], []);

  const cityOptions = useMemo(
    () =>
      [...new Set(orders.map((o) => o.city).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "zh-CN")
      ),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const minWan = amountMin.trim() === "" ? null : parseFloat(amountMin);
    const maxWan = amountMax.trim() === "" ? null : parseFloat(amountMax);
    const from = dateFrom.trim();
    const to = dateTo.trim();

    return orders.filter((order) => {
      if (searchKeyword) {
        const q = searchKeyword.toLowerCase();
        const blob = [
          order.orderNo,
          order.customerName,
          order.trackingNo,
          order.variety,
          order.specification,
          order.city,
          order.district,
          order.salespersonName,
          orderStatusLabel(order.status, order.rejectedAt),
          order.rejectedAt ? "被驳回" : "",
        ]
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (varietyFilter && order.variety !== varietyFilter) return false;
      if (cityFilter && order.city !== cityFilter) return false;
      if (statusFilter && order.status !== statusFilter) return false;

      const wan = order.totalAmount / 10000;
      if (minWan !== null && !Number.isNaN(minWan) && wan < minWan) return false;
      if (maxWan !== null && !Number.isNaN(maxWan) && wan > maxWan) return false;

      const day = orderDateKey(order.createdAt);
      if (from && day && day < from) return false;
      if (to && day && day > to) return false;

      return true;
    });
  }, [
    orders,
    varietyFilter,
    cityFilter,
    statusFilter,
    amountMin,
    amountMax,
    dateFrom,
    dateTo,
    searchKeyword,
  ]);

  const hasActiveFilters =
    searchKeyword !== "" ||
    varietyFilter !== "" ||
    cityFilter !== "" ||
    statusFilter !== "" ||
    amountMin.trim() !== "" ||
    amountMax.trim() !== "" ||
    dateFrom.trim() !== "" ||
    dateTo.trim() !== "";

  const resetFilters = () => {
    setSearchDraft("");
    setSearchKeyword("");
    setVarietyFilter("");
    setCityFilter("");
    setStatusFilter("");
    setAmountMin("");
    setAmountMax("");
    setDateFrom("");
    setDateTo("");
  };

  const applySearch = () => {
    setSearchKeyword(searchDraft.trim());
  };

  const load = useCallback(() => {
    return fetchSalesOrders().then(setOrders);
  }, []);

  useEffect(() => {
    if (!ready) {
      setLoading(!authError);
      if (authError) {
        setError(authError);
        setOrders([]);
      }
      return;
    }
    setLoading(true);
    setError(null);
    load()
      .catch((e: unknown) => {
        setOrders([]);
        setError(e instanceof Error ? e.message : "加载订单失败");
      })
      .finally(() => setLoading(false));
  }, [ready, authError, load]);

  const saveCell = async (orderId: number, key: EditableKey, raw: string) => {
    const updated = await updateSalesOrder(orderId, buildPatch(key, raw));
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o))
    );
  };

  const saveMedia = async (orderId: number, urls: string[]) => {
    const updated = await updateSalesOrder(orderId, { media: urls });
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o))
    );
  };

  const saveStatus = async (orderId: number, status: string) => {
    const updated = await updateSalesOrder(orderId, { status });
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o))
    );
  };

  const saveSatisfaction = async (orderId: number, value: string) => {
    const updated = await updateSalesOrder(orderId, {
      satisfaction: Number(value),
    });
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o))
    );
  };

  const handleCancel = async (order: SalesOrderRow) => {
    if (!confirm(`确定取消订单 ${order.orderNo}？`)) return;
    try {
      const updated = await cancelSalesOrder(order.id);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, ...updated } : o))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "取消失败");
    }
  };

  const saveCity = async (order: SalesOrderRow, city: string) => {
    const patch: Parameters<typeof updateSalesOrder>[1] = { city };
    const districts = districtsForCity(city);
    if (order.district && districts.length > 0 && !districts.includes(order.district)) {
      patch.district = districts[0];
    }
    const updated = await updateSalesOrder(order.id, patch);
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, ...updated } : o))
    );
  };

  const renderDataCell = (order: SalesOrderRow, key: EditableKey) => {
    switch (key) {
      case "variety":
        return (
          <OrderSelectCell
            value={order.variety}
            options={mergeSelectOptions(varietyEditOptions, order.variety)}
            onSave={(next) => saveCell(order.id, "variety", next)}
          />
        );
      case "specification": {
        const specOptions =
          skuCatalog?.specificationsByVariety[order.variety] ?? [];
        return (
          <OrderSelectCell
            value={order.specification}
            options={mergeSelectOptions(specOptions, order.specification)}
            onSave={(next) => saveCell(order.id, "specification", next)}
          />
        );
      }
      case "city":
        return (
          <OrderSelectCell
            value={order.city}
            options={cityEditOptions}
            scrollable
            onSave={(next) => saveCity(order, next)}
          />
        );
      case "media":
        return isAdmin
          ? <EditableMediaCell media={order.media ?? []} onSave={(urls) => saveMedia(order.id, urls)} />
          : <MediaContent media={order.media ?? []} />;
      case "district": {
        const districtOptions = mergeSelectOptions(
          districtsForCity(order.city),
          order.district
        );
        return (
          <OrderSelectCell
            value={order.district}
            options={districtOptions}
            scrollable
            disabled={!order.city || districtOptions.length === 0}
            disabledTitle="请先选择地市"
            onSave={(next) => saveCell(order.id, "district", next)}
          />
        );
      }
      default:
        return (
          <EditableCell
            value={displayValue(order, key)}
            empty={COLUMNS.find((c) => c.key === key)?.emptyHint}
            onSave={(next) => saveCell(order.id, key, next)}
          />
        );
    }
  };

  if (loading) {
    return <Scroll>加载中…</Scroll>;
  }
  if (error) {
    return <Scroll>{error}</Scroll>;
  }
  if (!orders.length) {
    return <Scroll>暂无订单</Scroll>;
  }

  return (
    <>
      <TableWrap>
        <FilterBar>
          <FilterGroup>
            搜索
            <FilterSearchInput
              value={searchDraft}
              placeholder="订单号 / 客户 / 运单号 / 品种"
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySearch();
              }}
            />
            <FilterSearchBtn type="button" onClick={applySearch}>
              搜索
            </FilterSearchBtn>
          </FilterGroup>
          <FilterGroup>
            品种
            <FilterSelect
              value={varietyFilter}
              onChange={(e) => setVarietyFilter(e.target.value)}>
              <option value="">全部</option>
              {varietyOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </FilterSelect>
          </FilterGroup>
          <FilterGroup>
            地市
            <FilterSelect
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}>
              <option value="">全部</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </FilterSelect>
          </FilterGroup>
          <FilterGroup>
            金额(万)
            <FilterInput
              type="number"
              min={0}
              step={0.01}
              placeholder="最小"
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
            />
            <span>—</span>
            <FilterInput
              type="number"
              min={0}
              step={0.01}
              placeholder="最大"
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
            />
          </FilterGroup>
          <FilterGroup>
            状态
            <FilterSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">全部</option>
              {STATUS_OPTIONS.map(({ code, label }) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </FilterSelect>
          </FilterGroup>
          <FilterGroup>
            下单时间
            <FilterDateInput
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="起始日期"
            />
            <span>—</span>
            <FilterDateInput
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              title="结束日期"
            />
          </FilterGroup>
          {hasActiveFilters && (
            <FilterReset type="button" onClick={resetFilters}>
              清除筛选
            </FilterReset>
          )}
          <FilterExportBtn
            type="button"
            onClick={() => exportOrdersCsv(filteredOrders)}
            title="导出当前筛选结果">
            导出 CSV
          </FilterExportBtn>
          <FilterSummary>
            显示 {filteredOrders.length} / {orders.length} 条
          </FilterSummary>
        </FilterBar>

        <Scroll>
          {filteredOrders.length === 0 ? (
            <EmptyHint>无匹配订单，请调整筛选条件</EmptyHint>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>序号</Th>
                  {COLUMNS.map((col) => (
                    <Th key={col.key}>{col.title}</Th>
                  ))}
                  <Th>销售员昵称</Th>
                  <Th>满意度</Th>
                  <Th>状态</Th>
                  <Th>操作</Th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, idx) => (
                  <tr key={order.id}>
                    <Td>
                      <SeqCell>{idx + 1}</SeqCell>
                    </Td>
                    {COLUMNS.map((col) => (
                      <Td key={col.key}>{renderDataCell(order, col.key)}</Td>
                    ))}
                    <Td>
                      <SeqCell>{order.salespersonName || "—"}</SeqCell>
                    </Td>
                    <Td>
                      {canEditSatisfaction ? (
                        <OrderSelectCell
                          value={String(order.satisfaction ?? 5)}
                          options={["1", "2", "3", "4", "5"]}
                          formatLabel={(v) => `${v} 分`}
                          onSave={(v) => saveSatisfaction(order.id, v)}
                        />
                      ) : (
                        <SeqCell>
                          {order.satisfaction != null ? `${order.satisfaction} 分` : "—"}
                        </SeqCell>
                      )}
                    </Td>
                    <Td>
                      {isAdmin ? (
                        <OrderStatusCell
                          status={order.status}
                          onSave={(code) => saveStatus(order.id, code)}
                        />
                      ) : (
                        <SeqCell>
                          {orderStatusLabel(order.status, order.rejectedAt)}
                        </SeqCell>
                      )}
                    </Td>
                    <Td>
                      {canCancelOrder(pageAccess, order.status, roleCode) && (
                        <CancelLink type="button" onClick={() => void handleCancel(order)}>
                          取消
                        </CancelLink>
                      )}
                      <TrackBtn
                        type="button"
                        disabled={!order.trackingNo?.trim()}
                        title={
                          order.trackingNo?.trim()
                            ? "查询快递100物流"
                            : "请先填写快递单号"
                        }
                        onClick={() => setTrackingOrder(order)}>
                        查物流
                      </TrackBtn>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Scroll>
      </TableWrap>

      {trackingOrder && (
        <TrackingQueryModal
          order={trackingOrder}
          onClose={() => setTrackingOrder(null)}
          onOrderUpdate={(updated) => {
            setOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
            );
            setTrackingOrder((prev) =>
              prev && prev.id === updated.id ? { ...prev, ...updated } : prev
            );
          }}
        />
      )}
    </>
  );
}
