// The home page's 3D scene: Uttarayan, Gujarat's kite festival. Paper kites (patang) drift in a
// pale sky, their strings running down to the rooftops below the frame. Many businesses, one sky.
//
// Everything is generated from this data: no model files to download. The same data draws both the
// live 3D scene (components/hero/kite-scene.tsx) and the static picture sent with the page
// (components/hero/kite-poster.tsx), so the two match and the switch between them is seamless.

type Vec3 = readonly [number, number, number];

export type Kite = {
  position: Vec3;
  size: number;
  /** Lean to the side, in radians. */
  tilt: number;
  /** Left half, right half (and tail). */
  colors: readonly [string, string];
  /** Offsets this kite's drifting so no two move together. */
  phase: number;
  /** Which flyer on the ground holds the string (index into STRING_ANCHORS). */
  anchor: number;
};

export const PALETTE = {
  indigo: "#1f3a68",
  saffron: "#f6b44a",
  rani: "#c2185b",
  leaf: "#2e7d4f",
  ivory: "#fbf8f3",
  vermilion: "#d9472b",
} as const;
const { indigo, saffron, rani, leaf, ivory, vermilion } = PALETTE;

export const KITES: readonly Kite[] = [
  { position: [-1.55, 1.25, 1.2], size: 1.1, tilt: 0.3, colors: [indigo, saffron], phase: 0, anchor: 0 },
  { position: [1.55, 1.95, -1.2], size: 1.0, tilt: -0.32, colors: [saffron, rani], phase: 1.3, anchor: 0 },
  { position: [0.55, -0.7, 2.4], size: 0.85, tilt: 0.14, colors: [ivory, indigo], phase: 2.1, anchor: 2 },
  { position: [-2.75, -1.05, -2], size: 0.95, tilt: -0.2, colors: [leaf, saffron], phase: 3.4, anchor: 1 },
  { position: [2.6, -0.45, -0.2], size: 0.85, tilt: 0.42, colors: [rani, ivory], phase: 4.2, anchor: 0 },
  { position: [-0.45, 3.25, -4.5], size: 0.9, tilt: -0.1, colors: [vermilion, saffron], phase: 5, anchor: 1 },
  { position: [3.7, 3.7, -7], size: 1.0, tilt: 0.24, colors: [indigo, leaf], phase: 0.7, anchor: 0 },
  { position: [-3.9, 3.5, -6], size: 1.0, tilt: -0.36, colors: [saffron, indigo], phase: 2.8, anchor: 1 },
  { position: [1.25, 0.95, -8], size: 1.0, tilt: 0.06, colors: [ivory, vermilion], phase: 3.9, anchor: 2 },
];

/** Where the strings end: flyers on rooftops below and in front of the frame. */
export const STRING_ANCHORS: readonly Vec3[] = [
  [5.5, -9, 4],
  [-6, -9.5, 3],
  [1.5, -10, 6],
];

/**
 * One kite, 1 unit tall, facing the viewer (+z). The wing tips are bent back by the bow spar, which
 * is what gives the two halves different shading in the light.
 */
export const KITE_SHAPE = {
  top: [0, 0.62, 0],
  right: [0.52, 0.06, -0.14],
  bottom: [0, -0.52, 0],
  left: [-0.52, 0.06, -0.14],
  bowMiddle: [0, 0.2, 0.04],
  tail: [
    [0, -0.52, 0],
    [-0.14, -0.78, 0],
    [0.14, -0.78, 0],
  ],
  bridle: [0, 0, 0.02], // where the string is tied
} as const satisfies Record<string, Vec3 | readonly Vec3[]>;

export const SPAR_COLOR = "#4a3b33";
export const STRING_COLOR = "#6b5a4e";
export const STRING_POINTS = 16;

export const CAMERA = { z: 10, fov: 38 } as const;
export const FOG = { color: "#e9eef5", near: 9, far: 24 } as const; // distant kites fade into the sky
export const LIGHT = { ambient: 2.1, sun: 1.7, sunPosition: [4, 6, 8] as Vec3 } as const;

/** Where a kite is, and how it is turned, `t` seconds into the animation. t = 0 is the static picture. */
export function kitePose(kite: Kite, t: number): { position: Vec3; rotation: Vec3 } {
  const [x, y, z] = kite.position;
  const p = kite.phase;
  return {
    position: [x + Math.sin(t * 0.45 + p) * 0.22, y + Math.sin(t * 0.8 + p * 1.7) * 0.16, z],
    rotation: [-0.22 + Math.sin(t * 0.6 + p) * 0.06, Math.sin(t * 0.5 + p * 1.3) * 0.35, kite.tilt + Math.sin(t * 1.1 + p) * 0.12],
  };
}

/** The string from a kite's bridle to its flyer, sagging slightly: STRING_POINTS points. */
export function stringPoints(from: Vec3, to: Vec3): Vec3[] {
  const control: Vec3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 - 0.9, (from[2] + to[2]) / 2];
  return Array.from({ length: STRING_POINTS }, (_, i) => {
    const s = i / (STRING_POINTS - 1);
    const a = (1 - s) * (1 - s);
    const b = 2 * (1 - s) * s;
    const c = s * s;
    return [a * from[0] + b * control[0] + c * to[0], a * from[1] + b * control[1] + c * to[1], a * from[2] + b * control[2] + c * to[2]] as const;
  });
}

const { top, right, bottom, left, bowMiddle, tail } = KITE_SHAPE;
/** The paper: two halves in the kite's two colours, and the tail in the second. Front faces +z. */
export const KITE_TRIANGLES = [
  { points: [top, left, bottom], color: 0 },
  { points: [top, bottom, right], color: 1 },
  { points: tail, color: 1 },
] as const;
/** The bamboo: the spine, and the bow in two segments. */
export const KITE_SPARS = [
  [top, bottom],
  [left, bowMiddle],
  [bowMiddle, right],
] as const;
