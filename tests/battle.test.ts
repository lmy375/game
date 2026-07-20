import { describe, it, expect } from "vitest";
import {
  BattleSimulator,
  EnemyAI,
  loadLevel,
  computeMoveRange,
  findPath,
  resolveHitCells,
  previewSkill,
  livingUnits,
  unitById,
  evaluateForEnemy,
  BattleAction,
  restHealAmount,
  predictTurnOrder,
} from "@core/index";
import { createRegistry, getLevel } from "@data/index";
import { castFirstDamagingSkill, makeState, makeUnit } from "./helpers";

const registry = createRegistry();

describe("移动范围与寻路", () => {
  it("空地上移动范围 = 曼哈顿菱形", () => {
    const u = makeUnit("player", { x: 4, y: 4 }, { stats: { hp: 100, attack: 20, magic: 30, defense: 0, moveRange: 2 } });
    const s = makeState(9, 9, [u]);
    const range = computeMoveRange(s, u.instanceId);
    expect(range.length).toBe(12); // 半径2的菱形去掉中心
  });

  it("墙体阻挡寻路绕行", () => {
    const u = makeUnit("player", { x: 0, y: 0 }, { stats: { hp: 100, attack: 20, magic: 30, defense: 0, moveRange: 9 } });
    const s = makeState(
      5,
      5,
      [u],
      [
        { x: 1, y: 0, terrain: "wall" },
        { x: 1, y: 1, terrain: "wall" },
      ]
    );
    const path = findPath(s, u.instanceId, { x: 2, y: 0 });
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(3); // 必须绕过墙
  });
});

describe("十字火焰：聚怪后 AOE", () => {
  it("中心格高伤 + 燃烧，四周格低伤", () => {
    const caster = makeUnit("player", { x: 0, y: 4 }, { skills: ["cross_fire"], stats: { hp: 100, attack: 10, magic: 100, defense: 0, moveRange: 3 } });
    const center = makeUnit("enemy", { x: 4, y: 4 }, { defId: "enemy_soldier", stats: { hp: 200, attack: 0, magic: 0, defense: 0, moveRange: 0 } });
    const arm = makeUnit("enemy", { x: 5, y: 4 }, { defId: "enemy_soldier", stats: { hp: 200, attack: 0, magic: 0, defense: 0, moveRange: 0 } });
    const state = makeState(9, 9, [caster, center, arm]);
    const sim = new BattleSimulator(registry);

    const res = sim.simulate(state, { type: "skill", actorId: caster.instanceId, skillId: "cross_fire", targetCell: { x: 4, y: 4 } });
    expect(res.ok).toBe(true);
    const c2 = unitById(res.nextState, center.instanceId)!;
    const a2 = unitById(res.nextState, arm.instanceId)!;
    expect(200 - c2.hp).toBe(150); // 100*1.5
    expect(200 - a2.hp).toBe(80); // 100*0.8
    expect(c2.statuses.some((s) => s.id === "burn")).toBe(true);
  });
});

describe("贯穿射击：直线多杀", () => {
  it("命中一条线上的所有敌人", () => {
    const caster = makeUnit("player", { x: 0, y: 2 }, { skills: ["pierce_shot"], stats: { hp: 100, attack: 100, magic: 0, defense: 0, moveRange: 3 } });
    const enemies = [1, 2, 3].map((dx) =>
      makeUnit("enemy", { x: dx, y: 2 }, { defId: "e", stats: { hp: 200, attack: 0, magic: 0, defense: 0, moveRange: 0 } })
    );
    const state = makeState(9, 9, [caster, ...enemies]);
    const { cells } = resolveHitCells(caster, registry.skill("pierce_shot"), registry, { direction: "right" });
    expect(cells.map((c) => c.pos.x).sort()).toEqual([1, 2, 3, 4]);

    const sim = new BattleSimulator(registry);
    const res = sim.simulate(state, { type: "skill", actorId: caster.instanceId, skillId: "pierce_shot", direction: "right" });
    for (const e of enemies) {
      expect(unitById(res.nextState, e.instanceId)!.hp).toBe(100); // 200 - 100
    }
  });
});

