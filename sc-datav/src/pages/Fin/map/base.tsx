import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Center, useTexture } from "@react-three/drei";
import {
  Box2,
  DoubleSide,
  Color,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
  type Group,
} from "three";
import { geoMercator } from "d3-geo";
import { useFrame, useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import ShiftMaterial from "./shaderMaterial";
import GeoTrail from "./geoTrail";
import type { CityGeoJSON } from "@/types/map";
import ShapeBox from "./shape";
import FlyLine from "./flyLine";
import Boundary from "./boundary";
import Label from "./label";
import { useConfigStore } from "../stores";
import type { ShaanxiCity } from "../constants";

import scNormalMap from "@/assets/sc_normal_map1.png";
import Cones from "./cone";

const selectedColor = new Color("#4ade80");
const hoverColor = new Color("#7dd3fc");
const defaultScanColor = new Color("#8fc2ff");
const noEmissive = new Color(0, 0, 0);

export interface BaseProps {
  depth?: number;
  data: CityGeoJSON;
  outlineData?: CityGeoJSON;
}

export default function Base(props: BaseProps) {
  const { data, outlineData, depth = 1 } = props;
  const groupRef = useRef<Group>(null!);
  const camera = useThree((state) => state.camera);

  const projection = useMemo(() => {
    const centerSource = outlineData ?? data;
    return geoMercator()
      .center(centerSource.features[0].properties.centroid as [number, number])
      .translate([0, 0]);
  }, [data, outlineData]);

  const { regions, bbox, boundary } = useMemo(() => {
    const regions: {
      name: string;
      center: Vector3;
      points: Vector2[][];
    }[] = [];
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

    let boundary: Shape[] = [];

    outlineData?.features.forEach((feature) => {
      const points = feature.geometry.coordinates.map<Shape>((cur) => {
        return new Shape(
          cur.reduce<Vector2[]>(
            (pre, coordinates) => [...pre, ...coordinates.map(toV2)],
            []
          )
        );
      });

      boundary = boundary.concat(points);
    });

    return {
      regions,
      bbox,
      boundary,
    };
  }, [projection]);

  useLayoutEffect(() => {
    if (!groupRef.current) return;
    const tl = gsap.timeline();

    tl.to(camera.position, {
      x: -2,
      y: 7,
      z: 10,
      duration: 2.5,
      // delay: 2,
      ease: "circ.out",
      onComplete: () => {
        useConfigStore.setState({ mapPlayComplete: true });
      },
    });
    tl.to(groupRef.current.position, { x: 0, y: 0, z: 0, duration: 1 }, 2.5);

    tl.to(
      groupRef.current.scale,
      {
        x: 1,
        y: 1,
        z: 1,
        duration: 1,
        ease: "circ.out",
      },
      2.5
    );
    return () => {
      tl.kill();
    };
  }, [camera]);

  return (
    <Center top>
      <group
        castShadow
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[0.5, 0.5, 0.5]}
        position={[0, 0.2, 0]}>
        <group ref={groupRef} scale={[1, 1, 0]} position={[0, 0, -0.01]}>
          {regions.map((region, idx) => (
            <City
              key={region.name + idx}
              depth={depth}
              bbox={bbox}
              data={region}
            />
          ))}
          {outlineData && (
            <GeoTrail
              projection={projection}
              feature={outlineData.features[0]}
            />
          )}
          <Cones data={regions} />
          <FlyLine data={regions} />
          <Boundary data={boundary} />
        </group>
      </group>
    </Center>
  );
}

function City(props: {
  depth: number;
  bbox: Box2;
  data: {
    name: string;
    center: Vector3;
    points: Vector2[][];
  };
}) {
  const { bbox, data, depth } = props;
  const materialRef = useRef<ShaderMaterial>(null!);
  const groupRef = useRef<Group>(null!);
  const vector3 = useRef(new Vector3(1, 1, 1));
  const [hovering, setHovering] = useState(false);
  const mapPlayComplete = useConfigStore((s) => s.mapPlayComplete);
  const selectedCity = useConfigStore((s) => s.selectedCity);
  const selectCity = useConfigStore((s) => s.selectCity);
  const isSelected = selectedCity === data.name;

  const texture = useTexture(scNormalMap);

  const highlightMix = isSelected ? 0.45 : hovering ? 0.25 : 0;
  const scanColor = isSelected
    ? selectedColor
    : hovering
      ? hoverColor
      : defaultScanColor;
  const topEmissive = isSelected
    ? selectedColor
    : hovering
      ? hoverColor
      : noEmissive;
  const topEmissiveIntensity = isSelected ? 0.28 : hovering ? 0.15 : 0;
  const materialOpacity = mapPlayComplete ? 1 : 0;

  const [shape, shapeGeometry] = useMemo(() => {
    const shapes = data.points.map((e) => new Shape(e));
    const shapeGeometry = new ShapeGeometry(shapes);
    return [shapes, shapeGeometry];
  }, [data.points]);

  useFrame((_, delta) => {
    groupRef.current.scale.lerp(vector3.current, 0.1);
    if (materialRef.current) {
      materialRef.current.uniforms.time.value += delta / 3;
    }
  });

  useLayoutEffect(() => {
    vector3.current.setZ(isSelected ? 1.35 : 1);
  }, [isSelected]);

  return (
    <object3D
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
        selectCity(data.name as ShaanxiCity);
      }}
    >
      <ShapeBox bbox={bbox} args={[shape, { depth, bevelEnabled: false }]}>
        <meshStandardMaterial
          transparent
          attach="material-0"
          color="#293b41"
          normalMap={texture}
          metalness={0.5}
          roughness={0.7}
          side={DoubleSide}
          emissive={topEmissive}
          emissiveIntensity={topEmissiveIntensity}
          opacity={materialOpacity}
        />
        <ShiftMaterial
          transparent
          attach="material-1"
          ref={materialRef}
          depth={depth}
          opacity={materialOpacity}
          highlightColor={isSelected ? selectedColor : hoverColor}
          highlightMix={highlightMix}
          scanColor={scanColor}
        />
      </ShapeBox>
      <lineSegments position={[0, 0, depth + 0.05]} raycast={() => null}>
        <edgesGeometry args={[shapeGeometry]} />
        <lineBasicMaterial
          transparent
          color={isSelected ? "#4ade80" : "#a7a7a7"}
          opacity={isSelected ? 1 : 0.45}
        />
      </lineSegments>
      <Label
        $active={isSelected}
        center
        position={[data.center.x, data.center.y, depth + 0.2]}
        distanceFactor={10}
        zIndexRange={[100 - 1000]}>
        {data.name}
      </Label>
    </object3D>
  );
}
