"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshLambertMaterial,
  Vector3,
  type Group,
} from "three";
import { CAMERA, FOG, KITE_SHAPE, KITE_SPARS, KITE_TRIANGLES, KITES, kitePose, LIGHT, SPAR_COLOR, STRING_ANCHORS, STRING_COLOR, STRING_POINTS, stringPoints, type Kite } from "@/lib/kites";

// Loaded only on the home page, after the page has finished loading (see hero-sky.tsx).

function buildKite(kite: Kite) {
  const positions = KITE_TRIANGLES.flatMap((t) => t.points.flat());
  const colors = KITE_TRIANGLES.flatMap((t) => {
    const c = new Color(kite.colors[t.color]);
    return t.points.flatMap(() => [c.r, c.g, c.b]);
  });
  const paper = new BufferGeometry();
  paper.setAttribute("position", new Float32BufferAttribute(positions, 3));
  paper.setAttribute("color", new Float32BufferAttribute(colors, 3));
  paper.computeVertexNormals(); // not indexed, so each triangle is flat-shaded
  const mesh = new Mesh(paper, new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));

  const sparGeometry = new BufferGeometry();
  sparGeometry.setAttribute("position", new Float32BufferAttribute(KITE_SPARS.flatMap((s) => s.flat()), 3));
  const spars = new LineSegments(sparGeometry, new LineBasicMaterial({ color: SPAR_COLOR, transparent: true, opacity: 0.7 }));

  const stringGeometry = new BufferGeometry();
  stringGeometry.setAttribute("position", new BufferAttribute(new Float32Array(STRING_POINTS * 3), 3));
  const string = new Line(stringGeometry, new LineBasicMaterial({ color: STRING_COLOR, transparent: true, opacity: 0.55 }));
  string.frustumCulled = false; // its bounds change every frame
  return { mesh, spars, string };
}

const bridle = new Vector3();

function FlyingKite({ kite }: { kite: Kite }) {
  const group = useRef<Group>(null);
  const { mesh, spars, string } = useMemo(() => buildKite(kite), [kite]);
  const start = kitePose(kite, 0);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const pose = kitePose(kite, clock.elapsedTime);
    group.current.position.set(...pose.position);
    group.current.rotation.set(...pose.rotation);
    group.current.updateMatrixWorld();
    bridle.set(...KITE_SHAPE.bridle).applyMatrix4(group.current.matrixWorld);
    const attribute = string.geometry.getAttribute("position") as BufferAttribute;
    stringPoints([bridle.x, bridle.y, bridle.z], STRING_ANCHORS[kite.anchor]!).forEach((p, i) => attribute.setXYZ(i, ...p));
    attribute.needsUpdate = true;
  });

  return (
    <>
      <group ref={group} position={start.position} rotation={start.rotation} scale={kite.size}>
        <primitive object={mesh} />
        <primitive object={spars} />
      </group>
      <primitive object={string} />
    </>
  );
}

/** Follows the pointer a little, so nearer kites move more than distant ones. */
function Parallax() {
  useFrame(({ camera, pointer }, delta) => {
    const ease = Math.min(1, delta * 2);
    camera.position.x += (pointer.x * 0.8 - camera.position.x) * ease;
    camera.position.y += (pointer.y * 0.5 - camera.position.y) * ease;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function KiteScene({ active, onReady }: { active: boolean; onReady: () => void }) {
  return (
    <Canvas
      flat // no tone mapping: the colours stay the brand's
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, CAMERA.z], fov: CAMERA.fov, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      onCreated={() => requestAnimationFrame(onReady)} // after the first frame is drawn
    >
      <fog attach="fog" args={[FOG.color, FOG.near, FOG.far]} />
      <ambientLight intensity={LIGHT.ambient} />
      <directionalLight position={LIGHT.sunPosition} intensity={LIGHT.sun} />
      {KITES.map((kite, i) => (
        <FlyingKite key={i} kite={kite} />
      ))}
      <Parallax />
    </Canvas>
  );
}