describe("狂风聚拢：为 AOE 创造阵型", () => {
  it("把 5×5 菱形内敌人聚拢进 3×3 菱形，被吹动者受中等伤害", () => {
    const caster = makeUnit("player", { x: 0, y: 4 }, { skills: ["gale_gather"] });
    const center = { x: 4, y: 4 };
    const e1 = makeUnit("enemy", { x: 5, y: 5 }, { defId: "e" }); // 距中心 2（5×5 菱形边角）
    const e2 = makeUnit("enemy", { x: 3, y: 3 }, { defId: "e" });
    const state = makeState(9, 9, [caster, e1, e2]);
    const sim = new BattleSimulator(registry);
    const before1 = e1.hp;
    const md = (p: { x: number; y: number }) => Math.abs(p.x - center.x) + Math.abs(p.y - center.y);
    const res = sim.simulate(state, { type: "skill", actorId: caster.instanceId, skillId: "gale_gather", targetCell: center });
    const n1 = unitById(res.nextState, e1.instanceId)!;
    const n2 = unitById(res.nextState, e2.instanceId)!;
    expect(md(n1.pos)).toBe(1); // 聚拢进 3×3 菱形（半径 1）
    expect(md(n2.pos)).toBe(1);
    expect(n1.hp).toBeLessThan(before1); // 移动过 → 中等伤害
  });

  it("教学连招：狂风聚拢后十字火焰命中全部敌人", () => {
    // 自带布局：风术士聚拢三名纵向散布的敌人，火法师再用十字火焰一网打尽。
    const wind = makeUnit("player", { x: 1, y: 4 }, { defId: "wind_mage", skills: ["gale_gather", "wind_blade"], stats: { magic: 30, moveRange: 4 } });
    const fire = makeUnit("player", { x: 2, y: 4 }, { defId: "fire_mage", skills: ["cross_fire"], stats: { magic: 40, moveRange: 4 } });
    const e1 = makeUnit("enemy", { x: 5, y: 2 }, { defId: "enemy_soldier", stats: { hp: 60, attack: 0, magic: 0, defense: 0, moveRange: 0 } });
    const e2 = makeUnit("enemy", { x: 5, y: 6 }, { defId: "enemy_soldier", stats: { hp: 60, attack: 0, magic: 0, defense: 0, moveRange: 0 } });
    const e3 = makeUnit("enemy", { x: 5, y: 4 }, { defId: "enemy_soldier", stats: { hp: 60, attack: 0, magic: 0, defense: 0, moveRange: 0 } });
    let state = makeState(9, 9, [wind, fire, e1, e2, e3]);
    const sim = new BattleSimulator(registry);

    // 风术士聚拢 (5,4)：(5,2)/(5,6) 被拉进 (5,4) 的菱形，发生位移。
    let res = sim.simulate(state, { type: "skill", actorId: wind.instanceId, skillId: "gale_gather", targetCell: { x: 5, y: 4 } });
    expect(res.ok).toBe(true);
    expect(res.events.some((e) => e.type === "unit_displaced")).toBe(true);
    state = res.nextState;

    // 切到火法师，十字火焰打向 (5,4)：中心+上下左右覆盖聚拢后的三人。
    const f = state.units.find((u) => u.defId === "fire_mage")!;
    state.activeUnitId = f.instanceId;
    state.turn = "player";
    f.movedThisTurn = false;
    f.actedThisTurn = false;
    res = sim.simulate(state, { type: "skill", actorId: f.instanceId, skillId: "cross_fire", targetCell: { x: 5, y: 4 } });
    expect(res.ok).toBe(true);
    const enemies = res.nextState.units.filter((u) => u.faction === "enemy");
    expect(enemies.every((e) => e.hp < e.maxHp)).toBe(true);
  });
});

describe("教学关卡先手", () => {
  it("第二关调试载入时玩家先行动，避免教学开始前先挨打", () => {
    const state = loadLevel(getLevel("level_002"), registry);
    const active = unitById(state, state.activeUnitId!)!;
    expect(active.faction).toBe("player");
    expect(active.defId).toBe("wind_mage");
  });
});

describe("推入危险地形", () => {
  it("横向推击把敌人推入火焰并受伤", () => {
    const caster = makeUnit("player", { x: 2, y: 4 }, { skills: ["push_wave"] });
    const enemy = makeUnit("enemy", { x: 3, y: 4 }, { defId: "e", stats: { hp: 80, attack: 0, magic: 0, defense: 0, moveRange: 0 } });
    const state = makeState(9, 9, [caster, enemy], [{ x: 5, y: 4, terrain: "fire" }]);
    const sim = new BattleSimulator(registry);
    const res = sim.simulate(state, { type: "skill", actorId: caster.instanceId, skillId: "push_wave", direction: "right" });
    const n = unitById(res.nextState, enemy.instanceId)!;
    expect(n.pos).toEqual({ x: 5, y: 4 }); // 被推 2 格进火焰
    expect(n.hp).toBe(60); // 火焰 20 伤害
    expect(res.events.some((e) => e.type === "terrain_triggered")).toBe(true);
  });
});

