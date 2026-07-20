import {
  GridBoard,
  BattleState,
  BattleAction,
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
  directionTo,
  parseLayout,
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

/** 用 ASCII layout 建局(见 board/layout.ts 的字符映射与行序约定)。 */
export function makeStateFromLayout(layout: string[], units: Unit[]): BattleState {
  const data = parseLayout(layout);
  return {
    board: new GridBoard(data.width, data.height, data.tiles),
    units,
    turn: units[0]?.faction ?? "player",
    activeUnitId: units[0]?.instanceId ?? null,
    turnCount: 0,
    outcome: null,
  };
}

/**
 * 朴素玩家策略的施法环节：按技能表顺序，对每个敌人枚举「目标格 / 释放方向 / 目标单位 / 自身格」，
 * 释放第一个能真正造成伤害的技能（simulate 校验合法性与效果）。返回施放后的状态；无可放技能则原样返回。
 */
export function castFirstDamagingSkill(state: BattleState, sim: BattleSimulator, actorId: string): BattleState {
  const me = unitById(state, actorId);
  if (!me) return state;
  const enemies = livingUnits(state, "enemy");
  for (const skillId of me.skills) {
    const candidates: BattleAction[] = enemies.flatMap((e) => [
      { type: "skill" as const, actorId, skillId, targetCell: { ...e.pos } },
      { type: "skill" as const, actorId, skillId, direction: directionTo(me.pos, e.pos) },
      { type: "skill" as const, actorId, skillId, targetUnitId: e.instanceId, targetCell: { ...e.pos } },
    ]);
    candidates.push({ type: "skill", actorId, skillId, targetCell: { ...me.pos } }); // self 范围技
    for (const act of candidates) {
      const r = sim.simulate(state, act);
      if (r.ok && r.events.some((ev) => ev.type === "unit_damaged")) return r.nextState;
    }
  }
  return state;
}

/**
 * 把一局战斗驱动到分出胜负，返回最终状态。敌方走 AI；玩家用简单策略（靠近最近敌人→放第一个能伤敌的技能→结束）。
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
    state = castFirstDamagingSkill(state, sim, actor.instanceId);
    state = sim.simulate(state, { type: "end_turn" }).nextState;
  }
  return state;
}
