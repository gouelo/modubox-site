"use client";
// The 3D shed. Units are metres. The front wall faces +z; the roof slopes down to the back.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { ShedLayout, Slot, Wall } from "@/lib/layout";

export interface ShedSpec {
  width: number; // outer, metres
  depth: number;
  heightFront: number;
  heightBack: number;
  profile: "white" | "black";
  layout: ShedLayout;
  grills: number;
  electric: boolean;
  ac: boolean;
  shelves: number[]; // heights of shelf units, e.g. [1.83, 1.905]
  platform: boolean;
  kipWindow: boolean;
  solar: boolean;
  doorOpen: boolean;
  interior: boolean;
}

const BASE = 0.1; // raised floor
const PANEL_TOP = 1.95; // where the skylight band starts
const POST = 0.06;
const T = 0.05; // wall thickness

const PANEL = new THREE.MeshStandardMaterial({ color: "#f6f6f3", roughness: 0.7, metalness: 0.02 });
const GROOVE = new THREE.MeshStandardMaterial({ color: "#c9c9c2", roughness: 0.8 });
const DOOR = new THREE.MeshStandardMaterial({ color: "#fbfbf9", roughness: 0.35 });
const GLASS = new THREE.MeshStandardMaterial({ color: "#9fc3cf", roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.32, depthWrite: false });
const SKY = new THREE.MeshStandardMaterial({ color: "#e4eef2", roughness: 0.3, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
const FLOOR_IN = new THREE.MeshStandardMaterial({ color: "#c9c8c2", roughness: 0.9 });
const DARK = new THREE.MeshStandardMaterial({ color: "#2a2d30", roughness: 0.5, metalness: 0.4 });
const WOOD = new THREE.MeshStandardMaterial({ color: "#c79a62", roughness: 0.7 });
const ROOF_TOP = new THREE.MeshStandardMaterial({ color: "#cfd2d3", roughness: 0.8 });
const AC_BODY = new THREE.MeshStandardMaterial({ color: "#f6f6f4", roughness: 0.4 });
const LAMP = new THREE.MeshStandardMaterial({ color: "#fff2c6", emissive: "#ffd66b", emissiveIntensity: 1.2 });

function profileMat(p: "white" | "black") {
  return new THREE.MeshStandardMaterial({ color: p === "white" ? "#dcdedd" : "#202326", roughness: 0.4, metalness: 0.25 });
}

/** Grows new parts in with a little spring, so add-ons feel alive. */
function PopIn({ children, position, rotation }: { children: ReactNode; position?: [number, number, number]; rotation?: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const s = useRef(0.2);
  useFrame((state) => {
    if (!ref.current || s.current >= 0.999) return;
    s.current += (1 - s.current) * 0.18;
    if (1 - s.current < 0.002) s.current = 1;
    ref.current.scale.setScalar(s.current);
    state.invalidate();
  });
  return (
    <group ref={ref} position={position} rotation={rotation} scale={0.2}>
      {children}
    </group>
  );
}

function Grooves({ w, h, y0, z }: { w: number; h: number; y0: number; z: number }) {
  const lines = [];
  for (let y = y0 + 0.48; y < y0 + h - 0.1; y += 0.48) lines.push(y);
  return (
    <>
      {lines.map((y) => (
        <mesh key={y} position={[0, y, z]} material={GROOVE}>
          <boxGeometry args={[w * 0.98, 0.008, 0.004]} />
        </mesh>
      ))}
    </>
  );
}

function Panel({ w }: { w: number }) {
  const h = PANEL_TOP - BASE;
  return (
    <group>
      <mesh position={[0, BASE + h / 2, 0]} material={PANEL} castShadow>
        <boxGeometry args={[w, h, T]} />
      </mesh>
      <Grooves w={w} h={h} y0={BASE} z={T / 2 + 0.002} />
      <Grooves w={w} h={h} y0={BASE} z={-T / 2 - 0.002} />
    </group>
  );
}

function DoorLeaf({ w, open, hingeSide }: { w: number; open: boolean; hingeSide: 1 | -1 }) {
  const ref = useRef<THREE.Group>(null);
  const h = 1.95 - BASE - 0.04;
  useFrame((state) => {
    if (!ref.current) return;
    const target = open ? -hingeSide * 1.25 : 0;
    const cur = ref.current.rotation.y;
    if (Math.abs(target - cur) > 0.001) {
      ref.current.rotation.y = cur + (target - cur) * 0.14;
      state.invalidate();
    }
  });
  // the group pivots on the hinge edge
  return (
    <group ref={ref} position={[(-hingeSide * w) / 2, 0, 0]}>
      <group position={[(hingeSide * w) / 2, 0, 0]}>
        <mesh position={[0, BASE + 0.02 + h / 2, 0.01]} material={DOOR} castShadow>
          <boxGeometry args={[w - 0.01, h, 0.045]} />
        </mesh>
        <Grooves w={w - 0.04} h={h} y0={BASE + 0.02} z={0.036} />
        {/* handle + lock */}
        <mesh position={[(hingeSide * (w - 0.16)) / 2, BASE + 1.0, 0.055]} material={DARK}>
          <boxGeometry args={[0.14, 0.028, 0.035]} />
        </mesh>
        <mesh position={[(hingeSide * (w - 0.16)) / 2 + hingeSide * 0.05, BASE + 0.97, 0.04]} material={DARK}>
          <boxGeometry args={[0.035, 0.2, 0.008]} />
        </mesh>
        <mesh position={[(hingeSide * (w - 0.16)) / 2, BASE + 0.92, 0.04]} material={DARK}>
          <cylinderGeometry args={[0.012, 0.012, 0.02, 12]} />
        </mesh>
      </group>
    </group>
  );
}

function DoorModule({ total, span, open, profile }: { total: number; span: number; open: boolean; profile: THREE.Material }) {
  const doorW = span === 2 ? Math.min(1.8, total - 0.1) : Math.min(0.93, total - 0.06);
  const side = (total - doorW) / 2;
  return (
    <group>
      {/* filler panels beside the door */}
      {side > 0.02 && (
        <>
          <group position={[-(doorW + side) / 2, 0, 0]}><Panel w={side} /></group>
          <group position={[(doorW + side) / 2, 0, 0]}><Panel w={side} /></group>
        </>
      )}
      {/* door frame */}
      <mesh position={[0, 1.95 - 0.02, 0.01]} material={profile}>
        <boxGeometry args={[doorW + 0.08, 0.05, T + 0.03]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * (doorW + 0.04)) / 2, (1.95 + BASE) / 2, 0.01]} material={profile}>
          <boxGeometry args={[0.04, 1.95 - BASE, T + 0.03]} />
        </mesh>
      ))}
      {span === 2 ? (
        <>
          <group position={[-doorW / 4, 0, 0]}><DoorLeaf w={doorW / 2} open={open} hingeSide={-1} /></group>
          <group position={[doorW / 4, 0, 0]}><DoorLeaf w={doorW / 2} open={open} hingeSide={1} /></group>
        </>
      ) : (
        <DoorLeaf w={doorW} open={open} hingeSide={1} />
      )}
    </group>
  );
}

