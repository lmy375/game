// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 战斗事件。模拟器输出事件流，表现层（Web/Cocos）据此播放动画。
 * 核心逻辑绝不直接驱动渲染。
 */
import { Position } from "../board/geometry";
import { StatusId } from "../unit/Unit";
import { TerrainType } from "../board/terrain";
import { Faction } from "../unit/Unit";

export type BattleEvent =
  | { type: "unit_moved"; unitId: string; from: Position; to: Position; path: Position[] }
  | { type: "skill_cast"; casterId: string; skillId: string; targetCell?: Position }
  | { type: "unit_damaged"; unitId: string; amount: number; hpAfter: number; source: string }
  | { type: "unit_healed"; unitId: string; amount: number; hpAfter: number }
  | {
      type: "unit_displaced";
      unitId: string;
      from: Position;
      to: Position;
      reason: "push" | "pull" | "gather" | "swap" | "arrange_line" | "knockback";
    }
  | { type: "displacement_blocked"; unitId: string; at: Position; reason: "wall" | "occupied" | "edge" }
  | { type: "collision_damage"; unitId: string; amount: number; hpAfter: number }
  | { type: "unit_status_applied"; unitId: string; statusId: StatusId; duration: number }
  | { type: "unit_status_expired"; unitId: string; statusId: StatusId }
  | { type: "terrain_triggered"; position: Position; terrainType: TerrainType; unitId: string }
  | { type: "obstacle_destroyed"; position: Position }
  | { type: "unit_died"; unitId: string }
  | { type: "turn_started"; faction: Faction; turnCount: number; unitId?: string }
  | { type: "turn_ended"; faction: Faction }
  | { type: "battle_ended"; outcome: "player_win" | "enemy_win" };
