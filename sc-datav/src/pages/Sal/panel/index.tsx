import { useEffect } from "react";
import styled from "styled-components";
import useMoveTo from "@/hooks/useMoveTo";
import { useRoleApi } from "@/hooks/useRoleApi";
import AutoFit from "@/components/autoFit";
import Button from "@/components/button";
import { useConfigStore } from "../stores";

import ClickablePanel from "@/components/panelEditor/ClickablePanel";
import NavigablePanel from "@/components/NavigablePanel";
import OrderWorkflowBar from "@/components/OrderWorkflowBar";
import ViewAllOrdersLink from "@/components/ViewAllOrdersLink";
import Headder from "./headder";
import Footer from "./footer";
import Chart1 from "./chart1";
import Chart2 from "./chart2";
import Chart3 from "./chart3";
import Chart4 from "./chart4";
import Chart5 from "./chart5";
import Chart6 from "./chart6";

const GridWrapper = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(6, minmax(0, 1fr));
  gap: 20px;
  padding: 20px;
  pointer-events: none;
`;

const Card = styled.div`
  position: relative;
  background: rgba(255, 245, 232, 0.65);
  border: 1px solid rgba(255, 145, 0, 0.3);
  position: relative;
  padding: 15px;
  backdrop-filter: blur(4px);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  z-index: 9999;

  &::before {
    content: "";
    position: absolute;
    top: -1px;
    left: -1px;
    width: 10px;
    height: 10px;
    border-top: 2px solid #ea580c;
    border-left: 2px solid #ea580c;
    transition: all 0.3s ease;
    pointer-events: none;
  }

  &::after {
    content: "";
    position: absolute;
    bottom: -1px;
    right: -1px;
    width: 10px;
    height: 10px;
    border-bottom: 2px solid #ea580c;
    border-right: 2px solid #ea580c;
    transition: all 0.3s ease;
    pointer-events: none;
  }

  &:hover::before,
  &:hover::after {
    width: 100%;
    height: 100%;
    opacity: 0.5;
  }
`;

const CardTitle = styled.div`
  font-size: 18px;
  margin-bottom: 10px;
  padding-left: 10px;
  border-left: 4px solid #fdb961;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #5a4a42;
  flex-shrink: 0;

  span {
    font-size: 10px;
    color: rgba(0, 0, 0, 0.4);
    font-weight: normal;
  }
`;

const BackButtonWrap = styled.div`
  flex-shrink: 0;

  button {
    padding: 3px 8px;
    font-size: 11px;
    white-space: nowrap;
    line-height: 1.2;
  }
`;

export default function Content() {
  useRoleApi();
  const selectedCity = useConfigStore((s) => s.selectedCity);
  const clearCity = useConfigStore((s) => s.clearCity);
  const topBox = useMoveTo("toBottom", 0.6);
  const leftBox = useMoveTo("toRight", 0.8, 0.5);
  const leftBox1 = useMoveTo("toRight", 0.8, 0.6);
  const leftBox2 = useMoveTo("toRight", 0.8, 0.7);
  const rightBox = useMoveTo("toLeft", 0.8, 0.5);
  const rightBox1 = useMoveTo("toLeft", 0.8, 0.6);
  const rightBox2 = useMoveTo("toLeft", 0.8, 0.7);
  const bottomBox = useMoveTo("toTop", 0.8, 0.5);

  useEffect(() => {
    const unMapPlaySub = useConfigStore.subscribe(
      (s) => s.mapPlayComplete,
      (v) => {
        if (v) {
          topBox.restart();
          bottomBox.restart();
          leftBox.restart();
          leftBox1.restart();
          leftBox2.restart();
          rightBox.restart();
          rightBox1.restart();
          rightBox2.restart();
        }
      }
    );

    const unModeSub = useConfigStore.subscribe(
      (s) => s.mode,
      (v) => {
        if (v) {
          topBox.restart();
          leftBox.restart();
          leftBox1.restart();
          leftBox2.restart();
          rightBox.restart();
          rightBox1.restart();
          rightBox2.restart();
        } else {
          topBox.reverse();
          leftBox.reverse();
          leftBox1.reverse();
          leftBox2.reverse();
          rightBox.reverse();
          rightBox1.reverse();
          rightBox2.reverse();
        }
      }
    );

    return () => {
      unMapPlaySub();
      unModeSub();
    };
  }, []);

  const orderListTitle = selectedCity
    ? `${selectedCity}区县订单`
    : "全省地市订单";

  const trendTitle = selectedCity
    ? `${selectedCity}近30日订单趋势`
    : "近30日订单趋势";

  const revenueTitle = selectedCity
    ? `${selectedCity}订单总额`
    : "订单总额统计";

  const inventoryTitle = selectedCity
    ? `${selectedCity}库存明细`
    : "库存明细台账";

  return (
    <AutoFit>
      <OrderWorkflowBar showNewOrder />
      <Headder ref={topBox.ref} />
      <GridWrapper>
        <Card ref={leftBox.ref} style={{ gridArea: "1 / 1 / 3 / 2" }}>
          <CardTitle>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {orderListTitle}
              <span style={{ fontSize: 10 }}>ORDER RANK</span>
            </span>
            {selectedCity && (
              <BackButtonWrap>
                <Button onClick={clearCity}>返回全省</Button>
              </BackButtonWrap>
            )}
          </CardTitle>
          <ClickablePanel
            title={orderListTitle}
            panelKey="sal.chart1"
            editorType="chart-rank">
            <Chart1 />
          </ClickablePanel>
        </Card>
        <Card ref={leftBox1.ref} style={{ gridArea: "3 / 1 / 5 / 2" }}>
          <CardTitle>
            {trendTitle}
            <span>ORDER TREND</span>
          </CardTitle>
          <ClickablePanel title={trendTitle} panelKey="sal.chart2" editorType="chart-io">
            <Chart2 />
          </ClickablePanel>
        </Card>
        <Card ref={leftBox2.ref} style={{ gridArea: "5 / 1 / 7 / 2" }}>
          <CardTitle>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              全部订单<span style={{ fontSize: 10 }}>ALL ORDERS</span>
            </span>
            <ViewAllOrdersLink />
          </CardTitle>
          <NavigablePanel to="/orders" hint="查看全部">
            <Chart3 />
          </NavigablePanel>
        </Card>
        <Card ref={rightBox.ref} style={{ gridArea: "1 / 4 / 3 / 5" }}>
          <CardTitle>
            {revenueTitle}
            <span>ORDER REVENUE</span>
          </CardTitle>
          <ClickablePanel title={revenueTitle} panelKey="sal.chart4" editorType="chart-revenue">
            <Chart4 />
          </ClickablePanel>
        </Card>
        <Card ref={rightBox1.ref} style={{ gridArea: "3 / 4 / 5 / 5" }}>
          <CardTitle>
            {inventoryTitle}
            <span>INVENTORY</span>
          </CardTitle>
          <ClickablePanel title="库存明细台账" editorType="api-inventory">
            <Chart5 />
          </ClickablePanel>
        </Card>
        <Card ref={rightBox2.ref} style={{ gridArea: "5 / 4 / 7 / 5" }}>
          <CardTitle>
            订单金额区间<span>ORDER RANGE</span>
          </CardTitle>
          <ClickablePanel title="订单金额区间" panelKey="sal.chart6" editorType="chart-bar">
            <Chart6 />
          </ClickablePanel>
        </Card>
      </GridWrapper>
      <Footer ref={bottomBox.ref} />
    </AutoFit>
  );
}