describe("预览不修改真实状态", () => {
  it("previewSkill 返回结果态但不动原状态", () => {
    const caster = makeUnit("player", { x: 0, y: 4 }, { skills: ["cross_fire"], stats: { hp: 100, attack: 0, magic: 100, defense: 0, moveRange: 3 } });
    const enemy = makeUnit("enemy", { x: 3, y: 4 }, { defId: "e", stats: { hp: 200, attack: 0, magic: 0, defense: 0, moveRange: 0 } });
    const state = makeState(9, 9, [caster, enemy]);
    const sim = new BattleSimulator(registry);
    const hpBefore = enemy.hp;
    const preview = previewSkill(state, sim, registry, caster.instanceId, "cross_fire", { cell: { x: 3, y: 4 } });
    expect(preview.hitCells.length).toBe(5);
    expect(unitById(preview.resultState, enemy.instanceId)!.hp).toBeLessThan(hpBefore);
    expect(unitById(state, enemy.instanceId)!.hp).toBe(hpBefore); // 原状态不变
  });
});

describe("回合与状态", () => {
  it("end_turn 切换阵营并结算燃烧", () => {
    const enemy = makeUnit("enemy", { x: 3, y: 4 }, { statuses: [{ id: "burn", duration: 2, magnitude: 10 }] });
    const player = makeUnit("player", { x: 0, y: 0 });
    const state = makeState(9, 9, [player, enemy]);
    const sim = new BattleSimulator(registry);
    const res = sim.simulate(state, { type: "end_turn" });
    expect(res.nextState.turn).toBe("enemy");
    expect(unitById(res.nextState, enemy.instanceId)!.hp).toBe(90); // 燃烧 10
  });

  it("回合开始燃烧致死时自动跳到下一个存活单位", () => {
    const current = makeUnit("enemy", { x: 4, y: 4 }, { instanceId: "current", ct: 100 });
    const doomed = makeUnit("player", { x: 0, y: 0 }, {
      instanceId: "doomed",
      hp: 5,
      ct: 100,
      statuses: [{ id: "burn", duration: 2, magnitude: 10 }],
    });
    const survivor = makeUnit("player", { x: 1, y: 0 }, { instanceId: "survivor", ct: 100 });
    const state = makeState(9, 9, [current, doomed, survivor]);
    const res = new BattleSimulator(registry).simulate(state, { type: "end_turn" });

    expect(unitById(res.nextState, "doomed")!.hp).toBe(0);
    expect(res.nextState.activeUnitId).toBe("survivor");
    expect(res.events.some((e) => e.type === "unit_died" && e.unitId === "doomed")).toBe(true);
  });

  it("行动顺序预测与真实推进在完全平局时使用同一 instanceId 规则", () => {
    const current = makeUnit("player", { x: 0, y: 0 }, { instanceId: "current", ct: 100 });
    const laterInArray = makeUnit("enemy", { x: 3, y: 0 }, { instanceId: "z-unit", ct: 100 });
    const lexicalFirst = makeUnit("enemy", { x: 2, y: 0 }, { instanceId: "a-unit", ct: 100 });
    const state = makeState(5, 5, [current, laterInArray, lexicalFirst]);

    expect(predictTurnOrder(state, 2)[1]).toBe("a-unit");
    const res = new BattleSimulator(registry).simulate(state, { type: "end_turn" });
    expect(res.nextState.activeUnitId).toBe("a-unit");
  });
});

describe("调息（rest）", () => {
  it("恢复 15% 最大生命并结束移动+技能行动", () => {
    const u = makeUnit("player", { x: 2, y: 2 }, { stats: { hp: 100, attack: 10, magic: 0, defense: 0, moveRange: 3 } });
    u.hp = 40;
    const state = makeState(9, 9, [u, makeUnit("enemy", { x: 7, y: 7 })]);
    const sim = new BattleSimulator(registry);
    const res = sim.simulate(state, { type: "rest", actorId: u.instanceId });
    expect(res.ok).toBe(true);
    const after = unitById(res.nextState, u.instanceId)!;
    expect(after.hp).toBe(40 + restHealAmount(100)); // +15
    expect(after.movedThisTurn).toBe(true);
    expect(after.actedThisTurn).toBe(true);
    expect(res.events.some((e) => e.type === "unit_healed" && e.amount === restHealAmount(100))).toBe(true);
  });

  it("恢复量按生命缺口截断，满血调息不产生治疗事件", () => {
    const hurt = makeUnit("player", { x: 2, y: 2 }, { stats: { hp: 100, attack: 10, magic: 0, defense: 0, moveRange: 3 } });
    hurt.hp = 95;
    const sim = new BattleSimulator(registry);
    const res1 = sim.simulate(makeState(9, 9, [hurt, makeUnit("enemy", { x: 7, y: 7 })]), { type: "rest", actorId: hurt.instanceId });
    const healEvt = res1.events.find((e) => e.type === "unit_healed");
    expect(healEvt && healEvt.type === "unit_healed" ? healEvt.amount : 0).toBe(5); // 缺口只有 5

    const full = makeUnit("player", { x: 2, y: 2 });
    const res2 = new BattleSimulator(registry).simulate(makeState(9, 9, [full, makeUnit("enemy", { x: 7, y: 7 })]), { type: "rest", actorId: full.instanceId });
    expect(res2.ok).toBe(true); // 仍可当作待机
    expect(res2.events.some((e) => e.type === "unit_healed")).toBe(false);
  });

  it("已用过技能后不可调息", () => {
    const u = makeUnit("player", { x: 2, y: 2 });
    u.actedThisTurn = true;
    u.hp = 50;
    const sim = new BattleSimulator(registry);
    const res = sim.simulate(makeState(9, 9, [u, makeUnit("enemy", { x: 7, y: 7 })]), { type: "rest", actorId: u.instanceId });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("已行动");
  });
});