function WindowModule({ w, profile }: { w: number; profile: THREE.Material }) {
  const ww = Math.min(0.9, w - 0.12);
  const wh = 0.8;
  const y = 1.35;
  return (
    <group>
      <Panel w={w} />
      <group position={[0, y, T / 2 + 0.012]}>
        <mesh material={profile}><boxGeometry args={[ww + 0.06, wh + 0.06, 0.03]} /></mesh>
        <mesh position={[0, 0, 0.017]} material={GLASS}><boxGeometry args={[ww, wh, 0.01]} /></mesh>
        <mesh position={[0, 0, 0.024]} material={profile}><boxGeometry args={[0.035, wh, 0.02]} /></mesh>
      </group>
    </group>
  );
}

function GlassModule({ w, shutter, profile }: { w: number; shutter: boolean; profile: THREE.Material }) {
  const h = PANEL_TOP - BASE;
  const slats = [];
  if (shutter) for (let y = BASE + 0.08; y < PANEL_TOP - 0.05; y += 0.06) slats.push(y);
  return (
    <group>
      <mesh position={[0, BASE + h / 2, 0]} material={GLASS}><boxGeometry args={[w - 0.02, h, 0.02]} /></mesh>
      <mesh position={[0, BASE + 0.02, 0]} material={profile}><boxGeometry args={[w, 0.04, T]} /></mesh>
      {slats.map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[0.5, 0, 0]} material={PANEL}>
          <boxGeometry args={[w - 0.1, 0.045, 0.004]} />
        </mesh>
      ))}
    </group>
  );
}

