import { useEffect, useRef } from "react";
import styled from "styled-components";
import { useMapStyleStore } from "../stores";
import { INV_TREND_PANEL_KEY } from "../constants";
import useMoveTo from "@/hooks/useMoveTo";
import { useRoleApi } from "@/hooks/useRoleApi";
import AutoFit from "@/components/autoFit";
import Button from "@/components/button";
import OrderWorkflowBar from "@/components/OrderWorkflowBar";
import ClickablePanel from "@/components/panelEditor/ClickablePanel";
import Chart1 from "./chart1";
import Chart2 from "./chart2";
import Chart3 from "./chart3";
import Chart4 from "./chart4";

import bg from "@/assets/card_bg.jpg";

const Radial = styled.div`
  position: absolute;
  inset: 0;
  z-index: -1;
  background: radial-gradient(transparent 60%, black);
  transition: opacity 0.8s;
`;

const GridWrapper = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(4, minmax(0, 1fr));
  gap: 20px;
  padding: 20px;
`;

const Card = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  color: #ffffff;
  pointer-events: auto;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(141, 141, 141, 0.2);
  border-radius: 4px;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: url(${bg});
    background-size: 100px;
    opacity: 0.2;
    border-radius: 0px;
    z-index: -1;
    z-index: -1;
  }
`;

const Title = styled.div`
  font-family: "pmzd";
  width: 100%;
  height: 100px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  font-size: 36px;
  letter-spacing: 0px;
  color: #ffffff;
  padding-left: 20px;

  small {
    font-family: system-ui, sans-serif;
    font-size: 12px;
    letter-spacing: 0.12em;
    color: rgba(186, 230, 253, 0.75);
    margin-top: 6px;
  }
`;

const TitleWrapper = styled(Card)`
  flex-direction: row;
  align-items: center;
`;

const CardTitle = styled.div`
  font-family: "pmzd";
  font-size: 28px;
  padding: 8px 16px;
`;

const CardTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-right: 12px;
`;

const BackButtonWrap = styled.div`
  flex-shrink: 0;

  button {
    padding: 6px 14px;
    font-size: 13px;
    white-space: nowrap;
  }
`;

const CardHint = styled.div`
  font-family: system-ui, sans-serif;
  font-size: 11px;
  color: rgba(186, 230, 253, 0.65);
  padding: 0 16px 8px;
`;

const BottomBox = styled.div`
  position: absolute;
  pointer-events: auto;
  bottom: 20px;
  left: 50%;
  display: flex;
  gap: 20px;
`;

export default function Panel() {
  useRoleApi();
  const radialRef = useRef<HTMLDivElement>(null!);
  const topBox = useMoveTo("toBottom", 0.6, 1);
  const leftBox = useMoveTo("toRight", 0.8, 1.5);
  const leftBox1 = useMoveTo("toRight", 0.8, 1.5);
  const rightBox = useMoveTo("toLeft", 0.8, 1.5);
  const rightBox1 = useMoveTo("toLeft", 0.8, 1.5);
  const bottomBox = useMoveTo("toTop", 0.8, 1.5, "translateX(-50%)");

  const selectedCity = useMapStyleStore((s) => s.selectedCity);
  const clearCity = useMapStyleStore((s) => s.clearCity);
  const togglePureMode = useMapStyleStore((s) => s.togglePureMode);
  const toggleMapStyle = useMapStyleStore((s) => s.toggleMapStyle);

  const trendTitle = selectedCity
    ? `${selectedCity}库存总量趋势`
    : "全省库存总量趋势";

  useEffect(() => () => clearCity(), [clearCity]);

  useEffect(() => {
    const show = () => {
      topBox.restart(false);
      leftBox.restart(false);
      leftBox1.restart(false);
      rightBox.restart(false);
      rightBox1.restart(false);
      bottomBox.restart(false);
    };

    show();

    const unSub = useMapStyleStore.subscribe(
      (s) => s.pureMode,
      (v) => {
        if (!v) {
          show();
          radialRef.current?.style.setProperty("opacity", "1");
        } else {
          topBox.reverse();
          leftBox.reverse();
          leftBox1.reverse();
          rightBox.reverse();
          rightBox1.reverse();
          radialRef.current?.style.setProperty("opacity", "0");
        }
      },
      { fireImmediately: true }
    );

    return () => {
      unSub();
    };
  }, []);

  return (
    <AutoFit>
      <OrderWorkflowBar showLedger />
      <Radial ref={radialRef} />
      <TitleWrapper ref={topBox.ref}>
        <Title>
          陕西省苗木库存监测中心
          <small>
            {selectedCity
              ? `当前视图：${selectedCity} · 点击地图切换地市`
              : "核心关注：库存准确性 · 操作效率 · 点击地图进入地市"}
          </small>
        </Title>
      </TitleWrapper>
      <GridWrapper>
        <Card ref={leftBox.ref} style={{ gridArea: "1 / 1 / 3 / 2" }}>
          <CardTitleRow>
            <CardTitle>{trendTitle}</CardTitle>
            {selectedCity && (
              <BackButtonWrap>
                <Button onClick={clearCity}>返回全省</Button>
              </BackButtonWrap>
            )}
          </CardTitleRow>
          <ClickablePanel
            title={trendTitle}
            panelKey={INV_TREND_PANEL_KEY}
            editorType={
              selectedCity ? "chart-inv-city" : "chart-inv-province"
            }
            editorContext={selectedCity ? { city: selectedCity } : undefined}>
            <Chart1 />
          </ClickablePanel>
        </Card>
        <Card ref={leftBox1.ref} style={{ gridArea: "3 / 1 / 5 / 2" }}>
          <CardTitle>入库出库对比</CardTitle>
          <ClickablePanel
            title="入库出库对比"
            panelKey="inv.chart2"
            editorType="chart-io">
            <Chart2 />
          </ClickablePanel>
        </Card>
        <Card ref={rightBox.ref} style={{ gridArea: "1 / 4 / 3 / 5" }}>
          <CardTitle style={{ textAlign: "right" }}>各地市库存分布</CardTitle>
          <CardHint style={{ textAlign: "right" }}>
            最新一日各市值，相加等于全省
          </CardHint>
          <Chart3 />
        </Card>
        <Card ref={rightBox1.ref} style={{ gridArea: "3 / 4 / 5 / 5" }}>
          <CardTitle style={{ textAlign: "right" }}>
            {selectedCity ? `${selectedCity}库存明细` : "库存明细台账"}
          </CardTitle>
          <ClickablePanel title="库存明细台账" editorType="api-inventory">
            <Chart4 />
          </ClickablePanel>
        </Card>

        <BottomBox ref={bottomBox.ref}>
          <Button onClick={toggleMapStyle}>切换样式</Button>
          <Button onClick={togglePureMode}>纯净模式</Button>
        </BottomBox>
      </GridWrapper>
    </AutoFit>
  );
}