describe("敌人 AI", () => {
  it("planTurn 返回以 end_turn 结尾的行动序列", () => {
    const state = loadLevel(getLevel("level_001"), registry);
    // 切到敌方回合
    const sim = new BattleSimulator(registry);
    const enemyTurn = sim.simulate(state, { type: "end_turn" }).nextState;
    const ai = new EnemyAI(registry, sim);
    const actions = ai.planTurn(enemyTurn);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[actions.length - 1]).toEqual<BattleAction>({ type: "end_turn" });
  });

  it("评分器惩罚扎堆（敌人不愿成为 AOE 靶子）", () => {
    const player = makeUnit("player", { x: 0, y: 0 });
    const spread = makeState(10, 10, [player, makeUnit("enemy", { x: 5, y: 2 }), makeUnit("enemy", { x: 8, y: 7 })]);
    const clustered = makeState(10, 10, [player, makeUnit("enemy", { x: 5, y: 5 }), makeUnit("enemy", { x: 5, y: 6 })]);
    expect(evaluateForEnemy(spread)).toBeGreaterThan(evaluateForEnemy(clustered));
  });

  it("当前敌方单位会靠近玩家", () => {
    const enemy = makeUnit("enemy", { x: 9, y: 5 }, { defId: "enemy_soldier", aiProfile: "melee", skills: ["cleave"], stats: { hp: 80, attack: 18, magic: 0, defense: 6, moveRange: 3 } });
    const player = makeUnit("player", { x: 2, y: 5 }, { skills: ["sweep"] });
    const state = makeState(12, 12, [enemy, player]); // enemy 为 units[0]，即当前行动单位
    const sim = new BattleSimulator(registry);
    const ai = new EnemyAI(registry, sim);
    let working = state;
    for (const act of ai.planTurn(state)) {
      const r = sim.simulate(working, act);
      if (r.ok) working = r.nextState;
    }
    const moved = unitById(working, enemy.instanceId)!;
    expect(Math.abs(moved.pos.x - player.pos.x)).toBeLessThan(9 - 2); // 比初始更近
  });
});

describe("完整对局可推进（速度初动）", () => {
  it("逐个单位按速度行动直至分出胜负", () => {
    let state = loadLevel(getLevel("level_001"), registry);
    const sim = new BattleSimulator(registry);
    const ai = new EnemyAI(registry, sim);

    let guard = 0;
    while (!state.outcome && guard++ < 500) {
      const actor = state.activeUnitId ? unitById(state, state.activeUnitId) : undefined;
      if (!actor) break;

      if (actor.faction === "enemy") {
        for (const act of ai.planTurn(state)) {
          const r = sim.simulate(state, act);
          if (r.ok) state = r.nextState;
          if (state.outcome) break;
        }
        continue;
      }

      // 玩家单位简单策略：靠近最近敌人，放第一个能伤敌的技能，然后结束行动。
      const enemies = livingUnits(state, "enemy");
      if (enemies.length === 0) break;
      const target = enemies[0];
      if (!actor.movedThisTurn) {
        const range = computeMoveRange(state, actor.instanceId);
        range.sort(
          (p, q) =>
            Math.abs(p.x - target.pos.x) + Math.abs(p.y - target.pos.y) -
            (Math.abs(q.x - target.pos.x) + Math.abs(q.y - target.pos.y))
        );
        if (range.length) {
          const r = sim.simulate(state, { type: "move", actorId: actor.instanceId, moveTo: range[0] });
          if (r.ok) state = r.nextState;
        }
      }
      state = castFirstDamagingSkill(state, sim, actor.instanceId);
      state = sim.simulate(state, { type: "end_turn" }).nextState;
    }
    expect(state.outcome).not.toBeNull();
  });
});
