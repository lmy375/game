import { describe, it, expect } from "vitest";
import { rotateOffset, resolvePattern, PatternDef } from "@core/index";
import { directionTo, manhattan } from "@core/index";

describe("rotateOffset", () => {
  it("up 不旋转", () => {
    expect(rotateOffset({ dx: 0, dy: 1 }, "up")).toEqual({ dx: 0, dy: 1 });
  });
  it("right 顺时针 90°：上方向变右方向", () => {
    expect(rotateOffset({ dx: 0, dy: 1 }, "right")).toEqual({ dx: 1, dy: 0 });
  });
  it("down 翻转 180°", () => {
    expect(rotateOffset({ dx: 0, dy: 1 }, "down")).toEqual({ dx: 0, dy: -1 });
  });
  it("left 逆时针 90°", () => {
    expect(rotateOffset({ dx: 0, dy: 1 }, "left")).toEqual({ dx: -1, dy: 0 });
  });
  it("旋转保持距离不变", () => {
    const o = { dx: 1, dy: 2 };
    for (const d of ["up", "down", "left", "right"] as const) {
      const r = rotateOffset(o, d);
      expect(Math.abs(r.dx) + Math.abs(r.dy)).toBe(3);
    }
  });
});

describe("resolvePattern", () => {
  const line: PatternDef = {
    id: "l",
    anchor: "caster_direction",
    rotatable: true,
    cells: [
      { dx: 0, dy: 1, effectKey: "p" },
      { dx: 0, dy: 2, effectKey: "p" },
    ],
  };
  it("朝右释放时直线沿 x 轴展开", () => {
    const cells = resolvePattern(line, { x: 3, y: 3 }, "right");
    expect(cells.map((c) => c.pos)).toEqual([
      { x: 4, y: 3 },
      { x: 5, y: 3 },
    ]);
  });
  it("不可旋转的 Pattern 忽略方向", () => {
    const cross: PatternDef = {
      id: "c",
      anchor: "target",
      rotatable: false,
      cells: [{ dx: 1, dy: 0, effectKey: "a" }],
    };
    expect(resolvePattern(cross, { x: 0, y: 0 }, "down")[0].pos).toEqual({ x: 1, y: 0 });
  });
});

describe("方向与距离", () => {
  it("directionTo 取主轴", () => {
    expect(directionTo({ x: 0, y: 0 }, { x: 3, y: 1 })).toBe("right");
    expect(directionTo({ x: 0, y: 0 }, { x: 1, y: 3 })).toBe("up");
  });
  it("manhattan", () => {
    expect(manhattan({ x: 0, y: 0 }, { x: 2, y: 3 })).toBe(5);
  });
});
