import { useEffect } from "react";
import styled from "styled-components";
import { useConfigStore } from "./stores";
import Map from "./map";
import Panel from "./panel";

const Wrapper = styled.div`
  position: relative;
  width: 100vw;
  height: 100vh;
`;

const PanelLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 100;
  pointer-events: none;
`;

export default function Index() {
  useEffect(() => {
    useConfigStore.getState().reset();
    return () => useConfigStore.getState().reset();
  }, []);
  return (
    <Wrapper>
      <Map />
      <PanelLayer>
        <Panel />
      </PanelLayer>
    </Wrapper>
  );
}
