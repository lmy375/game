import { describe, it, expect } from "vitest";
import { computeMoveRange, findPath, applyPush, applyKnockback, BattleEvent } from "@core/index";
import { makeUnit, makeStateFromLayout } from "./helpers";

const has = (cells: { x: number; y: number }[], x: number, y: number) => cells.some((p) => p.x === x && p.y === y);

describe("寻路与位移:void(空气)规避", () => {
  it("computeMoveRange 不含 void 格,也不含被 void 隔断的格", () => {
    // 左右两块陆地,中间整列 void 隔断(单位 moveRange=4,足以覆盖右侧若可达)
    const layout = [
      "..~..",
      "..~..",
      "..~..",
    ];
    const u = makeUnit("player", { x: 0, y: 1 });
    const state = makeStateFromLayout(layout, [u]);
    const range = computeMoveRange(state, u.instanceId);
    expect(has(range, 2, 0)).toBe(false); // void 本体
    expect(has(range, 2, 1)).toBe(false);
    expect(has(range, 3, 1)).toBe(false); // 被隔断的右侧陆地
    expect(has(range, 4, 2)).toBe(false);
    expect(has(range, 1, 0)).toBe(true); // 左侧陆地可达
    expect(has(range, 1, 2)).toBe(true);
  });

  it("findPath 绕行内部 void 洞", () => {
    const layout = [
      ".....",
      ".~~~.",
      ".....",
    ];
    const u = makeUnit("player", { x: 0, y: 1 }, { stats: { moveRange: 10 } });
    const state = makeStateFromLayout(layout, [u]);
    const path = findPath(state, u.instanceId, { x: 4, y: 1 });
    expect(path).not.toBeNull();
    // 路径不得踏入 void 行(y=1 的 x∈[1,3])
    for (const p of path!) {
      expect(state.board.terrainAt(p)).not.toBe("void");
    }
    // 必须绕行:长度大于直线曼哈顿距离 4+1
    expect(path!.length).toBeGreaterThan(5);
  });

  it("findPath 目标是 void 时返回 null", () => {
    const layout = ["..~"];
    const u = makeUnit("player", { x: 0, y: 0 });
    const state = makeStateFromLayout(layout, [u]);
    expect(findPath(state, u.instanceId, { x: 2, y: 0 })).toBeNull();
  });

  it("推向盘内 void:停在崖边,blocked=wall", () => {
    const layout = ["..~."];
    const u = makeUnit("player", { x: 0, y: 0 });
    const state = makeStateFromLayout(layout, [u]);
    const events: BattleEvent[] = [];
    const res = applyPush(state, u, "right", 3, events);
    expect(res.finalPos).toEqual({ x: 1, y: 0 });
    expect(res.moved).toBe(1);
    expect(res.blocked).toBe("wall");
  });

  it("击退撞上 void 崖沿:吃碰撞伤害,与撞墙一致", () => {
    const layout = ["..~."];
    const u = makeUnit("player", { x: 0, y: 0 });
    const state = makeStateFromLayout(layout, [u]);
    const events: BattleEvent[] = [];
    const res = applyKnockback(state, u, "right", 3, 15, events);
    expect(res.finalPos).toEqual({ x: 1, y: 0 });
    expect(u.hp).toBe(u.maxHp - 15);
    expect(events.some((e) => e.type === "collision_damage")).toBe(true);
  });
});
