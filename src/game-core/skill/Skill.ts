/**
 * 技能与效果的数据结构定义（数据驱动，来自 skills.json）。
 */
import { StatusId } from "../unit/Unit";

export type Element = "physical" | "fire" | "wind" | "ice";

/** 施法范围类型。 */
export type CastRange =
  | { type: "self" } // 以施法者自身为中心
  | { type: "distance"; min: number; max: number } // 距离施法者 min..max 格内任意格
  | { type: "direction" }; // 上下左右四方向之一

/** 技能选择目标的方式。 */
export type TargetType = "cell" | "unit" | "direction";

/** 目标过滤：哪些单位会被命中格上的效果作用。 */
export type TargetFilter = "enemy" | "ally" | "any" | "self";

/** 单个格子效果操作。 */
export type EffectOp =
  | { type: "damage"; element: Element; multiplier: number }
  | { type: "heal"; multiplier: number }
  | { type: "apply_status"; status: StatusId; duration: number; magnitude?: number }
  // 位移：把命中单位沿「释放方向」推开 distance 格
  | { type: "push"; distance: number }
  // 位移：把命中单位向施法者方向拉近 distance 格
  | { type: "pull"; distance: number }
  // 位移：把命中单位向目标中心点聚拢，最多 maxDistance 格。
  // stopRadius：聚拢的目标菱形半径（曼哈顿距离），到达该半径即停止，不再挤向中心；缺省 0（拉到中心）。
  | { type: "pull_to_center"; maxDistance: number; stopRadius?: number }
  // 伤害：与同格 pull_to_center 联动——被聚拢移动过的单位吃 movedMultiplier，
  // 原地未动（已在目标菱形内或被阻挡）的单位吃 stayedMultiplier。
  | { type: "gather_damage"; element: Element; movedMultiplier: number; stayedMultiplier: number }
  // 位移：击退（撞墙额外伤害）
  | { type: "knockback"; distance: number; collisionDamage: number }
  // 位移：与施法者交换位置
  | { type: "swap" }
  // 位移：把命中单位整理成一条直线（沿释放方向），最多 maxUnits 个
  | { type: "arrange_line"; maxUnits: number };

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  shortDescription?: string;
  castRange: CastRange;
  patternId: string;
  targetType: TargetType;
  /** 哪些单位会被效果命中（默认 enemy）。 */
  targetFilter?: TargetFilter;
  cooldown: number;
  /**
   * 格子效果。键为 Pattern 的 effectKey；特殊键 "all" 作用于所有命中格。
   * 注意：arrange_line / pull_to_center 这类「整体位移」放在 "all" 下，按一次整体结算。
   */
  cellEffects: Record<string, EffectOp[]>;
  /** AI 评分倾向提示（可选）。 */
  aiHint?: "attack" | "aoe" | "displacement" | "control";
}
