// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 战斗状态：棋盘 + 单位 + 回合信息。
 * 所有改变状态的操作都应通过克隆产生新状态（模拟器纯函数化的基础）。
 */
import { GridBoard } from "../board/GridBoard";
import { Position, eq } from "../board/geometry";
import { Faction, Unit, cloneUnit, isAlive } from "../unit/Unit";

export interface BattleState {
  board: GridBoard;
  units: Unit[];
  /** 当前行动单位的阵营（= activeUnit 的 faction）。 */
  turn: Faction;
  /** 当前行动单位实例 id（速度初动系统：同一时刻仅一个单位行动）。 */
  activeUnitId: string | null;
  /** 行动计数（每次单位行动 +1，从 0 起）。 */
  turnCount: number;
  /** 战斗结果，进行中为 null。 */
  outcome: "player_win" | "enemy_win" | null;
}

export function cloneState(s: BattleState): BattleState {
  return {
    board: s.board.clone(),
    units: s.units.map(cloneUnit),
    turn: s.turn,
    activeUnitId: s.activeUnitId,
    turnCount: s.turnCount,
    outcome: s.outcome,
  };
}

export function activeUnit(s: BattleState): Unit | undefined {
  return s.activeUnitId ? s.units.find((u) => u.instanceId === s.activeUnitId) : undefined;
}

export function unitAt(s: BattleState, p: Position): Unit | undefined {
  return s.units.find((u) => isAlive(u) && eq(u.pos, p));
}

export function unitById(s: BattleState, instanceId: string): Unit | undefined {
  return s.units.find((u) => u.instanceId === instanceId);
}

export function livingUnits(s: BattleState, faction?: Faction): Unit[] {
  return s.units.filter((u) => isAlive(u) && (faction ? u.faction === faction : true));
}

export function isOccupied(s: BattleState, p: Position): boolean {
  return unitAt(s, p) !== undefined;
}

/** 某格能否作为单位的合法落点（地形可站 + 无单位占用）。 */
export function isStandable(s: BattleState, p: Position, ignoreInstanceId?: string): boolean {
  if (!s.board.isWalkable(p)) return false;
  const occ = unitAt(s, p);
  if (occ && occ.instanceId !== ignoreInstanceId) return false;
  return true;
}

export function evaluateOutcome(s: BattleState): BattleState["outcome"] {
  const players = livingUnits(s, "player");
  const enemies = livingUnits(s, "enemy");
  if (enemies.length === 0) return "player_win";
  if (players.length === 0) return "enemy_win";
  return null;
}
