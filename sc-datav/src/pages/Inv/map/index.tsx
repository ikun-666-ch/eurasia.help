import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Center } from "@react-three/drei";
import { geoMercator } from "d3-geo";
import { gsap } from "gsap";
import type { CityGeoJSON } from "@/types/map";
import BaseMap from "./baseMap";
import OutLine from "./outline";
import FlyLine from "./flyLine";

import scOutlineData from "@/assets/sc_outline.json";

const outlineData = scOutlineData as CityGeoJSON;

export default function Index() {
  const camera = useThree((state) => state.camera);

  const projection = useMemo(() => {
    return geoMercator()
      .center(outlineData.features[0].properties.centroid as [number, number])
      .translate([0, 0]);
  }, []);

  useLayoutEffect(() => {
    const tween = gsap.fromTo(
      camera.position,
      { x: -50, y: 50, z: 150 },
      { x: 0, y: 80, z: 100, duration: 1.5, ease: "sine.inOut" }
    );

    return () => {
      tween.kill();
    };
  }, [camera]);

  return (
    <Center top>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={0.8}>
        <BaseMap projection={projection} />

        <OutLine projection={projection} />
        <FlyLine projection={projection} />
      </group>
    </Center>
  );
}
