// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 伤害、状态、地形触发等结算原语。直接修改 state，向 events 追加事件。
 */
import { BattleState } from "../state/BattleState";
import { Unit, isAlive, hasStatus, StatusId } from "../unit/Unit";
import { Element } from "./Skill";
import { BattleEvent } from "../state/events";
import { TERRAIN_DAMAGE } from "../board/terrain";
import { clone } from "../board/geometry";

/** 根据元素选择施法者攻击数值。 */
export function attackStat(caster: Unit, element: Element): number {
  return element === "physical" ? caster.stats.attack : caster.stats.magic;
}

/** 计算一次伤害的最终值（含防御与易伤）。 */
export function computeDamage(caster: Unit, target: Unit, element: Element, multiplier: number): number {
  const base = attackStat(caster, element) * multiplier;
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

/** 死亡判定：对所有 hp<=0 但尚未标记的单位发出 unit_died。 */
export function processDeaths(state: BattleState, events: BattleEvent[], alreadyDead: Set<string>): void {
  for (const u of state.units) {
    if (u.hp <= 0 && !alreadyDead.has(u.instanceId)) {
      alreadyDead.add(u.instanceId);
      events.push({ type: "unit_died", unitId: u.instanceId });
    }
  }
}
