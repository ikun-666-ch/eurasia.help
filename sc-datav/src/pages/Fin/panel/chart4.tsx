import styled from "styled-components";
import NumberAnimation from "@/components/numberAnimation";
import { fetchFinanceAssetStats } from "@/api";
import { useConfigStore } from "../stores";
import ChartPlaceholder from "./chartPlaceholder";
import { useFinChartLoad } from "./useFinChartLoad";

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 16px;
`;

const Statistics1 = styled.div`
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.8);
`;

const Statistics1Number = styled(NumberAnimation)`
  font-size: 24px;
  font-weight: 600;
  color: #3061db;
  text-shadow: 0 0 10px currentColor;
`;

const Statistics2Number = styled(NumberAnimation)`
  font-size: 20px;
  font-weight: 600;
  color: #bdcfff;
`;

const CompanyIcon = styled.div`
  margin-right: 8px;
  border-radius: 999px;
  border: 1px solid #3061db;
  padding: 0.5em;
  font-size: 1.4em;
  box-shadow: 0 0 10px #3061db;
  line-height: 1;
`;

const Item = styled.div`
  display: flex;
  gap: 4px;
  align-items: baseline;
`;

const icons = ["🌱", "🏠", "💧", "📦"];

export default function Chart4({ refreshToken }: { refreshToken?: number }) {
  const selectedCity = useConfigStore((s) => s.selectedCity);
  const { data: stats, statusMessage } = useFinChartLoad(
    () => fetchFinanceAssetStats(selectedCity),
    [selectedCity, refreshToken]
  );

  const items = stats?.items ?? [];

  if (statusMessage || !items.length) {
    return (
      <ChartPlaceholder
        message={statusMessage ?? "暂无资产分布数据，请运行 php scripts/reseed-finance.php"}
      />
    );
  }

  return (
    <Wrapper>
      {items.map((el, i) => (
        <Statistics1 key={i}>
          <CompanyIcon>{icons[i % icons.length]}</CompanyIcon>
          <div>
            <Item>
              <span>{el.label}</span>
              <Statistics1Number
                value={el.value}
                options={{ maximumFractionDigits: 0 }}
              />
              <span>{el.unit}</span>
            </Item>
            <Item>
              <span>{el.label2}</span>
              <Statistics2Number
                value={el.value2}
                options={{ maximumFractionDigits: 0 }}
              />
              <span>{el.unit}</span>
            </Item>
          </div>
        </Statistics1>
      ))}
    </Wrapper>
  );
}
