import { describe, it, expect } from "vitest";
import {
  ContentRegistry,
  PatternDef,
  SkillDef,
  Position,
  key,
  manhattan,
  computeThreatCells,
  skillThreatOffsets,
} from "@core/index";
import { makeState, makeUnit } from "./helpers";

/** 迷你内容表：pattern/技能完全可控，逐格断言威胁范围。 */
const PATTERNS: PatternDef[] = [
  // 单格（目标格本身）
  { id: "p_single", anchor: "target", rotatable: false, cells: [{ dx: 0, dy: 0, effectKey: "all" }] },
  // 沿释放方向的 4 格直线（贯穿类）
  {
    id: "p_line4",
    anchor: "caster_direction",
    rotatable: true,
    cells: [1, 2, 3, 4].map((dy) => ({ dx: 0, dy, effectKey: "all" })),
  },
  // 目标格十字（AOE 越出施法距离）
  {
    id: "p_cross",
    anchor: "target",
    rotatable: false,
    cells: [
      { dx: 0, dy: 0, effectKey: "center" },
      { dx: 1, dy: 0, effectKey: "arm" },
      { dx: -1, dy: 0, effectKey: "arm" },
      { dx: 0, dy: 1, effectKey: "arm" },
      { dx: 0, dy: -1, effectKey: "arm" },
    ],
  },
  // 自身格起、沿朝向的 2 格短线（self + rotatable：朝向不可预测）
  {
    id: "p_facing2",
    anchor: "caster_direction",
    rotatable: true,
    cells: [1, 2].map((dy) => ({ dx: 0, dy, effectKey: "all" })),
  },
];

const SKILLS: SkillDef[] = [
  {
    id: "s_strike",
    name: "近击",
    description: "",
    castRange: { type: "distance", min: 1, max: 1 },
    patternId: "p_single",
    targetType: "cell",
    cooldown: 0,
    cellEffects: { all: [{ type: "damage", element: "physical", multiplier: 1 }] },
  },
  {
    id: "s_pierce",
    name: "贯穿",
    description: "",
    castRange: { type: "direction" },
    patternId: "p_line4",
    targetType: "direction",
    cooldown: 0,
    cellEffects: { all: [{ type: "damage", element: "physical", multiplier: 1 }] },
  },
  {
    id: "s_fireball",
    name: "火球",
    description: "",
    castRange: { type: "distance", min: 1, max: 2 },
    patternId: "p_cross",
    targetType: "cell",
    cooldown: 0,
    cellEffects: { all: [{ type: "damage", element: "fire", multiplier: 1 }] },
  },
  {
    id: "s_heal",
    name: "治疗",
    description: "",
    castRange: { type: "distance", min: 0, max: 3 },
    patternId: "p_single",
    targetType: "cell",
    targetFilter: "ally",
    cooldown: 0,
    cellEffects: { all: [{ type: "heal", multiplier: 1 }] },
  },
  {
    id: "s_lunge",
    name: "突刺",
    description: "",
    castRange: { type: "self" },
    patternId: "p_facing2",
    targetType: "cell",
    cooldown: 0,
    cellEffects: { all: [{ type: "damage", element: "physical", multiplier: 1 }] },
  },
];

const registry = new ContentRegistry().addPatterns(PATTERNS).addSkills(SKILLS);

const keys = (cells: Position[]) => new Set(cells.map(key));

