"use client";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { ShedModel, type ShedSpec } from "./ShedModel";

function CameraRig({ width, depth }: { width: number; depth: number }) {
  const { camera, invalidate, size } = useThree();
  useEffect(() => {
    const span = Math.max(width, depth * 0.9, 1.6);
    const portrait = size.width < size.height * 1.1;
    const dist = span * (portrait ? 2.5 : 1.95) + 3.2;
    camera.position.set(dist * 0.5, 1.7 + span * 0.22, dist * 0.87);
    camera.lookAt(0, 1.1, 0);
    invalidate();
  }, [width, depth, camera, invalidate, size.width, size.height]);
  return null;
}

function DimensionLine({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const mid: [number, number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  return (
    <mesh position={mid} rotation={from[0] === to[0] ? [0, Math.PI / 2, 0] : [0, 0, 0]}>
      <boxGeometry args={[Math.hypot(to[0] - from[0], to[2] - from[2]), 0.012, 0.012]} />
      <meshBasicMaterial color="#12a3b4" />
    </mesh>
  );
}

/** Moves HTML labels (outside the canvas) to follow 3D points. */
function LabelTracker({ points, refs }: { points: [number, number, number][]; refs: RefObject<HTMLSpanElement | null>[] }) {
  const v = useRef(new THREE.Vector3());
  useFrame(({ camera, size }) => {
    points.forEach((p, i) => {
      const el = refs[i].current;
      if (!el) return;
      v.current.set(...p).project(camera);
      el.style.transform = `translate(${((v.current.x + 1) / 2) * size.width}px, ${((1 - v.current.y) / 2) * size.height}px) translate(-50%, -50%)`;
    });
  });
  return null;
}

export default function ShedViewer({ spec, showDims }: { spec: ShedSpec; showDims: boolean }) {
  const { width: W, depth: D } = spec;
  const wRef = useRef<HTMLSpanElement>(null);
  const dRef = useRef<HTMLSpanElement>(null);
  const wMid: [number, number, number] = [0, 0.02, D / 2 + 0.55];
  const dMid: [number, number, number] = [W / 2 + 0.45, 0.02, 0];
  const label = "pointer-events-none absolute top-0 left-0 whitespace-nowrap rounded-full bg-ink/85 px-2 py-0.5 text-xs font-bold text-white";
  return (
    <div className="relative size-full">
    <Canvas
      flat
      shadows={false}
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 32, near: 0.1, far: 100, position: [6, 3, 7] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      aria-label="הדמיה תלת־ממדית של המחסן"
    >
      <color attach="background" args={["#eef1ee"]} />
      <fog attach="fog" args={["#eef1ee", 18, 40]} />
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#ffffff", "#dfe5d8", 0.8]} />
      <directionalLight position={[3, 6, 9]} intensity={2.1} />
      <directionalLight position={[-8, 3, 1]} intensity={0.7} />
      <CameraRig width={W} depth={D} />
      <ShedModel {...spec} />
      {/* ground: a soft lawn disc with a paved pad under the shed */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial color="#cfd9c4" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, 0]}>
        <planeGeometry args={[W + 1.4, D + 1.4]} />
        <meshStandardMaterial color="#e4e1da" roughness={0.95} />
      </mesh>
      <ContactShadows position={[0, 0.003, 0]} scale={Math.max(W, D) * 2.4} opacity={0.45} blur={2.4} far={3} resolution={512} frames={Infinity} />
      {showDims && (
        <>
          <DimensionLine from={[-W / 2, 0.02, D / 2 + 0.55]} to={[W / 2, 0.02, D / 2 + 0.55]} />
          <DimensionLine from={[W / 2 + 0.45, 0.02, -D / 2]} to={[W / 2 + 0.45, 0.02, D / 2]} />
        </>
      )}
      <LabelTracker points={[wMid, dMid]} refs={[wRef, dRef]} />
      <OrbitControls
        makeDefault
        target={[0, 1.0, 0]}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={2.5}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.08}
      />
    </Canvas>
      {showDims && (
        <>
          <span ref={wRef} className={label}>רוחב {W.toFixed(2)} מ&apos;</span>
          <span ref={dRef} className={label}>עומק {D.toFixed(2)} מ&apos;</span>
        </>
      )}
    </div>
  );
}
