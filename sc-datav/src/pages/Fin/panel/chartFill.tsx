import styled from "styled-components";

/** 卡片内容区子图表需撑满剩余高度，否则 ECharts 高度为 0 */
const ChartFill = styled.div`
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
`;

export default ChartFill;
