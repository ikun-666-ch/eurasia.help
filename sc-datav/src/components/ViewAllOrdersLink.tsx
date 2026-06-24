import { useNavigate } from "react-router";
import styled from "styled-components";

const LinkBtn = styled.button`
  pointer-events: auto;
  position: relative;
  z-index: 12;
  margin: 0;
  padding: 2px 10px;
  border-radius: 4px;
  border: 1px solid rgba(56, 189, 248, 0.45);
  background: rgba(14, 116, 144, 0.35);
  color: rgba(186, 230, 253, 0.95);
  font-size: 11px;
  letter-spacing: 0.06em;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: rgba(14, 116, 144, 0.55);
  }
`;

type Props = {
  className?: string;
};

/** 全部订单预览面板标题栏入口（避免被地图 Canvas 挡住点击） */
export default function ViewAllOrdersLink({ className }: Props) {
  const navigate = useNavigate();

  return (
    <LinkBtn
      type="button"
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        navigate("/orders");
      }}>
      查看全部 →
    </LinkBtn>
  );
}
