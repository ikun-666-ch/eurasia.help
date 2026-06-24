import type { ComponentProps } from "react";
import styled from "styled-components";

const TitleWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 85px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 5;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 36px;
  font-weight: 600;
  letter-spacing: 0.18em;
  color: #ffffff;
  text-shadow: 0 0 18px rgba(48, 97, 219, 0.75);
`;

const Subtitle = styled.p`
  position: absolute;
  bottom: 6px;
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.2em;
  color: rgba(186, 230, 253, 0.75);
`;

const HeaderBg = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(48, 97, 219, 0) 0%,
    rgba(48, 97, 219, 0.35) 50%,
    rgba(48, 97, 219, 0) 100%
  );
  pointer-events: none;
`;

export default function Headder(props: ComponentProps<typeof TitleWrapper>) {
  return (
    <TitleWrapper {...props}>
      <HeaderBg />
      <Title>陕西省苗圃财务分析中心</Title>
      <Subtitle>核心关注：数据准确性 · 报表完整性</Subtitle>
    </TitleWrapper>
  );
}
