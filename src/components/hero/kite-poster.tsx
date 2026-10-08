import { Color, Euler, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { CAMERA, FOG, KITE_SHAPE, KITE_SPARS, KITE_TRIANGLES, KITES, kitePose, LIGHT, SPAR_COLOR, STRING_ANCHORS, STRING_COLOR, stringPoints } from "@/lib/kites";

// The kite scene's first frame as an SVG, drawn on the server with the same camera, light and fog
// as the 3D version. It is part of the page HTML (no request), shows instantly, and is all that
// visitors see on slow devices, without WebGL, or when they prefer reduced motion.

const SIZE = 1000;
const camera = new PerspectiveCamera(CAMERA.fov, 1, 0.1, 60);
camera.position.set(0, 0, CAMERA.z);
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld();

const sun = new Vector3(...LIGHT.sunPosition).normalize();
const fogColor = new Color(FOG.color);
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const toSvg = (v: Vector3) => {
  const p = v.clone().project(camera);
  return `${(((p.x + 1) / 2) * SIZE).toFixed(1)},${(((1 - p.y) / 2) * SIZE).toFixed(1)}`;
};

/** Three.js's Lambert shading and linear fog, done by hand for one flat triangle. */
function shade(hex: string, [a, b, c]: Vector3[]): string {
  const normal = new Vector3().subVectors(b!, a!).cross(new Vector3().subVectors(c!, a!)).normalize();
  if (normal.dot(new Vector3().subVectors(camera.position, a!)) < 0) normal.negate(); // seen from behind
  const light = (LIGHT.ambient + LIGHT.sun * Math.max(0, normal.dot(sun))) / Math.PI;
  const depth = CAMERA.z - (a!.z + b!.z + c!.z) / 3;
  return `#${new Color(hex).multiplyScalar(light).lerp(fogColor, smoothstep(FOG.near, FOG.far, depth)).getHexString()}`;
}

function drawKites() {
  return KITES.map((kite, index) => {
    const pose = kitePose(kite, 0);
    const matrix = new Matrix4().compose(
      new Vector3(...pose.position),
      new Quaternion().setFromEuler(new Euler(...pose.rotation)),
      new Vector3(kite.size, kite.size, kite.size),
    );
    const world = (p: readonly [number, number, number]) => new Vector3(...p).applyMatrix4(matrix);
    const bridle = world(KITE_SHAPE.bridle);
    return {
      index,
      depth: pose.position[2],
      string: stringPoints([bridle.x, bridle.y, bridle.z], STRING_ANCHORS[kite.anchor]!).map((p) => toSvg(new Vector3(...p))).join(" "),
      paper: KITE_TRIANGLES.map((t) => {
        const points = t.points.map(world);
        return { points: points.map(toSvg).join(" "), fill: shade(kite.colors[t.color], points) };
      }),
      spars: KITE_SPARS.map(([from, to]) => [toSvg(world(from)), toSvg(world(to))].join(" ")),
    };
  }).sort((a, b) => a.depth - b.depth); // far to near: SVG paints in order
}

const KITE_DRAWINGS = drawKites(); // the same for every request

export function KitePoster() {
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full" focusable="false" aria-hidden="true">
      {KITE_DRAWINGS.map((kite) => (
        <g key={kite.index}>
          <polyline points={kite.string} fill="none" stroke={STRING_COLOR} strokeOpacity={0.55} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          {kite.paper.map((tri, i) => (
            <polygon key={i} points={tri.points} fill={tri.fill} />
          ))}
          {kite.spars.map((points, i) => (
            <polyline key={i} points={points} fill="none" stroke={SPAR_COLOR} strokeOpacity={0.7} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      ))}
    </svg>
  );
}
