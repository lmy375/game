/**
 * 技能结算核心。
 * 结算顺序（MVP）：Pattern → 位移 → 地形 → 伤害 → 状态 → 死亡判断。
 * 直接修改传入 state（调用方先克隆），向 events 追加事件。
 */
import {
  Position,
  Direction,
  ALL_DIRECTIONS,
  DIRECTION_VECTOR,
  add,
  eq,
  clone,
  directionTo,
  manhattan,
} from "../board/geometry";
import { BattleState, unitAt } from "../state/BattleState";
import { Unit, isAlive } from "../unit/Unit";
import { SkillDef, EffectOp, TargetFilter } from "./Skill";
import { PatternDef, resolvePattern, ResolvedPatternCell } from "../pattern/Pattern";
import { ContentRegistry } from "../content/Registry";
import { BattleEvent } from "../state/events";
import {
  applyPush,
  applyPull,
  applyPullToCenter,
  applyKnockback,
  applySwap,
  applyArrangeLine,
} from "../displacement/displacement";
import { computeDamage, dealDamage, heal, applyStatus, triggerTerrain, processDeaths } from "./combat";

export interface SkillTarget {
  cell?: Position;
  direction?: Direction;
  unitId?: string;
}

export interface Targeting {
  origin: Position; // Pattern 原点
  dir: Direction; // 释放方向
  targetCell: Position; // 名义目标格（用于聚拢中心等）
}

/** 计算技能的施法目标点候选（用于预览与 AI 枚举）。 */
export function getCastableCells(state: BattleState, caster: Unit, skill: SkillDef): Position[] {
  const range = skill.castRange;
  const cells: Position[] = [];
  const within = (min: number, max: number) => {
    for (let x = 0; x < state.board.width; x++) {
      for (let y = 0; y < state.board.height; y++) {
        const p = { x, y };
        const d = manhattan(caster.pos, p);
        if (d >= min && d <= max) cells.push(p);
      }
    }
  };
  switch (range.type) {
    case "self":
      cells.push(clone(caster.pos));
      break;
    case "melee":
      for (const dir of ALL_DIRECTIONS) {
        const p = add(caster.pos, DIRECTION_VECTOR[dir]);
        if (state.board.inBounds(p)) cells.push(p);
      }
      break;
    case "distance":
      within(range.min, range.max);
      break;
    case "direction":
      // 方向技能由 direction 选择，这里返回前方第一格作为代表点
      for (const dir of ALL_DIRECTIONS) {
        const p = add(caster.pos, DIRECTION_VECTOR[dir]);
        if (state.board.inBounds(p)) cells.push(p);
      }
      break;
  }
  return cells;
}

/** 解析施法朝向与 Pattern 原点。 */
export function resolveTargeting(caster: Unit, skill: SkillDef, pattern: PatternDef, target: SkillTarget): Targeting {
  let dir: Direction;
  let targetCell: Position;

  if (skill.targetType === "direction") {
    dir = target.direction ?? caster.facing;
    targetCell = add(caster.pos, DIRECTION_VECTOR[dir]);
  } else {
    targetCell = target.cell ?? clone(caster.pos);
    if (pattern.rotatable) {
      dir = eq(targetCell, caster.pos) ? caster.facing : directionTo(caster.pos, targetCell);
    } else {
      dir = caster.facing;
    }
  }

  const origin = pattern.anchor === "caster_direction" ? clone(caster.pos) : clone(targetCell);
  return { origin, dir, targetCell };
}

/** 解析最终命中格（已旋转、已平移）。 */
export function resolveHitCells(
  caster: Unit,
  skill: SkillDef,
  registry: ContentRegistry,
  target: SkillTarget
): { cells: ResolvedPatternCell[]; targeting: Targeting } {
  const pattern = registry.pattern(skill.patternId);
  const targeting = resolveTargeting(caster, skill, pattern, target);
  const cells = resolvePattern(pattern, targeting.origin, targeting.dir);
  return { cells, targeting };
}

function matchesFilter(caster: Unit, u: Unit, filter: TargetFilter): boolean {
  switch (filter) {
    case "enemy":
      return u.faction !== caster.faction;
    case "ally":
      return u.faction === caster.faction && u.instanceId !== caster.instanceId;
    case "self":
      return u.instanceId === caster.instanceId;
    case "any":
      return true;
  }
}

interface HitUnit {
  unit: Unit;
  ops: EffectOp[];
}

/** 校验技能能否施放。 */
export function canCast(state: BattleState, caster: Unit, skill: SkillDef, target: SkillTarget): boolean {
  if (!isAlive(caster)) return false;
  if ((caster.cooldowns[skill.id] ?? 0) > 0) return false;

  if (skill.targetType === "direction") {
    return target.direction !== undefined;
  }
  if (skill.targetType === "unit") {
    const tu = target.unitId ? state.units.find((u) => u.instanceId === target.unitId) : undefined;
    if (!tu || !isAlive(tu)) return false;
    target = { cell: tu.pos };
  }
  if (!target.cell) return false;
  // 施法范围校验
  const candidates = getCastableCells(state, caster, skill);
  return candidates.some((c) => eq(c, target.cell!));
}

/**
 * 执行技能效果。假定 canCast 已通过（AI/UI 负责校验）。
 */
