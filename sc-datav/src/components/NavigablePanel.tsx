import { useNavigate } from "react-router";
import styled from "styled-components";

const Hint = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 5;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: rgba(186, 230, 253, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.35);
  background: rgba(14, 116, 144, 0.25);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
`;

const Shell = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  pointer-events: auto;
  z-index: 2;

  &:hover ${Hint} {
    opacity: 1;
  }
`;

type Props = {
  to: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

/** 点击跳转独立页面；子表格保持自动轮播，悬停时暂停 */
export default function NavigablePanel({
  to,
  hint = "查看全部",
  children,
  className,
  style,
}: Props) {
  const navigate = useNavigate();

  return (
    <Shell
      className={className}
      style={style}
      onClickCapture={(e) => {
        if (
          (e.target as HTMLElement).closest(
            "button, a, input, select, textarea"
          )
        ) {
          return;
        }
        navigate(to);
      }}>
      <Hint>{hint}</Hint>
      {children}
    </Shell>
  );
}
