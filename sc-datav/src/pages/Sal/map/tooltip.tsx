import { Html } from "@react-three/drei";
import { useImperativeHandle, useState, type Ref } from "react";
import styled from "styled-components";

const TooltipBox = styled.div`
  background: rgba(255, 245, 232, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 12px 16px;
  color: #656565;
  font-size: 12px;
  pointer-events: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  min-width: 140px;
`;

const CityName = styled.div`
  font-weight: bold;
  margin-bottom: 8px;
  color: #ea580c;
`;

const DataItem = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  gap: 12px;

  &:last-child {
    margin-bottom: 0;
  }
`;

export interface CityOrderStats {
  city: string;
  orderCount: number;
  totalAmount: number;
}

interface TooltipProps {
  ref?: Ref<{ open: () => void; close: () => void }>;
  data: CityOrderStats;
  position: [number, number, number];
}

function formatAmount(v: number) {
  if (v >= 10000) return `${(v / 10000).toFixed(1)} 万元`;
  return `${v.toLocaleString()} 元`;
}

export default function Tooltip(props: TooltipProps) {
  const { ref, data, position } = props;
  const [visible, setVisible] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => setVisible(true),
    close: () => setVisible(false),
  }));

  return (
    visible && (
      <Html
        center
        position={position}
        distanceFactor={100}
        zIndexRange={[1001 - 1500]}
        style={{ pointerEvents: "none" }}>
        <TooltipBox>
          <CityName>{data.city}</CityName>
          <DataItem>
            <span>订单数:</span>
            <span>{data.orderCount} 笔</span>
          </DataItem>
          <DataItem>
            <span>订单金额:</span>
            <span>{formatAmount(data.totalAmount)}</span>
          </DataItem>
        </TooltipBox>
      </Html>
    )
  );
}
