import React, { useMemo, useRef, useState, type FC } from "react";
import styled from "styled-components";
import useAnimationFrame from "@/hooks/useAnimationFrame";
import useSize from "@/hooks/useSize";

const Wrapper = styled.div<{ $manual?: boolean }>`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  transform: translate3d(0px, 0px, 0px);

  ${({ $manual }) =>
    !$manual &&
    `
    mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
  `}
`;

const Table = styled.div<{ $scrollable?: boolean }>`
  flex: 1 1 0;
  position: relative;
  height: 100%;
  overflow: ${({ $scrollable }) => ($scrollable ? "auto" : "hidden")};
  pointer-events: auto;

  ${({ $scrollable }) =>
    $scrollable &&
    `
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.35) transparent;

    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.35);
      border-radius: 3px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
  `}
`;

const TableContent = styled.div`
  color: #ffffff;
`;

const HeaderWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  height: 40px;
  color: #ffffff;
  overflow-wrap: break-word;
`;

const HeaderItem = styled.div<{
  $align?: "left" | "right" | "center";
  $flex?: number;
}>`
  ${(props) => ({
    textAlign: props.$align ?? "left",
    flex: props.$flex ?? 1,
  })}
`;

const BodyRowWrapper = styled.div<{ $height: number }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  padding-inline: 0.5rem;
  margin: 2px;
  border-width: 1px 0;
  border-style: solid;

  &:nth-child(odd) {
    border-color: rgba(255, 255, 255, 0.1);
  }

  &:nth-child(even) {
    border-color: transparent;
  }

  ${(props) => ({
    height: `${props.$height}px`,
  })}
`;

const BodyRowItem = styled.div<{
  $align?: "left" | "right" | "center";
  $flex?: number;
}>`
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  container-type: inline-size;

  ${(props) => ({
    textAlign: props.$align ?? "left",
    flex: props.$flex ?? 1,
  })}
`;

const ScrollItem = styled.span`
  display: flex;
  width: max-content;
  animation: marquee 3s linear infinite both alternate;

  @keyframes marquee {
    form {
      transform: translateX(0px);
    }
    to {
      transform: translateX(min(100cqw - 100%, 0px));
    }
  }
`;

const Empty = styled.div.attrs({ children: "暂无数据" })`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
`;

export interface HeaderProps {
  rowHeight?: number;
  column?: {
    title?: string;
    dataIndex?: string;
    align?: "center" | "left" | "right";
    flex?: number;
    noScroll?: boolean;
    render?: (index: number) => React.ReactNode;
  }[];
  style?: React.CSSProperties;
}

export interface BodyRowProps<T> extends HeaderProps {
  data?: T;
  rowIndex: number;
  rowHeight: number;
}

export interface SeamVirtualScroll<T> extends HeaderProps {
  data?: T[];
  speed?: number;
  expendCount?: number;
  /** 默认 true：自动无缝滚动；false：滚轮手动滑动 */
  autoScroll?: boolean;
  styles?: {
    header?: React.CSSProperties;
    body?: React.CSSProperties;
  };
}

const Header: FC<HeaderProps> = (props) => {
  const { column = [], style } = props;

  return (
    <HeaderWrapper style={style}>
      {column.map((el, idx) => (
        <HeaderItem $align={el.align} $flex={el.flex} key={idx}>
          {el?.title}
        </HeaderItem>
      ))}
    </HeaderWrapper>
  );
};

const BodyRow: FC<BodyRowProps<Record<string, React.ReactNode>>> = (props) => {
  const { column = [], rowHeight, rowIndex, data } = props;

  return (
    <BodyRowWrapper $height={rowHeight}>
      {column.map((el, idx) => (
        <BodyRowItem $align={el.align} $flex={el.flex} key={idx}>
          {el.noScroll ? (
            el.render?.(rowIndex) ?? data?.[el.dataIndex ?? 0]
          ) : (
            <ScrollItem>
              {el.render?.(rowIndex) ?? data?.[el.dataIndex ?? 0]}
            </ScrollItem>
          )}
        </BodyRowItem>
      ))}
    </BodyRowWrapper>
  );
};

const Index: FC<SeamVirtualScroll<Record<string, React.ReactNode>>> = (
  props
) => {
  const {
    speed = 3000,
    rowHeight = 48,
    column = [],
    data = [],
    autoScroll = true,
    styles,
  } = props;
  const lastTime = useRef<number>(0);
  const warper = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const { height: warperHeight = 0 } = useSize(warper) ?? {};
  const [isScroll, setIsScroll] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const rowH = rowHeight + 2;
  const pageSize = Math.max(1, Math.ceil(warperHeight / rowH) || 1);

  const [isScrollHeight, len, _data] = useMemo(() => {
    const _isScroll =
      autoScroll && data.length * rowH > warperHeight && warperHeight > 0;
    const _len = pageSize;

    let list = data;
    if (_isScroll) {
      list = list.concat(data.slice(0, _len));
    }
    return [_isScroll, _len, list];
  }, [autoScroll, data, rowH, warperHeight, pageSize]);

  const renderList = useMemo(() => {
    if (!autoScroll) {
      return data;
    }
    contentRef.current?.style.setProperty("transform", "translate3d(0, 0, 0)");
    contentRef.current?.style.setProperty("transition", "none");
    return _data.slice(activeIndex, activeIndex + len);
  }, [activeIndex, _data, autoScroll, data, len]);

  useAnimationFrame((timestamp: number) => {
    if (timestamp - lastTime.current >= speed) {
      contentRef.current?.style.setProperty(
        "transform",
        `translate3d(0, ${-rowH}px, 0)`
      );
      contentRef.current?.style.setProperty(
        "transition",
        `transform 300ms ease-in 0s`
      );
      lastTime.current = timestamp;
    }
  }, autoScroll && isScroll && isScrollHeight);

  const onTransitionEnd = () => {
    setActiveIndex((n) => (n + 1) % data.length);
  };

  const hoverHandler = (flag: boolean) => setIsScroll(flag);

  const wrapperProps = autoScroll
    ? {
        onMouseEnter: () => hoverHandler(false),
        onMouseLeave: () => hoverHandler(true),
      }
    : {};

  return (
    <Wrapper {...wrapperProps} $manual={!autoScroll}>
      <Header column={column} style={styles?.header} />

      <Table
        ref={warper}
        $scrollable={!autoScroll}
        onWheel={!autoScroll ? (e) => e.stopPropagation() : undefined}>
        <TableContent
          ref={contentRef}
          style={styles?.body}
          onTransitionEnd={autoScroll ? onTransitionEnd : undefined}>
          {renderList?.map((item, idx) => {
            const rowIndex = autoScroll ? (idx + activeIndex) % len : idx;
            return (
              <BodyRow
                key={rowIndex}
                column={column}
                data={item}
                rowHeight={rowHeight}
                rowIndex={rowIndex}
              />
            );
          })}
        </TableContent>
        {!(renderList.length > 0) && <Empty />}
      </Table>
    </Wrapper>
  );
};
export default Index;
