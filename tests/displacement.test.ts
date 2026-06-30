import { describe, it, expect } from "vitest";
import {
  applyPush,
  applyPullToCenter,
  applyKnockback,
  applySwap,
  applyArrangeLine,
  BattleEvent,
} from "@core/index";
import { makeState, makeUnit } from "./helpers";

describe("位移：push", () => {
  it("正常推开 2 格", () => {
    const u = makeUnit("enemy", { x: 2, y: 2 });
    const s = makeState(8, 8, [u]);
    const events: BattleEvent[] = [];
    const r = applyPush(s, u, "right", 2, events);
    expect(r.moved).toBe(2);
    expect(u.pos).toEqual({ x: 4, y: 2 });
  });

  it("遇墙停止", () => {
    const u = makeUnit("enemy", { x: 2, y: 2 });
    const s = makeState(8, 8, [u], [{ x: 4, y: 2, terrain: "wall" }]);
    const events: BattleEvent[] = [];
    const r = applyPush(s, u, "right", 3, events);
    expect(r.moved).toBe(1); // 停在墙前 (3,2)
    expect(u.pos).toEqual({ x: 3, y: 2 });
    expect(r.blocked).toBe("wall");
  });

  it("被其他单位阻挡", () => {
    const u = makeUnit("enemy", { x: 2, y: 2 });
    const block = makeUnit("enemy", { x: 3, y: 2 });
    const s = makeState(8, 8, [u, block]);
    const events: BattleEvent[] = [];
    const r = applyPush(s, u, "right", 3, events);
    expect(r.moved).toBe(0);
    expect(r.blocked).toBe("occupied");
  });

  it("被推出边界则停在边界内", () => {
    const u = makeUnit("enemy", { x: 6, y: 2 });
    const s = makeState(8, 8, [u]);
    const events: BattleEvent[] = [];
    const r = applyPush(s, u, "right", 5, events);
    expect(u.pos).toEqual({ x: 7, y: 2 });
    expect(r.blocked).toBe("edge");
  });
});

describe("位移：pull_to_center 聚拢", () => {
  it("向中心拉近但不越过中心", () => {
    const center = { x: 4, y: 4 };
    const u = makeUnit("enemy", { x: 7, y: 4 });
    const s = makeState(8, 8, [u]);
    const events: BattleEvent[] = [];
    applyPullToCenter(s, u, center, 2, events);
    expect(u.pos).toEqual({ x: 5, y: 4 }); // 拉近 2 格，停在中心右侧
  });

  it("距离 maxDistance 限制", () => {
    const center = { x: 0, y: 4 };
    const u = makeUnit("enemy", { x: 7, y: 4 });
    const s = makeState(8, 8, [u]);
    applyPullToCenter(s, u, center, 2, []);
    expect(u.pos).toEqual({ x: 5, y: 4 });
  });
});

describe("位移：knockback 撞墙伤害", () => {
  it("撞墙造成额外伤害", () => {
    const u = makeUnit("enemy", { x: 5, y: 2 }, { hp: 50 });
    const s = makeState(8, 8, [u], [{ x: 7, y: 2, terrain: "wall" }]);
    const events: BattleEvent[] = [];
    const r = applyKnockback(s, u, "right", 3, 15, events);
    expect(u.pos).toEqual({ x: 6, y: 2 });
    expect(r.blocked).toBe("wall");
    expect(u.hp).toBe(35);
    expect(events.some((e) => e.type === "collision_damage")).toBe(true);
  });
});

describe("位移：swap 换位", () => {
  it("交换两单位位置", () => {
    const a = makeUnit("player", { x: 1, y: 1 });
    const b = makeUnit("enemy", { x: 4, y: 4 });
    const s = makeState(8, 8, [a, b]);
    expect(applySwap(s, a, b, [])).toBe(true);
    expect(a.pos).toEqual({ x: 4, y: 4 });
    expect(b.pos).toEqual({ x: 1, y: 1 });
  });
});

describe("位移：arrange_line 整队", () => {
  it("把分散的敌人排成一列", () => {
    const e1 = makeUnit("enemy", { x: 3, y: 5 });
    const e2 = makeUnit("enemy", { x: 6, y: 2 });
    const e3 = makeUnit("enemy", { x: 2, y: 7 });
    const s = makeState(10, 10, [e1, e2, e3]);
    const anchor = { x: 4, y: 4 };
    applyArrangeLine(s, [e1, e2, e3], anchor, "up", 3, []);
    // 沿 up 从 anchor 起：(4,4),(4,5),(4,6)
    const xs = [e1, e2, e3].map((u) => u.pos.x);
    expect(xs.every((x) => x === 4)).toBe(true);
    const ys = [e1, e2, e3].map((u) => u.pos.y).sort();
    expect(ys).toEqual([4, 5, 6]);
  });
});
