import styled from "styled-components";

const Box = styled.div`
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 12px;
  color: rgba(186, 230, 253, 0.65);
  font-size: 13px;
  line-height: 1.5;
`;

export default function ChartPlaceholder({ message }: { message: string }) {
  return <Box>{message}</Box>;
}
