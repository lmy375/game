/**
 * 位移结算。所有位移必须可预测：单方向逐格移动，遇墙/障碍/单位/边界停止。
 * 函数直接修改传入的 state（调用方负责先克隆），并向 events 追加事件。
 */
import { Position, Direction, DIRECTION_VECTOR, add, eq, directionTo, manhattan, clone } from "../board/geometry";
import { BattleState, unitAt } from "../state/BattleState";
import { Unit, isAlive } from "../unit/Unit";
import { BattleEvent } from "../state/events";

export type DisplacementReason = "push" | "pull" | "gather" | "swap" | "arrange_line" | "knockback";

export interface StepResult {
  moved: number;
  finalPos: Position;
  blocked: "wall" | "occupied" | "edge" | null;
}

/**
 * 沿单一方向把单位移动最多 maxSteps 格，遇阻停止。不触发地形（地形在外层统一处理）。
 */
export function stepMove(
  state: BattleState,
  unit: Unit,
  dir: Direction,
  maxSteps: number,
  reason: DisplacementReason,
  events: BattleEvent[]
): StepResult {
  const from = clone(unit.pos);
  const vec = DIRECTION_VECTOR[dir];
  let moved = 0;
  let blocked: StepResult["blocked"] = null;

  for (let i = 0; i < maxSteps; i++) {
    const next = add(unit.pos, vec);
    if (!state.board.inBounds(next)) {
      blocked = "edge";
      break;
    }
    if (state.board.blocksDisplacement(next)) {
      blocked = "wall";
      break;
    }
    const occ = unitAt(state, next);
    if (occ && occ.instanceId !== unit.instanceId) {
      blocked = "occupied";
      break;
    }
    unit.pos = next;
    moved++;
  }

  if (moved > 0) {
    events.push({ type: "unit_displaced", unitId: unit.instanceId, from, to: clone(unit.pos), reason });
  } else if (blocked) {
    events.push({ type: "displacement_blocked", unitId: unit.instanceId, at: clone(unit.pos), reason: blocked });
  }
  return { moved, finalPos: clone(unit.pos), blocked };
}

/** Push：沿释放方向推开。 */
export function applyPush(state: BattleState, unit: Unit, dir: Direction, distance: number, events: BattleEvent[]): StepResult {
  return stepMove(state, unit, dir, distance, "push", events);
}

/** Pull：朝施法者方向拉近 distance 格（不穿过施法者）。 */
export function applyPull(state: BattleState, unit: Unit, casterPos: Position, distance: number, events: BattleEvent[]): StepResult {
  const dir = directionTo(unit.pos, casterPos);
  return pullTowards(state, unit, casterPos, dir, distance, "pull", events);
}

/** Gather / pull_to_center：朝中心点聚拢，不越过中心。 */
export function applyPullToCenter(
  state: BattleState,
  unit: Unit,
  center: Position,
  maxDistance: number,
  events: BattleEvent[]
): StepResult {
  const dir = directionTo(unit.pos, center);
  return pullTowards(state, unit, center, dir, maxDistance, "gather", events);
}

/** 朝某点逐格拉近，到达该点或越过前停止。 */
function pullTowards(
  state: BattleState,
  unit: Unit,
  point: Position,
  dir: Direction,
  maxSteps: number,
  reason: DisplacementReason,
  events: BattleEvent[]
): StepResult {
  const from = clone(unit.pos);
  const vec = DIRECTION_VECTOR[dir];
  let moved = 0;
  let blocked: StepResult["blocked"] = null;

  for (let i = 0; i < maxSteps; i++) {
    const next = add(unit.pos, vec);
    // 只朝目标点靠近；到达或越过则停止。
    if (manhattan(next, point) >= manhattan(unit.pos, point)) break;
    if (!state.board.inBounds(next)) {
      blocked = "edge";
      break;
    }
    if (state.board.blocksDisplacement(next)) {
      blocked = "wall";
      break;
    }
    const occ = unitAt(state, next);
    if (occ && occ.instanceId !== unit.instanceId) {
      blocked = "occupied";
      break;
    }
    unit.pos = next;
    moved++;
  }

  // 聚拢时，已经紧贴中心（正交相邻）的单位无需移动即已在十字位上，
  // 不应报「被阻挡」——那会让玩家误以为聚拢失败。
  const alreadyInPlace = reason === "gather" && manhattan(from, point) === 1;
  if (moved > 0) {
    events.push({ type: "unit_displaced", unitId: unit.instanceId, from, to: clone(unit.pos), reason });
  } else if (blocked && !alreadyInPlace) {
    events.push({ type: "displacement_blocked", unitId: unit.instanceId, at: clone(unit.pos), reason: blocked });
  }
  return { moved, finalPos: clone(unit.pos), blocked };
}

/** Knockback：沿方向击退，撞墙/边界/单位造成额外伤害。 */
export function applyKnockback(
  state: BattleState,
  unit: Unit,
  dir: Direction,
  distance: number,
  collisionDamage: number,
  events: BattleEvent[]
): StepResult {
  const res = stepMove(state, unit, dir, distance, "knockback", events);
  if (res.blocked && collisionDamage > 0) {
    unit.hp = Math.max(0, unit.hp - collisionDamage);
    events.push({ type: "collision_damage", unitId: unit.instanceId, amount: collisionDamage, hpAfter: unit.hp });
  }
  return res;
}

/** Swap：交换两个单位位置（双方都须可站立）。 */
export function applySwap(state: BattleState, a: Unit, b: Unit, events: BattleEvent[]): boolean {
  const aPos = clone(a.pos);
  const bPos = clone(b.pos);
  if (!state.board.isWalkable(aPos) || !state.board.isWalkable(bPos)) return false;
  a.pos = bPos;
  b.pos = aPos;
  events.push({ type: "unit_displaced", unitId: a.instanceId, from: aPos, to: clone(a.pos), reason: "swap" });
  events.push({ type: "unit_displaced", unitId: b.instanceId, from: bPos, to: clone(b.pos), reason: "swap" });
  return true;
}

/**
 * ArrangeLine：把若干单位整理成沿 dir 方向、从 anchor 起始的一条直线。
 * 按到 anchor 的距离从近到远放置；跳过不可站立/已占用格。
 */
export function applyArrangeLine(
  state: BattleState,
  units: Unit[],
  anchor: Position,
  dir: Direction,
  maxUnits: number,
  events: BattleEvent[]
): void {
  const vec = DIRECTION_VECTOR[dir];
  const sorted = [...units]
    .filter(isAlive)
    .sort((u, v) => manhattan(u.pos, anchor) - manhattan(v.pos, anchor))
    .slice(0, maxUnits);

  let slot = 0;
  for (const u of sorted) {
    // 找到下一个可放置的直线格
    let placed = false;
    while (slot < 64) {
      const target: Position = { x: anchor.x + vec.x * slot, y: anchor.y + vec.y * slot };
      slot++;
      if (!state.board.isWalkable(target)) continue;
      const occ = unitAt(state, target);
      if (occ && occ.instanceId !== u.instanceId) continue;
      const from = clone(u.pos);
      if (!eq(from, target)) {
        u.pos = clone(target);
        events.push({ type: "unit_displaced", unitId: u.instanceId, from, to: clone(target), reason: "arrange_line" });
      }
      placed = true;
      break;
    }
    if (!placed) break;
  }
}
