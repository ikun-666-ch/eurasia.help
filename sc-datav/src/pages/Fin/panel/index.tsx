import { useEffect } from "react";
import styled from "styled-components";
import useMoveTo from "@/hooks/useMoveTo";
import { useRoleApi } from "@/hooks/useRoleApi";
import AutoFit from "@/components/autoFit";
import Button from "@/components/button";
import { useConfigStore } from "../stores";

import ClickablePanel from "@/components/panelEditor/ClickablePanel";
import OrderWorkflowBar from "@/components/OrderWorkflowBar";
import ViewAllOrdersLink from "@/components/ViewAllOrdersLink";
import Headder from "./headder";
import Chart6 from "./chart6";
import Chart2 from "./chart2";
import Chart4 from "./chart4";
import Chart1 from "./chart1";
import Chart5 from "./chart5";
import Chart3 from "./chart3";

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

const CardWrapper = styled.div`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
`;

const CardTitleRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  min-height: 50px;
  margin-inline: 20px;
  border-bottom: 1px solid rgba(186, 206, 255, 0.33);
`;

const CardTitle = styled.div`
  position: relative;
  font-size: 16px;
  color: #e8efff;
  line-height: 50px;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    bottom: 0;
    width: 50px;
    height: 4px;
    background-color: #bdcfff;
  }

  &::after {
    content: "";
    position: absolute;
    right: 0;
    bottom: 0;
    width: 4px;
    height: 4px;
    border-radius: 2px;
    background-color: #bdcfff;
  }
`;

const BackButtonWrap = styled.div`
  flex-shrink: 0;
  margin-bottom: 11px;

  button {
    padding: 3px 8px;
    font-size: 11px;
    white-space: nowrap;
    line-height: 1.2;
  }
`;

const CardContent = styled.div`
  flex: 1;
  min-height: 0;
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
`;

const Card = ({
  title,
  titleRow,
  children,
  ...props
}: React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & { title?: string; titleRow?: React.ReactNode }) => (
  <div {...props} style={{ position: "relative", minHeight: 0, height: "100%", ...props.style }}>
    <svg
      width="100%"
      height="100%"
      fill="none"
      viewBox="0 0 260 180"
      preserveAspectRatio="none">
      <path
        fill="#3061DB"
        fillRule="evenodd"
        d="M206 10 190 0H9L0 9v171h45l4.5-4h161l4.5 4h45V10h-54Zm53 1h-53.287l-16-10H9.414L1 9.414V179h43.62l4.5-4h161.76l4.5 4H259V11Z"
      />

      <path fill="#789eff" d="m51 178-2 2h162l-2-2H51ZM0 0v7l7-7H0Z" />
      <path stroke="#789eff" strokeWidth={2} d="M1 169v10h10M259 21V11h-10" />
    </svg>
    <CardWrapper>
      {titleRow ?? (title ? <CardTitle>{title}</CardTitle> : null)}
      <CardContent>{children}</CardContent>
    </CardWrapper>
  </div>
);

const StatusBanner = styled.div`
  position: absolute;
  top: 88px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  color: #fecaca;
  background: rgba(127, 29, 29, 0.75);
  border: 1px solid rgba(248, 113, 113, 0.5);
  pointer-events: none;
`;

export default function Panel() {
  const { ready, error } = useRoleApi();
  const selectedCity = useConfigStore((s) => s.selectedCity);
  const clearCity = useConfigStore((s) => s.clearCity);
  const topBox = useMoveTo("toBottom", 0.6);
  const leftBox = useMoveTo("toRight", 0.8, 0.5);
  const leftBox1 = useMoveTo("toRight", 0.8, 0.6);
  const leftBox2 = useMoveTo("toRight", 0.8, 0.7);
  const rightBox = useMoveTo("toLeft", 0.8, 0.5);
  const rightBox1 = useMoveTo("toLeft", 0.8, 0.6);
  const rightBox2 = useMoveTo("toLeft", 0.8, 0.7);

  const forecastTitle = selectedCity
    ? `${selectedCity}销售预测`
    : "销售收入预测";

  const top5Title = selectedCity
    ? `${selectedCity}区县销售TOP5`
    : "销售额TOP5地市";

  useEffect(() => {
    const unMapPlaySub = useConfigStore.subscribe(
      (s) => s.mapPlayComplete,
      (v) => {
        if (v) {
          topBox.restart();
          leftBox.restart();
          leftBox1.restart();
          leftBox2.restart();
          rightBox.restart();
          rightBox1.restart();
          rightBox2.restart();
        }
      }
    );

    return () => {
      unMapPlaySub();
    };
  }, []);

  return (
    <AutoFit>
      <OrderWorkflowBar />
      <Headder ref={topBox.ref} />
      {error && (
        <StatusBanner>
          {error} — 请确认已登录，且后端服务正常运行
        </StatusBanner>
      )}
      {!ready && !error && (
        <StatusBanner style={{ color: "#bae6fd", background: "rgba(14,116,144,0.6)", borderColor: "rgba(56,189,248,0.4)" }}>
          正在连接服务器…
        </StatusBanner>
      )}
      <GridWrapper>
        <div></div>
        <Card
          ref={leftBox.ref}
          style={{ gridArea: "1 / 1 / 3 / 2" }}
          titleRow={
            <CardTitleRow>
              <CardTitle>资产汇总</CardTitle>
              {selectedCity && (
                <BackButtonWrap>
                  <Button onClick={clearCity}>返回全省</Button>
                </BackButtonWrap>
              )}
            </CardTitleRow>
          }>
          <ClickablePanel title="资产汇总" editorType="api-finance-chart1">
            <Chart1 />
          </ClickablePanel>
        </Card>
        <Card
          ref={leftBox1.ref}
          style={{ gridArea: "3 / 1 / 5 / 2" }}
          title={forecastTitle}>
          <ClickablePanel
            title={forecastTitle}
            editorType={
              selectedCity ? "api-finance-trend-city" : "api-finance-trend-province"
            }
            editorContext={selectedCity ? { city: selectedCity } : undefined}>
            <Chart2 />
          </ClickablePanel>
        </Card>
        <Card
          ref={leftBox2.ref}
          style={{ gridArea: "5 / 1 / 7 / 2" }}
          titleRow={
            <CardTitleRow>
              <CardTitle>
                {selectedCity ? `${selectedCity}全部订单` : "全部订单"}
              </CardTitle>
              <ViewAllOrdersLink />
            </CardTitleRow>
          }>
          <Chart3 />
        </Card>
        <Card
          ref={rightBox.ref}
          style={{ gridArea: "1 / 4 / 3 / 5" }}
          title={selectedCity ? `${selectedCity}资产分布` : "苗圃资产分布"}>
          <ClickablePanel
            title="苗圃资产分布"
            editorType={
              selectedCity ? "api-finance-asset-stats" : "api-finance-asset-hint"
            }
            editorContext={selectedCity ? { city: selectedCity } : undefined}>
            <Chart4 />
          </ClickablePanel>
        </Card>
        <Card
          ref={rightBox1.ref}
          style={{ gridArea: "3 / 4 / 5 / 5" }}
          title={top5Title}>
          <ClickablePanel title={top5Title} editorType="api-finance-sales-hint">
            <Chart5 />
          </ClickablePanel>
        </Card>
        <Card
          ref={rightBox2.ref}
          style={{ gridArea: "5 / 4 / 7 / 5" }}
          title="报表异常监控">
          <ClickablePanel title="报表异常监控" editorType="api-finance-monthly">
            <Chart6 />
          </ClickablePanel>
        </Card>
      </GridWrapper>
    </AutoFit>
  );
}
