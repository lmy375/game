import { describe, it, expect } from "vitest";
import {
  BattleAction,
  BattleSimulator,
  BattleState,
  EnemyAI,
  Position,
  computeMoveRange,
  directionTo,
  livingUnits,
  unitById,
} from "@core/index";
import { createRegistry, levels } from "@data/index";
import { loadMetaTables, initialSaveData } from "@data/metaIndex";
import { applyRewards, buildBattleState, computeRewards } from "@meta/index";

const registry = createRegistry();
const tables = loadMetaTables();

/**
 * 贪心玩家 bot：枚举「站位 × 技能 × 目标」，选净收益（敌方总掉血 + 击杀加成）最高的组合；
 * 打不到人则向最近敌人推进。比朴素 bot 强、比真人弱，用作战役数值下限验证。
 */
function greedyPlayerActions(state: BattleState, sim: BattleSimulator, actorId: string): BattleAction[] {
  const actor = unitById(state, actorId);
  if (!actor) return [{ type: "end_turn" }];
  const enemies = livingUnits(state, "enemy");
  if (enemies.length === 0) return [{ type: "end_turn" }];

  const enemyHpSum = (s: BattleState) => livingUnits(s, "enemy").reduce((acc, e) => acc + e.hp, 0);
  const enemyCount = (s: BattleState) => livingUnits(s, "enemy").length;
  const baseHp = enemyHpSum(state);
  const baseCount = enemyCount(state);

  const stands: Position[] = [{ ...actor.pos }, ...computeMoveRange(state, actorId)];
  let best: { actions: BattleAction[]; score: number } | null = null;

  for (const stand of stands) {
    const moveActions: BattleAction[] =
      stand.x === actor.pos.x && stand.y === actor.pos.y ? [] : [{ type: "move", actorId, moveTo: { ...stand } }];
    let afterMove = state;
    let ok = true;
    for (const a of moveActions) {
      const r = sim.simulate(afterMove, a);
      if (!r.ok) {
        ok = false;
        break;
      }
      afterMove = r.nextState;
    }
    if (!ok) continue;
    const me = unitById(afterMove, actorId)!;

    for (const skillId of me.skills) {
      const candidates: BattleAction[] = livingUnits(afterMove, "enemy").flatMap((e) => [
        { type: "skill" as const, actorId, skillId, targetCell: { ...e.pos } },
        { type: "skill" as const, actorId, skillId, direction: directionTo(me.pos, e.pos) },
        { type: "skill" as const, actorId, skillId, targetUnitId: e.instanceId, targetCell: { ...e.pos } },
      ]);
      candidates.push({ type: "skill", actorId, skillId, targetCell: { ...me.pos } });
      for (const act of candidates) {
        const r = sim.simulate(afterMove, act);
        if (!r.ok) continue;
        const dmg = baseHp - enemyHpSum(r.nextState);
        const kills = baseCount - enemyCount(r.nextState);
        if (dmg <= 0) continue;
        const score = dmg + kills * 60;
        if (!best || score > best.score) best = { actions: [...moveActions, act], score };
      }
    }
  }

  if (best) return best.actions;

  // 打不到任何人：向最近敌人推进。
  const target = enemies.reduce((a, b) => {
    const da = Math.abs(a.pos.x - actor.pos.x) + Math.abs(a.pos.y - actor.pos.y);
    const db = Math.abs(b.pos.x - actor.pos.x) + Math.abs(b.pos.y - actor.pos.y);
    return da <= db ? a : b;
  });
  const range = computeMoveRange(state, actorId).sort(
    (p, q) =>
      Math.abs(p.x - target.pos.x) + Math.abs(p.y - target.pos.y) -
      (Math.abs(q.x - target.pos.x) + Math.abs(q.y - target.pos.y))
  );
  return range.length ? [{ type: "move", actorId, moveTo: range[0] }] : [];
}

/** 驱动一局到出结果：敌方走正式 AI，我方走贪心 bot。 */
function playBattle(initial: BattleState): BattleState {
  const sim = new BattleSimulator(registry);
  const ai = new EnemyAI(registry, sim);
  let state = initial;
  let guard = 0;
  while (!state.outcome && guard++ < 2000) {
    const actor = state.activeUnitId ? unitById(state, state.activeUnitId) : undefined;
    if (!actor) break;
    const actions = actor.faction === "enemy" ? ai.planTurn(state) : [...greedyPlayerActions(state, sim, actor.instanceId), { type: "end_turn" as const }];
    for (const act of actions) {
      const r = sim.simulate(state, act);
      if (r.ok) state = r.nextState;
      if (state.outcome) break;
    }
  }
  return state;
}

describe("战役数值验证：贪心 bot 可通关全部关卡", () => {
  it("按剧情顺序打满 10 关，每关胜利并结算奖励", () => {
    let profile = initialSaveData().profile;
    const results: string[] = [];

    for (const level of levels) {
      const state = buildBattleState(profile, level, registry, tables);
      const final = playBattle(state);
      results.push(`${level.id}:${final.outcome}`);
      expect(final.outcome, `${level.id} 应由贪心 bot 打赢（当前 ${final.outcome}）`).toBe("player_win");
      const rewards = computeRewards(level, final, tables.levelRewards);
      profile = applyRewards(profile, rewards, tables.items).profile;
    }
    expect(results.length).toBe(10);
  });
});
