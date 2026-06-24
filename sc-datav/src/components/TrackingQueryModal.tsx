import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { querySalesTracking, updateSalesOrder } from "@/api";
import type { SalesOrderRow, TrackingQueryResult, TrackingTrace } from "@/api/types";
import { ApiError } from "@/api/client";
import { CARRIER_OPTIONS } from "@/pages/Orders/PendingOrders/carriers";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(4, 8, 18, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const Panel = styled.div`
  width: min(520px, 100%);
  max-height: min(80vh, 640px);
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  border: 1px solid rgba(48, 97, 219, 0.35);
  background: linear-gradient(180deg, #121a30 0%, #0a1020 100%);
  color: #e8f0ff;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 1px solid rgba(48, 97, 219, 0.2);
  flex-shrink: 0;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
`;

const CloseBtn = styled.button`
  border: none;
  background: transparent;
  color: rgba(186, 206, 255, 0.75);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
`;

const Body = styled.div`
  padding: 14px 18px;
  overflow: auto;
  flex: 1;
  min-height: 0;
`;

const Footer = styled.div`
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px 16px;
  border-top: 1px solid rgba(48, 97, 219, 0.2);
`;

const Meta = styled.div`
  font-size: 12px;
  color: rgba(186, 206, 255, 0.7);
  margin-bottom: 12px;
  line-height: 1.6;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 12px;
  color: rgba(186, 206, 255, 0.75);
`;

const Select = styled.select`
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(48, 97, 219, 0.45);
  background: rgba(8, 14, 28, 0.95);
  color: #e8f0ff;
  font: inherit;
`;

const PhoneRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
`;

const PhoneInput = styled.input`
  flex: 1;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(48, 97, 219, 0.45);
  background: rgba(8, 14, 28, 0.95);
  color: #e8f0ff;
  font: inherit;
`;

const ActionBtn = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid rgba(48, 97, 219, 0.45);
  background: rgba(48, 97, 219, 0.2);
  color: #bdcfff;
  cursor: pointer;
  white-space: nowrap;
  font: inherit;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: rgba(48, 97, 219, 0.32);
  }
`;

const PrimaryBtn = styled(ActionBtn)`
  background: rgba(48, 97, 219, 0.45);
  color: #e8f0ff;
`;

const TraceList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const TraceItem = styled.li`
  position: relative;
  padding: 0 0 14px 16px;
  border-left: 1px solid rgba(48, 97, 219, 0.25);

  &:last-child {
    border-left-color: transparent;
    padding-bottom: 0;
  }

  &::before {
    content: "";
    position: absolute;
    left: -4px;
    top: 4px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #3061db;
  }
`;

const TraceTime = styled.div`
  font-size: 11px;
  color: rgba(186, 206, 255, 0.55);
  margin-bottom: 4px;
`;

const TraceText = styled.div`
  font-size: 13px;
  line-height: 1.5;
`;

const ErrorText = styled.div`
  color: #fecaca;
  font-size: 13px;
  line-height: 1.5;
`;

const SuccessText = styled.div`
  color: #86efac;
  font-size: 13px;
  line-height: 1.5;
  margin-top: 8px;
`;

const Hint = styled.div`
  font-size: 12px;
  color: rgba(186, 206, 255, 0.55);
`;

function traceText(row: TrackingTrace) {
  return row.context || row.status || "—";
}

function traceTime(row: TrackingTrace) {
  return row.time || row.ftime || "—";
}

type Props = {
  order: SalesOrderRow;
  onClose: () => void;
  onOrderUpdate?: (order: SalesOrderRow) => void;
};

export default function TrackingQueryModal({ order, onClose, onOrderUpdate }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackingQueryResult | null>(null);
  const [phone, setPhone] = useState("");
  const [needPhone, setNeedPhone] = useState(false);
  const [com, setCom] = useState(order.trackingCom || "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const runQuery = useCallback(
    async (phoneTail = "") => {
      const num = (order.trackingNo || "").trim();
      if (!num) {
        setError("请先填写快递单号");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await querySalesTracking({
          num,
          com: com.trim() || undefined,
          phone: phoneTail,
          orderId: order.id,
        });
        if (data.needPhone) {
          setNeedPhone(true);
          if (data.com) setCom(data.com);
          setResult(data);
          setError(data.message || "请输入收/寄件人手机号后四位");
          return;
        }
        setNeedPhone(false);
        setResult(data);
        if (data.com) setCom(data.com);
        if (data.order && onOrderUpdate) {
          onOrderUpdate(data.order);
        }
        if (!data.traces?.length && data.message && !data.needPhone) {
          setError(data.message);
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "查询失败");
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [com, onOrderUpdate, order.id, order.trackingNo]
  );

  useEffect(() => {
    void runQuery();
    // 仅打开弹窗时自动查一次；改公司后需点「重新查询」
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  const handleSave = async () => {
    const trackingNo = (order.trackingNo || "").trim();
    if (!trackingNo) {
      setSaveMsg(null);
      setError("请先填写快递单号");
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    setError(null);
    try {
      const updated = await updateSalesOrder(order.id, {
        trackingNo,
        trackingCom: com.trim(),
      });
      onOrderUpdate?.(updated);
      setSaveMsg("已保存快递公司");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <Head>
          <Title>物流查询 · {order.orderNo}</Title>
          <CloseBtn type="button" onClick={onClose} aria-label="关闭">
            ×
          </CloseBtn>
        </Head>
        <Body>
          <Meta>运单号：{order.trackingNo || "—"}</Meta>

          <Field>
            快递公司
            <Select
              value={com}
              onChange={(e) => {
                setCom(e.target.value);
                setSaveMsg(null);
              }}>
              {CARRIER_OPTIONS.map((opt) => (
                <option key={opt.value || "auto"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>

          {needPhone && (
            <PhoneRow>
              <PhoneInput
                value={phone}
                maxLength={4}
                placeholder="手机号后四位"
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
              />
            </PhoneRow>
          )}

          {loading && <Hint>正在查询快递100…</Hint>}
          {!loading && error && <ErrorText>{error}</ErrorText>}

          {!loading && !error && result?.traces && result.traces.length > 0 && (
            <TraceList>
              {result.traces.map((row, idx) => (
                <TraceItem key={`${traceTime(row)}-${idx}`}>
                  <TraceTime>{traceTime(row)}</TraceTime>
                  <TraceText>{traceText(row)}</TraceText>
                </TraceItem>
              ))}
            </TraceList>
          )}

          {!loading && !error && result && (!result.traces || result.traces.length === 0) && (
            <Hint>{result.message || "暂无物流轨迹"}</Hint>
          )}
          {!loading && saveMsg && <SuccessText>{saveMsg}</SuccessText>}
        </Body>
        <Footer>
          <ActionBtn type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving ? "保存中…" : "保存"}
          </ActionBtn>
          <PrimaryBtn
            type="button"
            disabled={loading || (needPhone && phone.length !== 4)}
            onClick={() => void runQuery(needPhone ? phone : "")}>
            重新查询
          </PrimaryBtn>
        </Footer>
      </Panel>
    </Overlay>
  );
}
