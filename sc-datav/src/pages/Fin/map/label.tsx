import { Html } from "@react-three/drei";
import styled from "styled-components";
import { useConfigStore } from "../stores";
import type { ComponentProps } from "react";

const Label = styled(Html)<{ $active?: boolean }>`
  pointer-events: none;
  width: max-content;
  display: flex;
  color: ${(p) => (p.$active ? "#4ade80" : "#ffffff")};
  font-weight: ${(p) => (p.$active ? 600 : 400)};
`;

export default function Index(
  props: ComponentProps<typeof Label> & { $active?: boolean }
) {
  const mapPlayComplete = useConfigStore((s) => s.mapPlayComplete);
  const { $active, ...rest } = props;

  return mapPlayComplete ? <Label $active={$active} {...rest} /> : null;
}
