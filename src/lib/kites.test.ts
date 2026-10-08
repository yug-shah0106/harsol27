import { describe, expect, it } from "vitest";
import { KITES, kitePose, STRING_POINTS, stringPoints } from "./kites";

describe("kite scene data", () => {
  it("starts every kite exactly where the static picture draws it", () => {
    for (const kite of KITES) {
      const { position } = kitePose(kite, 0);
      expect(Math.abs(position[0] - kite.position[0])).toBeLessThan(0.25); // drift is small around its place
      expect(position[2]).toBe(kite.position[2]); // depth never changes, so the drawing order holds
      expect(kitePose(kite, 0)).toEqual(kitePose(kite, 0));
    }
  });

  it("runs each string from the kite to its flyer, sagging below the straight line", () => {
    const points = stringPoints([0, 2, 0], [4, -8, 2]);
    expect(points).toHaveLength(STRING_POINTS);
    expect(points[0]).toEqual([0, 2, 0]);
    expect(points.at(-1)).toEqual([4, -8, 2]);
    const middle = points[Math.floor(STRING_POINTS / 2)]!;
    expect(middle[1]).toBeLessThan(2 + ((middle[0] - 0) / 4) * -10); // below the chord
  });
});
