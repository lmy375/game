import {
  GridBoard,
  BattleState,
  Unit,
  UnitStats,
  Faction,
  Position,
  TileData,
  BattleSimulator,
  EnemyAI,
  ContentRegistry,
  unitById,
  livingUnits,
  computeMoveRange,
} from "@core/index";

const DEFAULT_STATS: UnitStats = { hp: 100, attack: 20, magic: 30, defense: 0, moveRange: 4, speed: 50 };

let counter = 0;

type UnitOverrides = Partial<Omit<Unit, "stats">> & { stats?: Partial<UnitStats> };

export function makeUnit(faction: Faction, pos: Position, overrides: UnitOverrides = {}): Unit {
  const stats: UnitStats = { ...DEFAULT_STATS, ...(overrides.stats ?? {}) };
  return {
    instanceId: overrides.instanceId ?? `${faction}_${counter++}`,
    defId: overrides.defId ?? "test",
    name: overrides.name ?? "test",
    faction,
    pos: { ...pos },
    facing: overrides.facing ?? "up",
    hp: overrides.hp ?? stats.hp,
    maxHp: overrides.maxHp ?? stats.hp,
    stats,
    skills: overrides.skills ?? [],
    statuses: overrides.statuses ?? [],
    movedThisTurn: overrides.movedThisTurn ?? false,
    actedThisTurn: overrides.actedThisTurn ?? false,
    cooldowns: overrides.cooldowns ?? {},
    ct: overrides.ct ?? 0,
    level: overrides.level ?? 1,
    xp: overrides.xp ?? 0,
    skillLevels: overrides.skillLevels ?? {},
    aiProfile: overrides.aiProfile,
  };
}

export function makeState(
  width: number,
  height: number,
  units: Unit[],
  tiles: TileData[] = []
): BattleState {
  return {
    board: new GridBoard(width, height, tiles),
    units,
    // 默认让第一个单位作为当前行动单位，便于直接对其施放技能/移动。
    turn: units[0]?.faction ?? "player",
    activeUnitId: units[0]?.instanceId ?? null,
    turnCount: 0,
    outcome: null,
  };
}

/**
 * 把一局战斗驱动到分出胜负，返回最终状态。敌方走 AI；玩家用简单策略（靠近最近敌人→相邻普攻→结束）。
 * 抽自 battle.test.ts 的完整对局循环，供战斗/养成测试复用。
 */
export function runToOutcome(initial: BattleState, registry: ContentRegistry): BattleState {
  let state = initial;
  const sim = new BattleSimulator(registry);
  const ai = new EnemyAI(registry, sim);

  let guard = 0;
  while (!state.outcome && guard++ < 1000) {
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

    const enemies = livingUnits(state, "enemy");
    if (enemies.length === 0) break;
    const target = enemies[0];
    const dist = (p: Position) => Math.abs(p.x - target.pos.x) + Math.abs(p.y - target.pos.y);
    if (!actor.movedThisTurn) {
      const range = computeMoveRange(state, actor.instanceId).sort((p, q) => dist(p) - dist(q));
      if (range.length) {
        const r = sim.simulate(state, { type: "move", actorId: actor.instanceId, moveTo: range[0] });
        if (r.ok) state = r.nextState;
      }
    }
    const me = unitById(state, actor.instanceId)!;
    const adj = livingUnits(state, "enemy").find(
      (e) => Math.abs(e.pos.x - me.pos.x) + Math.abs(e.pos.y - me.pos.y) === 1
    );
    if (adj) {
      const r = sim.simulate(state, { type: "skill", actorId: actor.instanceId, skillId: "normal_attack", targetCell: adj.pos });
      if (r.ok) state = r.nextState;
    }
    state = sim.simulate(state, { type: "end_turn" }).nextState;
  }
  return state;
}