export function resolveSkillEffects(
  state: BattleState,
  caster: Unit,
  skill: SkillDef,
  registry: ContentRegistry,
  target: SkillTarget,
  events: BattleEvent[]
): void {
  const filter: TargetFilter = skill.targetFilter ?? "enemy";

  // unit 目标转 cell
  let effectiveTarget = target;
  if (skill.targetType === "unit" && target.unitId) {
    const tu = state.units.find((u) => u.instanceId === target.unitId);
    if (tu) effectiveTarget = { cell: clone(tu.pos), unitId: target.unitId };
  }

  const { cells, targeting } = resolveHitCells(caster, skill, registry, effectiveTarget);
  events.push({ type: "skill_cast", casterId: caster.instanceId, skillId: skill.id, targetCell: targeting.targetCell });
  caster.facing = targeting.dir;

  // 1) 收集命中单位及其效果
  const hitMap = new Map<string, HitUnit>();
  for (const cell of cells) {
    if (!state.board.inBounds(cell.pos)) continue;
    const u = unitAt(state, cell.pos);
    if (!u || !isAlive(u)) continue;
    if (!matchesFilter(caster, u, filter)) continue;
    // effectKey 自身的效果 + 通配 "all"；当 effectKey 本身就是 "all" 时不重复叠加。
    const keyOps = skill.cellEffects[cell.effectKey] ?? [];
    const allOps = cell.effectKey === "all" ? [] : skill.cellEffects["all"] ?? [];
    const ops: EffectOp[] = [...keyOps, ...allOps];
    const existing = hitMap.get(u.instanceId);
    if (existing) existing.ops.push(...ops);
    else hitMap.set(u.instanceId, { unit: u, ops });
  }
  const hits = [...hitMap.values()];
  const displaced = new Set<string>();
  const alreadyDead = new Set<string>(state.units.filter((u) => u.hp <= 0).map((u) => u.instanceId));

  // 2) 位移阶段
  // 2a) 群体整队 arrange_line（一次处理所有带该 op 的单位）
  const lineUnits = hits.filter((h) => h.ops.some((o) => o.type === "arrange_line"));
  if (lineUnits.length > 0) {
    const op = lineUnits[0].ops.find((o) => o.type === "arrange_line") as Extract<EffectOp, { type: "arrange_line" }>;
    applyArrangeLine(state, lineUnits.map((h) => h.unit), targeting.targetCell, targeting.dir, op.maxUnits, events);
    lineUnits.forEach((h) => displaced.add(h.unit.instanceId));
  }

  // 2b) 聚拢：按到中心距离从近到远，避免互相抢位
  const gatherUnits = hits
    .filter((h) => h.ops.some((o) => o.type === "pull_to_center"))
    .sort((a, b) => manhattan(a.unit.pos, targeting.targetCell) - manhattan(b.unit.pos, targeting.targetCell));
  for (const h of gatherUnits) {
    const op = h.ops.find((o) => o.type === "pull_to_center") as Extract<EffectOp, { type: "pull_to_center" }>;
    const r = applyPullToCenter(state, h.unit, targeting.targetCell, op.maxDistance, events);
    if (r.moved > 0) displaced.add(h.unit.instanceId);
  }

  // 2c) 逐个位移：push / pull / knockback / swap（按到施法者距离排序保证可预测）
  const ordered = [...hits].sort((a, b) => manhattan(a.unit.pos, caster.pos) - manhattan(b.unit.pos, caster.pos));
  for (const h of ordered) {
    for (const op of h.ops) {
      if (op.type === "push") {
        const r = applyPush(state, h.unit, targeting.dir, op.distance, events);
        if (r.moved > 0) displaced.add(h.unit.instanceId);
      } else if (op.type === "pull") {
        const r = applyPull(state, h.unit, caster.pos, op.distance, events);
        if (r.moved > 0) displaced.add(h.unit.instanceId);
      } else if (op.type === "knockback") {
        const r = applyKnockback(state, h.unit, targeting.dir, op.distance, op.collisionDamage, events);
        if (r.moved > 0) displaced.add(h.unit.instanceId);
      } else if (op.type === "swap") {
        if (applySwap(state, caster, h.unit, events)) {
          displaced.add(h.unit.instanceId);
          displaced.add(caster.instanceId);
        }
      }
    }
  }

  // 3) 地形触发（仅对发生位移的单位）
  for (const id of displaced) {
    const u = state.units.find((x) => x.instanceId === id);
    if (u) triggerTerrain(state, u, events);
  }

  // 4) 伤害阶段
  for (const h of hits) {
    for (const op of h.ops) {
      if (op.type === "damage") {
        dealDamage(state, h.unit, computeDamage(caster, h.unit, op.element, op.multiplier), `skill:${skill.id}`, events);
      } else if (op.type === "heal") {
        heal(state, h.unit, Math.round(caster.stats.magic * op.multiplier), events);
      }
    }
  }

  // 5) 状态阶段
  for (const h of hits) {
    for (const op of h.ops) {
      if (op.type === "apply_status") {
        applyStatus(h.unit, op.status, op.duration, op.magnitude, events);
      }
    }
  }

  // 6) 死亡判定
  processDeaths(state, events, alreadyDead);
}