/** A flat quad between two heights at each end (for sloped side walls). */
function Quad({ x0, x1, y0a, y0b, y1a, y1b, material }: { x0: number; x1: number; y0a: number; y0b: number; y1a: number; y1b: number; material: THREE.Material }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const v = new Float32Array([x0, y0a, 0, x1, y0b, 0, x1, y1b, 0, x0, y0a, 0, x1, y1b, 0, x0, y1a, 0]);
    g.setAttribute("position", new THREE.BufferAttribute(v, 3));
    g.computeVertexNormals();
    return g;
  }, [x0, x1, y0a, y0b, y1a, y1b]);
  return <mesh geometry={geo} material={material} />;
}

const WALLS: Wall[] = ["front", "right", "back", "left"];

export function ShedModel(spec: ShedSpec) {
  const { width: W, depth: D, heightFront: HF, heightBack: HB, layout } = spec;
  const profile = useMemo(() => profileMat(spec.profile), [spec.profile]);
  const heightAt = (z: number) => HB + ((HF - HB) * (z + D / 2)) / D;

  const wallFrame = (wall: Wall) => {
    switch (wall) {
      case "front": return { pos: [0, 0, D / 2 - T / 2] as const, rot: 0, len: W };
      case "back": return { pos: [0, 0, -D / 2 + T / 2] as const, rot: Math.PI, len: W };
      case "right": return { pos: [W / 2 - T / 2, 0, 0] as const, rot: Math.PI / 2, len: D };
      case "left": return { pos: [-W / 2 + T / 2, 0, 0] as const, rot: -Math.PI / 2, len: D };
    }
  };

  // grills go low on plain panels, back wall first
  const plain: { wall: Wall; index: number }[] = [];
  for (const wall of ["back", "left", "right", "front"] as Wall[]) {
    for (let i = 0; i < layout.modules[wall]; i++) {
      if (!layout.slots.some((s) => s.wall === wall && i >= s.index && i < s.index + s.span)) plain.push({ wall, index: i });
    }
  }
  const grillAt = new Map(plain.slice(0, spec.grills).map((p) => [`${p.wall}:${p.index}`, true]));
  const kipAt = spec.kipWindow ? plain.find((p) => p.wall === "left" || p.wall === "right") ?? plain[0] : undefined;

  const slotAt = (wall: Wall, i: number): Slot | undefined => layout.slots.find((s) => s.wall === wall && s.index === i);
  const covered = (wall: Wall, i: number) => layout.slots.some((s) => s.wall === wall && i > s.index && i < s.index + s.span);

  return (
    <group>
      {/* base / platform */}
      {spec.platform && (
        <PopIn position={[0, -0.05, 0]}>
          <mesh position={[0, 0, 0]} material={PANEL} receiveShadow>
            <boxGeometry args={[W + 0.12, 0.1, D + 0.12]} />
          </mesh>
        </PopIn>
      )}
      <group position={[0, spec.platform ? 0.05 : 0, 0]}>
        <mesh position={[0, BASE / 2, 0]} material={profile} castShadow receiveShadow>
          <boxGeometry args={[W, BASE, D]} />
        </mesh>
        <mesh position={[0, BASE + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={FLOOR_IN}>
          <planeGeometry args={[W - 0.1, D - 0.1]} />
        </mesh>

        {WALLS.map((wall) => {
          const f = wallFrame(wall);
          const n = layout.modules[wall];
          const m = f.len / n;
          const sideWall = wall === "left" || wall === "right";
          return (
            <group key={wall} position={[f.pos[0], f.pos[1], f.pos[2]]} rotation={[0, f.rot, 0]}>
              {Array.from({ length: n }, (_, i) => {
                if (covered(wall, i)) return null;
                const slot = slotAt(wall, i);
                const span = slot?.span ?? 1;
                const x = -f.len / 2 + m * (i + span / 2);
                const key = `${wall}-${i}-${slot?.kind ?? "p"}-${slot?.shutter ? "s" : ""}`;
                let body: ReactNode = <Panel w={m - POST} />;
                if (slot?.kind === "door" || slot?.kind === "double-door" || slot?.kind === "extra-door")
                  body = <DoorModule total={m * span - POST} span={span} open={spec.doorOpen && slot.kind !== "extra-door"} profile={profile} />;
                else if (slot?.kind === "window") body = <WindowModule w={m - POST} profile={profile} />;
                else if (slot?.kind === "glass") body = <GlassModule w={m - POST} shutter={!!slot.shutter} profile={profile} />;
                return (
                  <group key={key} position={[x, 0, 0]}>
                    {slot && slot.kind !== "door" ? <PopIn>{body}</PopIn> : body}
                    {grillAt.has(`${wall}:${i}`) && (
                      <PopIn position={[0, BASE + 0.28, T / 2 + 0.012]}>
                        <mesh material={PANEL}><boxGeometry args={[0.42, 0.16, 0.02]} /></mesh>
                        {[-0.045, -0.015, 0.015, 0.045].map((y) => (
                          <mesh key={y} position={[0, y, 0.012]} material={GROOVE}><boxGeometry args={[0.36, 0.012, 0.01]} /></mesh>
                        ))}
                      </PopIn>
                    )}
                    {kipAt && kipAt.wall === wall && kipAt.index === i && (
                      <PopIn position={[0, 1.6, T / 2 + 0.012]}>
                        <mesh material={profile}><boxGeometry args={[0.66, 0.42, 0.03]} /></mesh>
                        <mesh position={[0, 0, 0.017]} material={GLASS}><boxGeometry args={[0.6, 0.36, 0.01]} /></mesh>
                      </PopIn>
                    )}
                  </group>
                );
              })}

              {/* skylight band */}
              {sideWall ? (
                (() => {
                  // local x runs along z (sign depends on rotation)
                  const dir = wall === "right" ? -1 : 1;
                  const zA = (dir * -f.len) / 2;
                  const zB = (dir * f.len) / 2;
                  return (
                    <Quad x0={-f.len / 2} x1={f.len / 2} y0a={PANEL_TOP} y0b={PANEL_TOP} y1a={heightAt(zA) - 0.06} y1b={heightAt(zB) - 0.06} material={SKY} />
                  );
                })()
              ) : (
                <mesh position={[0, (PANEL_TOP + (wall === "front" ? HF : HB) - 0.06) / 2, 0]} material={SKY}>
                  <boxGeometry args={[f.len - POST, (wall === "front" ? HF : HB) - 0.06 - PANEL_TOP, 0.01]} />
                </mesh>
              )}

              {/* posts at module joints + rails */}
              {Array.from({ length: n + 1 }, (_, i) => {
                const x = -f.len / 2 + m * i;
                const h = sideWall ? heightAt(wall === "right" ? -x : x) : wall === "front" ? HF : HB;
                return (
                  <mesh key={i} position={[x, h / 2, 0]} material={profile} castShadow>
                    <boxGeometry args={[POST, h, POST]} />
                  </mesh>
                );
              })}
              {!sideWall && (
                <mesh position={[0, PANEL_TOP, 0.0]} material={profile}>
                  <boxGeometry args={[f.len, 0.045, T + 0.02]} />
                </mesh>
              )}
            </group>
          );
        })}

        {/* side rails at the skylight line */}
        {(["left", "right"] as const).map((s) => (
          <mesh key={s} position={[s === "left" ? -W / 2 + T / 2 : W / 2 - T / 2, PANEL_TOP, 0]} material={profile}>
            <boxGeometry args={[T + 0.02, 0.045, D]} />
          </mesh>
        ))}

        {/* roof */}
        {!spec.interior && (
          <group position={[0, (HF + HB) / 2, 0]} rotation={[Math.atan2(HF - HB, D), 0, 0]}>
            <mesh position={[0, 0.03, 0]} material={ROOF_TOP} castShadow>
              <boxGeometry args={[W + 0.08, 0.05, Math.hypot(D, HF - HB) + 0.08]} />
            </mesh>
            {/* fascia */}
            <mesh position={[0, 0.03, (Math.hypot(D, HF - HB) + 0.08) / 2]} material={profile}>
              <boxGeometry args={[W + 0.1, 0.11, 0.025]} />
            </mesh>
            <mesh position={[0, 0.03, -(Math.hypot(D, HF - HB) + 0.08) / 2]} material={profile}>
              <boxGeometry args={[W + 0.1, 0.11, 0.025]} />
            </mesh>
            {(["l", "r"] as const).map((s) => (
              <mesh key={s} position={[s === "l" ? -(W + 0.09) / 2 : (W + 0.09) / 2, 0.03, 0]} material={profile}>
                <boxGeometry args={[0.025, 0.11, Math.hypot(D, HF - HB) + 0.1]} />
              </mesh>
            ))}
            {spec.solar && (
              <PopIn position={[W / 2 - 0.35, 0.09, 0]}>
                <mesh rotation={[-0.15, 0, 0]} material={DARK}><boxGeometry args={[0.5, 0.03, 0.35]} /></mesh>
              </PopIn>
            )}
          </group>
        )}

        {/* electric panel + outdoor lamp by the main door */}
        {spec.electric && (() => {
          const door = layout.slots[0];
          const m = W / layout.modules.front;
          const doorCenter = -W / 2 + m * (door.index + door.span / 2);
          const doorHalf = door.span === 2 ? 0.9 : 0.465;
          const x = doorCenter - doorHalf - 0.25 > -W / 2 + 0.15 ? doorCenter - doorHalf - 0.22 : doorCenter;
          return (
            <>
              <PopIn position={[x, 1.35, D / 2 + 0.03]}>
                <mesh material={AC_BODY}><boxGeometry args={[0.24, 0.3, 0.07]} /></mesh>
                <mesh position={[0, -0.05, 0.04]} material={DARK}><boxGeometry args={[0.14, 0.08, 0.01]} /></mesh>
              </PopIn>
              <PopIn position={[doorCenter, PANEL_TOP - 0.1, D / 2 + 0.05]}>
                <mesh material={LAMP}><boxGeometry args={[0.16, 0.06, 0.06]} /></mesh>
              </PopIn>
            </>
          );
        })()}

        {/* AC outdoor unit on the right side */}
        {spec.ac && (
          <PopIn position={[W / 2 + 0.25, 0.32, -D / 4]}>
            <mesh material={AC_BODY} castShadow><boxGeometry args={[0.3, 0.55, 0.78]} /></mesh>
            <mesh position={[0.155, 0.02, 0.06]} rotation={[0, 0, Math.PI / 2]} material={DARK}>
              <cylinderGeometry args={[0.19, 0.19, 0.01, 32]} />
            </mesh>
            <mesh position={[-0.1, 0.5, 0.25]} material={DARK}><cylinderGeometry args={[0.018, 0.018, 0.5, 8]} /></mesh>
          </PopIn>
        )}

        {/* shelf units along the back wall, then the sides */}
        {spec.shelves.map((h, i) => {
          const perBack = Math.max(1, Math.floor((W - 0.2) / 1.0));
          const onBack = i < perBack;
          const pos: [number, number, number] = onBack
            ? [-W / 2 + 0.6 + i * 1.0, BASE, -D / 2 + 0.28]
            : [-W / 2 + 0.28, BASE, -D / 2 + 1.0 + (i - perBack) * 1.0];
          if (!onBack && pos[2] > D / 2 - 0.6) return null;
          return (
            <PopIn key={i} position={pos} rotation={[0, onBack ? 0 : Math.PI / 2, 0]}>
              {[-0.46, 0.46].map((x) => [-0.18, 0.18].map((z) => (
                <mesh key={`${x}${z}`} position={[x, h / 2, z]} material={DARK}><boxGeometry args={[0.03, h, 0.03]} /></mesh>
              )))}
              {Array.from({ length: h > 1.85 ? 5 : 4 }, (_, k) => (
                <mesh key={k} position={[0, 0.15 + (k * (h - 0.25)) / ((h > 1.85 ? 5 : 4) - 1), 0]} material={WOOD}>
                  <boxGeometry args={[0.96, 0.025, 0.4]} />
                </mesh>
              ))}
            </PopIn>
          );
        })}
      </group>
    </group>
  );
}
