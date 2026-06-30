// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 移动范围计算（BFS）与 A* 寻路。四方向移动，每格代价 1。
 * 单位不能穿过其他单位与不可站立格。
 */
import { Position, key, manhattan, ALL_DIRECTIONS, DIRECTION_VECTOR, add } from "../board/geometry";
import { BattleState, isStandable, unitAt } from "../state/BattleState";

/**
 * 计算单位的可达格集合（不含起点）。
 * 移动中不能穿过任何其他单位（即使该格最终可站立）。
 */
export function computeMoveRange(state: BattleState, instanceId: string): Position[] {
  const unit = state.units.find((u) => u.instanceId === instanceId);
  if (!unit) return [];
  const start = unit.pos;
  const maxCost = unit.stats.moveRange;

  const dist = new Map<string, number>();
  dist.set(key(start), 0);
  const queue: Position[] = [start];
  const result: Position[] = [];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curCost = dist.get(key(cur))!;
    if (curCost >= maxCost) continue;
    for (const dir of ALL_DIRECTIONS) {
      const next = add(cur, DIRECTION_VECTOR[dir]);
      const k = key(next);
      if (dist.has(k)) continue;
      if (!state.board.inBounds(next)) continue;
      if (!state.board.isWalkable(next)) continue;
      const occ = unitAt(state, next);
      if (occ && occ.instanceId !== instanceId) continue; // 不能穿过单位
      dist.set(k, curCost + 1);
      result.push(next);
      queue.push(next);
    }
  }
  return result;
}

/**
 * A* 寻路：返回从 start 到 goal 的路径（含起点与终点）；不可达返回 null。
 * 用于移动动画与「移动到该格需要多少步」判断。
 */
export function findPath(
  state: BattleState,
  instanceId: string,
  goal: Position
): Position[] | null {
  const unit = state.units.find((u) => u.instanceId === instanceId);
  if (!unit) return null;
  const start = unit.pos;
  if (!isStandable(state, goal, instanceId)) return null;

  const open: Position[] = [start];
  const cameFrom = new Map<string, Position>();
  const g = new Map<string, number>();
  g.set(key(start), 0);
  const f = new Map<string, number>();
  f.set(key(start), manhattan(start, goal));

  while (open.length > 0) {
    // 取 f 最小的节点
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if ((f.get(key(open[i])) ?? Infinity) < (f.get(key(open[bestIdx])) ?? Infinity)) bestIdx = i;
    }
    const cur = open.splice(bestIdx, 1)[0];
    if (cur.x === goal.x && cur.y === goal.y) {
      return reconstruct(cameFrom, cur);
    }
    const curG = g.get(key(cur))!;
    for (const dir of ALL_DIRECTIONS) {
      const next = add(cur, DIRECTION_VECTOR[dir]);
      if (!state.board.isWalkable(next)) continue;
      const occ = unitAt(state, next);
      if (occ && occ.instanceId !== instanceId) continue;
      const tentative = curG + 1;
      if (tentative < (g.get(key(next)) ?? Infinity)) {
        cameFrom.set(key(next), cur);
        g.set(key(next), tentative);
        f.set(key(next), tentative + manhattan(next, goal));
        if (!open.some((p) => p.x === next.x && p.y === next.y)) open.push(next);
      }
    }
  }
  return null;
}

function reconstruct(cameFrom: Map<string, Position>, end: Position): Position[] {
  const path: Position[] = [end];
  let cur = end;
  while (cameFrom.has(key(cur))) {
    cur = cameFrom.get(key(cur))!;
    path.unshift(cur);
  }
  return path;
}
