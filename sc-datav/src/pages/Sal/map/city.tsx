import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  Shape,
  ShapeGeometry,
  Vector3,
  type Box2,
  type Group,
  type MeshStandardMaterialProperties,
  type Vector2,
} from "three";
import ShapeMesh from "./shape";
import Tooltip, { type CityOrderStats } from "./tooltip";
import Bar from "./bar";
import Label from "./label";
import { useConfigStore } from "../stores";
import type { ShaanxiCity } from "../constants";

const selectedColor = new Color("#4ade80");
const hoverColor = new Color("#fdb961");
const noEmissive = new Color(0, 0, 0);

export interface CityProps
  extends Pick<MeshStandardMaterialProperties, "map" | "normalMap"> {
  bbox: Box2;
  depth: number;
  stats?: CityOrderStats;
  data: {
    city: string;
    cityId: [x: number, y: number, z: number];
    points: Vector2[][];
  };
}

export default function City(props: CityProps) {
  const { data, bbox, depth, map, normalMap, stats } = props;
  const groupRef = useRef<Group>(null!);
  const tooltipRef = useRef<{ open: () => void; close: () => void }>(null!);
  const vector3 = useRef(new Vector3(1, 1, 1));
  const [hovering, setHovering] = useState(false);

  const selectedCity = useConfigStore((s) => s.selectedCity);
  const selectCity = useConfigStore((s) => s.selectCity);
  const isSelected = selectedCity === data.city;

  const orderCount = stats?.orderCount ?? 0;
  const totalAmount = stats?.totalAmount ?? 0;
  const barValue = totalAmount > 0 ? totalAmount : orderCount * 10000;

  const topEmissive = isSelected
    ? selectedColor
    : hovering
      ? hoverColor
      : noEmissive;
  const topEmissiveIntensity = isSelected ? 0.35 : hovering ? 0.18 : 0;

  const [shape, shapeGeometry] = useMemo(() => {
    const shapes = data.points.map((e) => new Shape(e));
    const shapeGeometry = new ShapeGeometry(shapes);
    return [shapes, shapeGeometry];
  }, [data.points]);

  useFrame(() => {
    groupRef.current.scale.lerp(vector3.current, 0.1);
  });

  useLayoutEffect(() => {
    vector3.current.setZ(isSelected ? 1.35 : 1);
  }, [isSelected]);

  useEffect(() => {
    if (hovering) {
      tooltipRef.current?.open();
    } else {
      tooltipRef.current?.close();
    }
  }, [hovering]);

  const showHoverUi = hovering;

  return (
    <group
      ref={groupRef}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovering(true);
        vector3.current.setZ(1.5);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovering(false);
        vector3.current.setZ(isSelected ? 1.35 : 1);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        selectCity(data.city as ShaanxiCity);
      }}>
      <ShapeMesh position-z={depth + 0.1} bbox={bbox} args={[shape]}>
        <meshStandardMaterial
          map={map}
          normalMap={normalMap}
          emissive={topEmissive}
          emissiveIntensity={topEmissiveIntensity}
        />
      </ShapeMesh>
      <mesh castShadow receiveShadow>
        <extrudeGeometry
          args={[shape, { depth, steps: 1, bevelEnabled: false }]}
        />
        <meshStandardMaterial
          transparent
          opacity={0}
          metalness={0.2}
          roughness={0.5}
          side={DoubleSide}
          color="#f9f3e7"
        />
      </mesh>
      <lineSegments position-z={depth + 0.2} raycast={() => null}>
        <edgesGeometry args={[shapeGeometry]} />
        <lineBasicMaterial
          transparent
          color={isSelected ? "#4ade80" : "#ffffff"}
          opacity={isSelected ? 1 : 0}
        />
      </lineSegments>

      {showHoverUi && (
        <Bar position={data.cityId} value={barValue} max={600000}>
          {(barHeight) => (
            <Label
              center
              position={[0, 0, barHeight + 0.2]}
              distanceFactor={100}
              zIndexRange={[100 - 1000]}
              style={{
                color: isSelected ? "#4ade80" : "#ea580c",
                borderColor: isSelected ? "#4ade80" : "#fdb961",
              }}>
              {data.city}
            </Label>
          )}
        </Bar>
      )}
      <Tooltip
        ref={tooltipRef}
        data={{
          city: data.city,
          orderCount,
          totalAmount,
        }}
        position={[data.cityId[0], data.cityId[1], depth + 12]}
      />
    </group>
  );
}
