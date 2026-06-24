import styled from "styled-components";

export const PageRoot = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 0%, #132040 0%, #070b14 55%, #050810 100%);
  color: #e8f0ff;
  pointer-events: auto;
`;

export const Header = styled.header`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px 12px;
  border-bottom: 1px solid rgba(186, 206, 255, 0.15);
`;

export const Title = styled.h1`
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 600;
`;

export const Subtitle = styled.p`
  margin: 0;
  font-size: 13px;
  color: rgba(186, 206, 255, 0.65);
`;

export const BackLink = styled.a`
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

export const Content = styled.div`
  flex: 1;
  min-height: 0;
  padding: 16px 28px 24px;
  overflow: auto;
`;

/** 管理员待办中心：Tab 下方可滚动区域 */
export const BodyArea = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const EmbeddedRoot = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const TabBar = styled.div`
  flex-shrink: 0;
  padding: 12px 28px 0;
`;

export const Toast = styled.div<{ $error?: boolean }>`
  margin: 0 28px 12px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  background: ${({ $error }) =>
    $error ? "rgba(127, 29, 29, 0.45)" : "rgba(20, 83, 45, 0.45)"};
  color: ${({ $error }) => ($error ? "#fecaca" : "#bbf7d0")};
`;

export const Empty = styled.p`
  text-align: center;
  padding: 48px;
  color: rgba(186, 206, 255, 0.55);
`;

export const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const OrderCard = styled.div`
  border: 1px solid rgba(48, 97, 219, 0.25);
  border-radius: 8px;
  background: rgba(8, 14, 28, 0.72);
  padding: 16px 18px;
`;

export const CardHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(48, 97, 219, 0.15);
`;

export const CardActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  align-items: center;
`;

export const OrderNo = styled.div`
  font-size: 15px;
  font-weight: 600;
`;

export const Meta = styled.div`
  font-size: 12px;
  color: rgba(186, 206, 255, 0.65);
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px 16px;
  margin-bottom: 14px;
`;

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: rgba(186, 206, 255, 0.75);

  input,
  select {
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid rgba(48, 97, 219, 0.35);
    background: rgba(4, 8, 18, 0.8);
    color: #e8f0ff;
    font-size: 13px;
  }

  span.readonly {
    padding: 8px 10px;
    border-radius: 6px;
    background: rgba(4, 8, 18, 0.45);
    border: 1px solid rgba(48, 97, 219, 0.15);
    font-size: 13px;
  }
`;

export const ActionBtn = styled.button<{ $accent?: "orange" | "cyan" | "green" }>`
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid
    ${({ $accent }) =>
      $accent === "orange"
        ? "rgba(234, 88, 12, 0.55)"
        : $accent === "green"
          ? "rgba(34, 197, 94, 0.55)"
          : "rgba(56, 189, 248, 0.45)"};
  background: ${({ $accent }) =>
    $accent === "orange"
      ? "rgba(234, 88, 12, 0.25)"
      : $accent === "green"
        ? "rgba(20, 83, 45, 0.35)"
        : "rgba(14, 116, 144, 0.35)"};
  color: #e8f0ff;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const CancelBtn = styled(ActionBtn)`
  border-color: rgba(248, 113, 113, 0.45);
  background: rgba(127, 29, 29, 0.3);
`;

export const RejectBtn = styled(ActionBtn)`
  border-color: rgba(234, 179, 8, 0.55);
  background: rgba(113, 63, 18, 0.35);
`;

export const TopActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

export const TabRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

export const TabBtn = styled.button<{ $active?: boolean }>`
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(234, 88, 12, 0.65)" : "rgba(48, 97, 219, 0.35)"};
  background: ${({ $active }) =>
    $active ? "rgba(234, 88, 12, 0.22)" : "transparent"};
  color: ${({ $active }) => ($active ? "#ffedd5" : "#bdcfff")};
  font-size: 13px;
  cursor: pointer;
`;

export const MediaRow = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`;

export const MediaLabel = styled.span`
  font-size: 12px;
  color: rgba(186, 206, 255, 0.75);
  margin-right: 4px;
`;

export const MediaItem = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(48, 97, 219, 0.3);
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  background: rgba(4, 8, 18, 0.6);

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const MediaOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  img, video {
    max-width: 90vw;
    max-height: 90vh;
    border-radius: 8px;
  }
`;

export const MediaMore = styled.span`
  font-size: 11px;
  color: rgba(186, 206, 255, 0.5);
  margin-left: 4px;
`;