describe("威胁范围计算（computeThreatCells / skillThreatOffsets）", () => {
  it("近战敌人：moveCells = 当前格∪可达菱形，attackCells = 外一圈且与 moveCells 无交集", () => {
    const e = makeUnit("enemy", { x: 4, y: 4 }, { skills: ["s_strike"], stats: { moveRange: 1 } });
    const t = computeThreatCells(makeState(9, 9, [e]), registry);

    // 当前格 + 半径 1 菱形 = 5 格
    expect(t.moveCells.length).toBe(5);
    expect(keys(t.moveCells).has(key({ x: 4, y: 4 }))).toBe(true);
    // 攻击延伸 = 曼哈顿距离恰为 2 的一圈（8 格）
    expect(t.attackCells.length).toBe(8);
    for (const p of t.attackCells) expect(manhattan(p, { x: 4, y: 4 })).toBe(2);
    // 两层互斥
    const mv = keys(t.moveCells);
    for (const p of t.attackCells) expect(mv.has(key(p))).toBe(false);
  });

  it("direction 直线技能：威胁沿四方向延伸整条线长（回归：不得只算前方第一格）", () => {
    const e = makeUnit("enemy", { x: 4, y: 4 }, { skills: ["s_pierce"], stats: { moveRange: 0 } });
    const t = computeThreatCells(makeState(9, 9, [e]), registry);

    expect(t.moveCells.length).toBe(1); // 只有当前格
    const atk = keys(t.attackCells);
    // 四方向各 4 格 = 16 格，全在界内
    expect(t.attackCells.length).toBe(16);
    expect(atk.has(key({ x: 4, y: 8 }))).toBe(true); // 上方最远端
    expect(atk.has(key({ x: 8, y: 4 }))).toBe(true);
    expect(atk.has(key({ x: 4, y: 0 }))).toBe(true);
    expect(atk.has(key({ x: 0, y: 4 }))).toBe(true);
  });

  it("distance AOE：pattern 十字延伸使攻击格超出施法距离上限", () => {
    const e = makeUnit("enemy", { x: 4, y: 4 }, { skills: ["s_fireball"], stats: { moveRange: 0 } });
    const t = computeThreatCells(makeState(9, 9, [e]), registry);

    const atk = keys(t.attackCells);
    // 目标 (4,6)（距离 2）的十字臂 (4,7)：距施法者 3 > castRange.max=2
    expect(atk.has(key({ x: 4, y: 7 }))).toBe(true);
    // 但十字臂最多延伸 1 格：距离 4 的格子不可能被命中
    expect(atk.has(key({ x: 4, y: 8 }))).toBe(false);
  });

  it("self + rotatable pattern：朝向不可预测，威胁取四方向并集", () => {
    const e = makeUnit("enemy", { x: 4, y: 4 }, { skills: ["s_lunge"], stats: { moveRange: 0 }, facing: "up" });
    const t = computeThreatCells(makeState(9, 9, [e]), registry);

    const atk = keys(t.attackCells);
    for (const p of [
      { x: 4, y: 6 },
      { x: 4, y: 2 },
      { x: 6, y: 4 },
      { x: 2, y: 4 },
    ]) {
      expect(atk.has(key(p))).toBe(true);
    }
  });

  it("治疗技能（targetFilter: ally）不计入威胁", () => {
    const e = makeUnit("enemy", { x: 4, y: 4 }, { skills: ["s_heal"], stats: { moveRange: 1 } });
    const t = computeThreatCells(makeState(9, 9, [e]), registry);
    expect(t.attackCells.length).toBe(0);
    expect(t.moveCells.length).toBe(5); // 移动层照常
  });

  it("墙体与单位阻挡缩小可达格，出界格被裁剪", () => {
    const e = makeUnit("enemy", { x: 0, y: 0 }, { skills: ["s_strike"], stats: { moveRange: 2 } });
    const blocker = makeUnit("player", { x: 1, y: 0 }, { stats: { moveRange: 0 } });
    const state = makeState(5, 5, [e, blocker], [{ x: 0, y: 1, terrain: "wall" }]);
    const t = computeThreatCells(state, registry);

    const mv = keys(t.moveCells);
    // 右被玩家挡、上被墙挡 → 只能站在原地
    expect(t.moveCells.length).toBe(1);
    expect(mv.has(key({ x: 0, y: 0 }))).toBe(true);
    // 所有威胁格都在界内
    for (const p of [...t.moveCells, ...t.attackCells]) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(5);
      expect(p.y).toBeLessThan(5);
    }
    // 玩家占位格不可站立，但可被攻击（在 attackCells 中）
    expect(mv.has(key({ x: 1, y: 0 }))).toBe(false);
    expect(keys(t.attackCells).has(key({ x: 1, y: 0 }))).toBe(true);
  });

  it("只统计指定阵营：玩家单位与阵亡敌人不贡献威胁", () => {
    const dead = makeUnit("enemy", { x: 2, y: 2 }, { skills: ["s_pierce"], hp: 0 });
    const player = makeUnit("player", { x: 6, y: 6 }, { skills: ["s_pierce"] });
    const e = makeUnit("enemy", { x: 4, y: 4 }, { skills: ["s_strike"], stats: { moveRange: 1 } });
    const t = computeThreatCells(makeState(9, 9, [e, dead, player]), registry);

    const all = keys([...t.moveCells, ...t.attackCells]);
    expect(all.has(key({ x: 2, y: 6 }))).toBe(false); // 死敌的贯穿线
    expect(all.has(key({ x: 6, y: 8 }))).toBe(false); // 玩家的贯穿线
  });

  it("skillThreatOffsets 按 SkillDef 缓存（二次调用返回同一数组）", () => {
    const skill = registry.skill("s_fireball");
    const a = skillThreatOffsets(skill, registry);
    const b = skillThreatOffsets(skill, registry);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });
});
