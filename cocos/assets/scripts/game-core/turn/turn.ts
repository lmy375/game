// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 速度初动（Charge-Time）行动顺序系统。
 *
 * 每个单位有 speed，每个 tick 充能 ct += speed；当 ct >= CT_THRESHOLD 即可行动。
 * 行动结束后扣除 CT_THRESHOLD。速度越高，达到阈值越快、行动轮数越多
 * （speed 80 的单位行动次数约为 speed 40 单位的两倍）。
 */
import { BattleState, livingUnits } from "../state/BattleState";
import { Faction, Unit, hasStatus } from "../unit/Unit";
import { BattleEvent } from "../state/events";
import { dealDamage, processDeaths } from "../skill/combat";

export const CT_THRESHOLD = 100;
const BURN_DEFAULT_DAMAGE = 10;

/** 在不修改 state 的前提下，挑选下一个达到行动阈值的单位（推进 ct）。返回单位 id 或 null。 */
function tickUntilReady(state: BattleState): string | null {
  const alive = livingUnits(state);
  if (alive.length === 0) return null;

  // 已有单位达标则直接选择
  const ready = () => alive.filter((u) => u.ct >= CT_THRESHOLD);

  let guard = 0;
  while (ready().length === 0 && guard++ < 100000) {
    for (const u of alive) u.ct += Math.max(1, u.stats.speed);
  }

  // 多个达标时，ct 最高者先动；平局按 speed、再按 instanceId 保证确定性
  const candidates = ready().sort((a, b) => {
    if (b.ct !== a.ct) return b.ct - a.ct;
    if (b.stats.speed !== a.stats.speed) return b.stats.speed - a.stats.speed;
    return a.instanceId < b.instanceId ? -1 : 1;
  });
  return candidates[0]?.instanceId ?? null;
}

/** 开始某单位的行动：重置行动标记、递减其冷却、结算其回合起始状态（燃烧/眩晕）。 */
function startUnitTurn(state: BattleState, unit: Unit, events: BattleEvent[]): void {
  state.activeUnitId = unit.instanceId;
  state.turn = unit.faction;
  state.turnCount += 1;
  events.push({ type: "turn_started", faction: unit.faction, turnCount: state.turnCount, unitId: unit.instanceId });

  unit.movedThisTurn = false;
  unit.actedThisTurn = false;

  for (const id of Object.keys(unit.cooldowns)) {
    if (unit.cooldowns[id] > 0) unit.cooldowns[id] -= 1;
  }

  const alreadyDead = new Set<string>(state.units.filter((u) => u.hp <= 0).map((u) => u.instanceId));

  for (const s of unit.statuses) {
    if (s.id === "burn") dealDamage(state, unit, s.magnitude ?? BURN_DEFAULT_DAMAGE, "status:burn", events);
  }

  if (hasStatus(unit, "stun")) {
    // 眩晕：本次行动直接跳过
    unit.movedThisTurn = true;
    unit.actedThisTurn = true;
  }

  unit.statuses = unit.statuses.filter((s) => {
    s.duration -= 1;
    if (s.duration <= 0) {
      events.push({ type: "unit_status_expired", unitId: unit.instanceId, statusId: s.id });
      return false;
    }
    return true;
  });

  processDeaths(state, events, alreadyDead);
}

/**
 * 推进到下一个行动单位：扣除当前行动单位的充能，挑选下一个达标单位并开始其行动。
 */
export function advanceInitiative(state: BattleState, events: BattleEvent[]): void {
  const current = state.activeUnitId ? state.units.find((u) => u.instanceId === state.activeUnitId) : undefined;
  if (current) current.ct -= CT_THRESHOLD;
  state.activeUnitId = null;

  const nextId = tickUntilReady(state);
  if (!nextId) return;
  const next = state.units.find((u) => u.instanceId === nextId)!;
  startUnitTurn(state, next, events);
}

/** 初始化战斗的首个行动单位（关卡加载时调用）。 */
export function initInitiative(state: BattleState): void {
  const events: BattleEvent[] = [];
  const nextId = tickUntilReady(state);
  if (!nextId) return;
  const next = state.units.find((u) => u.instanceId === nextId)!;
  startUnitTurn(state, next, events);
}

/**
 * 预测接下来 n 个行动单位的顺序（用于 UI 显示）。不修改真实状态。
 */
export function predictTurnOrder(state: BattleState, n: number): string[] {
  // 仅复制 ct/speed/faction，避免深克隆整张棋盘
  const sim = livingUnits(state).map((u) => ({
    id: u.instanceId,
    ct: u.ct,
    speed: Math.max(1, u.stats.speed),
  }));
  if (sim.length === 0) return [];

  const order: string[] = [];
  // 第一个就是当前行动单位
  if (state.activeUnitId && sim.some((u) => u.id === state.activeUnitId)) {
    order.push(state.activeUnitId);
    const cur = sim.find((u) => u.id === state.activeUnitId)!;
    cur.ct -= CT_THRESHOLD;
  }

  let guard = 0;
  while (order.length < n && guard++ < 100000) {
    while (!sim.some((u) => u.ct >= CT_THRESHOLD)) {
      for (const u of sim) u.ct += u.speed;
    }
    const ready = sim
      .filter((u) => u.ct >= CT_THRESHOLD)
      .sort((a, b) => (b.ct !== a.ct ? b.ct - a.ct : b.speed - a.speed));
    const pick = ready[0];
    order.push(pick.id);
    pick.ct -= CT_THRESHOLD;
  }
  return order;
}

export function otherFaction(f: Faction): Faction {
  return f === "player" ? "enemy" : "player";
}
