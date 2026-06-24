import { useRef, useState, type ComponentProps } from "react";
import styled from "styled-components";
import {
  Canvas,
  useFrame,
  extend,
  type ThreeElements,
} from "@react-three/fiber";
import { Image, ScrollControls, useScroll } from "@react-three/drei";
import {
  Color,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
} from "three";
import { useNavigate } from "react-router";
import { hasPageAccess } from "@/api/client";
import { HOME_CAROUSEL } from "@/utils/pageAccess";
import Bg from "./bg";
import AiChat from "@/components/AiChat";

const SettingsBtn = styled.button`
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(186, 206, 255, 0.35);
  background: rgba(12, 20, 40, 0.65);
  color: #e8f0ff;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: rgba(48, 97, 219, 0.35);
    border-color: rgba(186, 206, 255, 0.65);
    transform: scale(1.05);
  }

  svg {
    width: 22px;
    height: 22px;
    fill: currentColor;
  }
`;

const AiAssistant = styled.button`
  position: absolute;
  bottom: 120px;
  right: 36px;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7);
  color: #ffffff;
  cursor: pointer;
  box-shadow:
    0 0 20px rgba(99, 102, 241, 0.4),
    0 0 40px rgba(139, 92, 246, 0.2),
    0 4px 16px rgba(0, 0, 0, 0.4);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  animation: ai-pulse 2.5s ease-in-out infinite;

  &::before {
    content: "";
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 2px solid rgba(139, 92, 246, 0.35);
    animation: ai-ring 3s ease-in-out infinite;
  }

  @keyframes ai-pulse {
    0%,
    100% {
      box-shadow:
        0 0 20px rgba(99, 102, 241, 0.4),
        0 0 40px rgba(139, 92, 246, 0.2),
        0 4px 16px rgba(0, 0, 0, 0.4);
    }
    50% {
      box-shadow:
        0 0 32px rgba(99, 102, 241, 0.6),
        0 0 60px rgba(139, 92, 246, 0.35),
        0 4px 18px rgba(0, 0, 0, 0.5);
    }
  }

  @keyframes ai-ring {
    0%,
    100% {
      opacity: 0.6;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.08);
    }
  }

  &:hover {
    transform: scale(1.08);
    box-shadow:
      0 0 36px rgba(99, 102, 241, 0.7),
      0 0 64px rgba(139, 92, 246, 0.4),
      0 4px 20px rgba(0, 0, 0, 0.5);
  }

  svg {
    width: 28px;
    height: 28px;
  }

  &::after {
    content: "点我进入AI助手";
    position: absolute;
    bottom: calc(100% + 10px);
    right: 0;
    white-space: nowrap;
    padding: 6px 14px;
    border-radius: 8px;
    background: rgba(20, 20, 40, 0.9);
    color: #e8e8ff;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.04em;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(139, 92, 246, 0.35);
    opacity: 0;
    transform: translateY(6px);
    pointer-events: none;
    transition:
      opacity 0.25s ease,
      transform 0.25s ease;
  }

  &:hover::after {
    opacity: 1;
    transform: translateY(0);
  }
`;


const PageTitle = styled.div`
  position: absolute;
  top: 48px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  text-align: center;
  color: #ffffff;
  pointer-events: none;
  text-shadow: 0 0 24px rgba(48, 97, 219, 0.8);

  h1 {
    margin: 0;
    font-size: clamp(22px, 3.2vw, 42px);
    font-weight: 600;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }

  p {
    margin: 12px 0 0;
    font-size: clamp(13px, 1.8vw, 16px);
    opacity: 0.75;
    letter-spacing: 0.08em;
  }
`;

const Wrapper = styled.div`
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #0b1020;
  color: #ffffff;
`;

class BentPlaneGeometry extends PlaneGeometry {
  constructor(
    radius: number,
    width: number,
    height: number,
    widthSegments?: number,
    heightSegments?: number
  ) {
    super(width, height, widthSegments, heightSegments);
    let p = this.parameters;
    let hw = p.width * 0.5;
    let a = new Vector2(-hw, 0);
    let b = new Vector2(0, radius);
    let c = new Vector2(hw, 0);
    let ab = new Vector2().subVectors(a, b);
    let bc = new Vector2().subVectors(b, c);
    let ac = new Vector2().subVectors(a, c);
    let r =
      (ab.length() * bc.length() * ac.length()) / (2 * Math.abs(ab.cross(ac)));
    let center = new Vector2(0, radius - r);
    let baseV = new Vector2().subVectors(a, center);
    let baseAngle = baseV.angle() - Math.PI * 0.5;
    let arc = baseAngle * 2;
    let uv = this.attributes.uv;
    let pos = this.attributes.position;
    let mainV = new Vector2();
    for (let i = 0; i < uv.count; i++) {
      let uvRatio = uv.getX(i);
      let y = pos.getY(i);
      mainV.copy(c).rotateAround(center, arc * uvRatio);
      pos.setXYZ(i, mainV.x, y, -mainV.y);
    }
    pos.needsUpdate = true;
  }
}

const BentPlaneGeometryEl = extend(BentPlaneGeometry);

const WheelDrop = styled.div`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0.6;
  color: #ffffff;
`;

const Circle = styled.circle`
  @keyframes scroll-drop {
    0% {
      transform: translateY(0);
      opacity: 1;
    }
    100% {
      transform: translateY(15px);
      opacity: 0;
    }
  }

  animation: scroll-drop 1.5s ease-in-out infinite;
`;

