import { Fragment, useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Billboard, Line, Text, useTexture } from "@react-three/drei";
import {
  Box2,
  Color,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  Shape,
  Texture,
  Vector2,
  Vector3,
} from "three";
import { useMapStyleStore } from "../stores";
import type { ShaanxiCity } from "../constants";
import ShapeBox from "./shape";
import type { GeoProjection } from "d3-geo";
import type { CityGeoJSON } from "@/types/map";

import scMapData from "@/assets/sc.json";
import textureMap from "@/assets/sc_map.png";
import scNormalMap from "@/assets/sc_normal_map.png";
import scDisplacementMap from "@/assets/sc_displacement_map.png";

const data = scMapData as CityGeoJSON;

const selectedColor = new Color("#4ade80");
const hoverColor = new Color("#7dd3fc");

type Region = {
  name: string;
  center: Vector3;
  points: Vector2[][];
};

function CityRegion({
  reg,
  bbox,
  index,
  newStyle,
  texture1,
  texture2,
  texture3,
}: {
  reg: Region;
  bbox: Box2;
  index: number;
  newStyle: boolean;
  texture1: Texture;
  texture2: Texture;
  texture3?: Texture;
}) {
  const selectedCity = useMapStyleStore((s) => s.selectedCity);
  const selectCity = useMapStyleStore((s) => s.selectCity);
  const isSelected = selectedCity === reg.name;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectCity(reg.name as ShaanxiCity);
  };

  const setEmissive = (e: ThreeEvent<PointerEvent>, color: Color, intensity: number) => {
    const mat = (e.object as Mesh).material;
    if (mat instanceof MeshStandardMaterial) {
      mat.emissive = color;
      mat.emissiveIntensity = intensity;
    }
  };

  const materialProps = newStyle
    ? {
        map: texture1,
        normalMap: texture2,
        displacementMap: texture3,
        metalness: 0.2,
        roughness: 0.5,
        side: DoubleSide,
        emissive: isSelected ? selectedColor : undefined,
        emissiveIntensity: isSelected ? 0.35 : 0,
      }
    : {
        map: texture1,
        normalMap: texture2,
        metalness: 0.2,
        roughness: 0.5,
        side: DoubleSide,
        emissive: isSelected ? selectedColor : undefined,
        emissiveIntensity: isSelected ? 0.35 : 0,
      };

  return (
    <Fragment key={`${newStyle ? "new" : "old"}-${index}`}>
      <ShapeBox
        bbox={bbox}
        args={[reg.points.map((e) => new Shape(e))]}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
          setEmissive(e, hoverColor, 0.2);
        }}
        onPointerOut={(e) => {
          document.body.style.cursor = "auto";
          setEmissive(
            e,
            isSelected ? selectedColor : new Color(0, 0, 0),
            isSelected ? 0.35 : 0
          );
        }}>
        <meshStandardMaterial {...materialProps} />
      </ShapeBox>

      {!newStyle && (
        <Line
          position={[0, 0, 0.01]}
          points={reg.points[0]}
          linewidth={1}
          color={isSelected ? "#4ade80" : "#a7a7a7"}
        />
      )}

      <group position={[0, 0, newStyle ? 0.6 : 0.2]}>
        <Billboard position={reg.center}>
          <Text
            color={isSelected ? "#4ade80" : "#ffffff"}
            fontSize={0.3}
            fontWeight={600}
            onClick={handleClick}
            onPointerOver={() => {
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "auto";
            }}>
            {reg.name}
          </Text>
        </Billboard>
      </group>
    </Fragment>
  );
}

export default function BaseMap({ projection }: { projection: GeoProjection }) {
  const newStyle = useMapStyleStore((s) => s.newStyle);
  const [texture1, texture2, texture3] = useTexture(
    [textureMap, scNormalMap, scDisplacementMap],
    (tex) =>
      tex.forEach((el) => {
        el.wrapS = el.wrapT = RepeatWrapping;
      })
  );

  const { regions, bbox } = useMemo(() => {
    const regions: Region[] = [];
    const bbox = new Box2();

    const toV2 = (coord: number[]) => {
      const [x, y] = projection(coord as [number, number])!;
      const projected = new Vector2(x, -y);
      bbox.expandByPoint(projected);
      return projected;
    };

    data.features.forEach((feature) => {
      const [x, y] = projection(
        feature.properties.centroid ?? feature.properties.center
      )!;

      const points = feature.geometry.coordinates.reduce<Vector2[][]>(
        (pre, cur) => [
          ...pre,
          ...cur.map<Vector2[]>((coordinates) => coordinates.map(toV2)),
        ],
        []
      );

      regions.push({
        name: feature.properties.name,
        center: new Vector3(x, -y),
        points,
      });
    });

    return { regions, bbox };
  }, [projection]);

  return (
    <group renderOrder={0} position={[0, 0, 0.51]}>
      {regions.map((reg, i) => (
        <CityRegion
          key={i}
          reg={reg}
          bbox={bbox}
          index={i}
          newStyle={newStyle}
          texture1={texture1}
          texture2={texture2}
          texture3={newStyle ? texture3 : undefined}
        />
      ))}
    </group>
  );
}
