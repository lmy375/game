/**
 * 伤害、状态、地形触发等结算原语。直接修改 state，向 events 追加事件。
 */
import { BattleState } from "../state/BattleState";
import { Unit, isAlive, hasStatus, StatusId } from "../unit/Unit";
import { Element, SkillDef } from "./Skill";
import { BattleEvent } from "../state/events";
import { TERRAIN_DAMAGE } from "../board/terrain";
import { clone } from "../board/geometry";

/** 根据元素选择施法者攻击数值。 */
export function attackStat(caster: Unit, element: Element): number {
  return element === "physical" ? caster.stats.attack : caster.stats.magic;
}

/** 技能等级倍率：1 级 = 1.0，之后每级加 skill.powerPerLevel。纯函数。 */
export function skillPower(skillLevel: number, skill: SkillDef): number {
  return 1 + Math.max(0, skillLevel - 1) * (skill.powerPerLevel ?? 0);
}

/** 计算一次伤害的最终值（含防御与易伤）。powerMult 为技能等级倍率（默认 1）。 */
export function computeDamage(
  caster: Unit,
  target: Unit,
  element: Element,
  multiplier: number,
  powerMult = 1
): number {
  const base = attackStat(caster, element) * multiplier * powerMult;
  let dmg = base - target.stats.defense;
  if (hasStatus(target, "vulnerable")) dmg *= 1.5;
  return Math.max(1, Math.round(dmg));
}

export function dealDamage(
  _state: BattleState,
  target: Unit,
  amount: number,
  source: string,
  events: BattleEvent[]
): void {
  if (!isAlive(target)) return;
  target.hp = Math.max(0, target.hp - amount);
  events.push({ type: "unit_damaged", unitId: target.instanceId, amount, hpAfter: target.hp, source });
}

export function heal(_state: BattleState, target: Unit, amount: number, events: BattleEvent[]): void {
  if (!isAlive(target)) return;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  events.push({ type: "unit_healed", unitId: target.instanceId, amount, hpAfter: target.hp });
}

/** 消耗品的战斗效果（core 级：只认「补血/净化」，不认物品元数据）。 */
export type ItemEffect = { type: "heal"; amount: number } | { type: "cleanse" };

/**
 * 施加消耗品效果到目标。heal 复用 heal()；cleanse 清除全部负面状态（当前状态皆为负面），
 * 每移除一个发 unit_status_expired。纯改 state + 追加事件。
 */
export function applyItemEffect(state: BattleState, target: Unit, effect: ItemEffect, events: BattleEvent[]): void {
  if (!isAlive(target)) return;
  if (effect.type === "heal") {
    heal(state, target, effect.amount, events);
    return;
  }
  // cleanse：清空负面状态。
  const cleared = target.statuses.splice(0, target.statuses.length);
  for (const s of cleared) {
    events.push({ type: "unit_status_expired", unitId: target.instanceId, statusId: s.id });
  }
}

export function applyStatus(target: Unit, status: StatusId, duration: number, magnitude: number | undefined, events: BattleEvent[]): void {
  if (!isAlive(target)) return;
  const existing = target.statuses.find((s) => s.id === status);
  if (existing) {
    existing.duration = Math.max(existing.duration, duration);
    if (magnitude !== undefined) existing.magnitude = magnitude;
  } else {
    target.statuses.push({ id: status, duration, magnitude });
  }
  events.push({ type: "unit_status_applied", unitId: target.instanceId, statusId: status, duration });
}

/**
 * 单位进入/停留在某格时触发地形效果（火焰、陷阱伤害）。
 * 用于位移落点与主动移动落点。
 */
export function triggerTerrain(state: BattleState, target: Unit, events: BattleEvent[]): void {
  if (!isAlive(target)) return;
  const terrain = state.board.terrainAt(target.pos);
  const dmg = TERRAIN_DAMAGE[terrain];
  if (dmg && dmg > 0) {
    events.push({ type: "terrain_triggered", position: clone(target.pos), terrainType: terrain, unitId: target.instanceId });
    dealDamage(state, target, dmg, `terrain:${terrain}`, events);
  }
}

/** 死亡判定：对所有 hp<=0 但尚未标记的单位发出 unit_died（可带击杀者，用于战斗内经验归属）。 */
export function processDeaths(
  state: BattleState,
  events: BattleEvent[],
  alreadyDead: Set<string>,
  killerId?: string
): void {
  for (const u of state.units) {
    if (u.hp <= 0 && !alreadyDead.has(u.instanceId)) {
      alreadyDead.add(u.instanceId);
      events.push({ type: "unit_died", unitId: u.instanceId, killerId });
    }
  }
}