export default function Index() {
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
    <Wrapper>
      <SettingsBtn
        type="button"
        title="个人中心"
        aria-label="个人中心"
        onClick={() => navigate("/profile")}>
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M19.14 12.94a7.43 7.43 0 00.05-.94 7.43 7.43 0 00-.05-.94l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.28 7.28 0 00-1.63-.94l-.36-2.54a.5.5 0 00-.5-.42h-3.84a.5.5 0 00-.5.42l-.36 2.54a7.28 7.28 0 00-1.63.94l-2.39-.96a.5.5 0 00-.6.22L2.71 8.84a.5.5 0 00.12.64l2.03 1.58c-.03.31-.05.63-.05.94s.02.63.05.94l-2.03 1.58a.5.5 0 00-.12.64l1.92 3.32a.5.5 0 00.6.22l2.39-.96c.5.39 1.05.7 1.63.94l.36 2.54a.5.5 0 00.5.42h3.84a.5.5 0 00.5-.42l.36-2.54c.58-.24 1.13-.55 1.63-.94l2.39.96a.5.5 0 00.6-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58zM12 15.6A3.6 3.6 0 1112 8.4a3.6 3.6 0 010 7.2z" />
        </svg>
      </SettingsBtn>

      <PageTitle>
        <h1>陕西省林业苗圃资产与销售系统</h1>
      </PageTitle>

      <Canvas camera={{ position: [0, 0, 100], fov: 15 }}>
        <fog attach="fog" args={["#6e6e6e", 8.5, 12]} />
        <ScrollControls pages={4} infinite>
          <Rig rotation={[0, 0, 0.15]}>
            <Carousel />
          </Rig>
        </ScrollControls>
        <Bg />
      </Canvas>

      <WheelDrop>
        <svg width="20" height="32.5" viewBox="0 0 40 65">
          <rect
            x="2.5"
            y="2.5"
            width="35"
            height="60"
            rx="17.5"
            ry="17.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />

          <Circle cx="20" cy="15" r="3" fill="currentColor" />
        </svg>
      </WheelDrop>
      <AiAssistant
        type="button"
        title="AI 智能助手"
        aria-label="AI 智能助手"
        onClick={() => setChatOpen(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 2L9.5 9.5L2 12L9.5 14.5L12 22L14.5 14.5L22 12L14.5 9.5Z" />
        </svg>
      </AiAssistant>
    </Wrapper>
      {chatOpen && <AiChat onClose={() => setChatOpen(false)} />}
    </>
  );
}

function Rig(props: ThreeElements["group"]) {
  const ref = useRef<Group>(null!);
  const scroll = useScroll();
  const vector3 = useRef(new Vector3(1, 1, 1));

  useFrame((state, delta) => {
    ref.current.rotation.y = -scroll.offset * (Math.PI * 2);
    state.events.update?.();
    vector3.current.set(-state.pointer.x * 2, state.pointer.y + 1.5, 10);
    state.camera.position.lerp(vector3.current, 1 - Math.exp(-8 * delta));
    state.camera.lookAt(0, 0, 0);
  });

  return <group ref={ref} {...props} />;
}

function Carousel({ radius = 1.4, count = 8 }) {
  const navigator = useNavigate();

  return Array.from({ length: count }, (_, i) => {
    const slot = HOME_CAROUSEL[i % HOME_CAROUSEL.length];
    const enterable = hasPageAccess(slot.page);

    return (
      <Card
        key={i}
        enterable={enterable}
        url={`/sc-datav/${slot.image}.jpg`}
        position={[
          Math.sin((i / count) * Math.PI * 2) * radius,
          0,
          Math.cos((i / count) * Math.PI * 2) * radius,
        ]}
        rotation={[0, Math.PI + (i / count) * Math.PI * 2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (!enterable) return;
          navigator(slot.route);
        }}
      />
    );
  });
}

export interface ImageMaterial extends ShaderMaterial {
  scale?: number[];
  imageBounds?: number[];
  radius?: number;
  resolution?: number;
  color?: Color;
  map: Texture;
  zoom?: number;
  grayscale?: number;
}

function Card({
  enterable = true,
  ...props
}: ComponentProps<typeof Image> & { enterable?: boolean }) {
  const ref = useRef<Mesh<BentPlaneGeometry, ImageMaterial>>(null!);
  const vector3 = useRef(new Vector3(1, 1, 1));
  const targetRadius = useRef(0.1);
  const targetZoom = useRef(1);

  useFrame((_, delta) => {
    ref.current.scale.lerp(vector3.current, 1 - Math.exp(-10 * delta));
    ref.current.material.radius = MathUtils.lerp(
      ref.current.material.radius!,
      targetRadius.current,
      1 - Math.exp(-8 * delta)
    );

    ref.current.material.zoom = MathUtils.lerp(
      ref.current.material.zoom!,
      targetZoom.current,
      1 - Math.exp(-8 * delta)
    );
  });

  return (
    <Image
      ref={ref}
      transparent
      toneMapped={false}
      side={DoubleSide}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!enterable) return;
        vector3.current.setScalar(1.15);
        targetRadius.current = 0.25;
        targetZoom.current = 1;
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        vector3.current.setScalar(1);
        targetRadius.current = 0.1;
        targetZoom.current = 1;
        document.body.style.cursor = "auto";
      }}
      {...props}>
      <BentPlaneGeometryEl args={[0.1, 1, 1, 20, 20]} />
    </Image>
  );
}
