import { Link } from "react-router";
import styled from "styled-components";
import AllOrdersEditableTable from "@/components/AllOrdersEditableTable";
import { useAllOrdersCount } from "@/components/AllOrdersTable";
import { useRoleApi } from "@/hooks/useRoleApi";

const PageRoot = styled.div`
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 0%, #132040 0%, #070b14 55%, #050810 100%);
  color: #e8f0ff;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
`;

const Header = styled.header`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px 12px;
  border-bottom: 1px solid rgba(186, 206, 255, 0.15);
`;

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #e8f0ff;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 13px;
  color: rgba(186, 206, 255, 0.65);
`;

const BackLink = styled(Link)`
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid rgba(48, 97, 219, 0.45);
  background: rgba(48, 97, 219, 0.12);
  color: #bdcfff;
  text-decoration: none;
  font-size: 13px;

  &:hover {
    background: rgba(48, 97, 219, 0.22);
  }
`;

const TableWrap = styled.div`
  flex: 1;
  min-height: 0;
  padding: 16px 28px 24px;
  display: flex;
  flex-direction: column;
`;

const TablePanel = styled.div`
  flex: 1;
  min-height: 0;
  border: 1px solid rgba(48, 97, 219, 0.25);
  border-radius: 8px;
  background: rgba(8, 14, 28, 0.72);
  padding: 12px 14px;
  backdrop-filter: blur(8px);
  overflow: hidden;
`;

export default function AllOrdersPage() {
  useRoleApi();
  const count = useAllOrdersCount();

  return (
    <PageRoot>
      <Header>
        <TitleBlock>
          <Title>全部订单</Title>
          <Subtitle>
            共 {count} 条 · 填写快递单号后点「查物流」对接快递100
          </Subtitle>
        </TitleBlock>
        <BackLink to="/home">返回首页</BackLink>
      </Header>
      <TableWrap>
        <TablePanel>
          <AllOrdersEditableTable />
        </TablePanel>
      </TableWrap>
    </PageRoot>
  );
}
