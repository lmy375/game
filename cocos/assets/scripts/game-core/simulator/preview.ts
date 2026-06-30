// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 预览系统：通过在克隆状态上跑模拟，得到「释放后会发生什么」，绝不修改真实状态。
 * 返回命中格 + 事件流 + 结果态，供 UI 渲染伤害数字、位移箭头、撞墙/陷阱提示。
 */
import { Position, Direction } from "../board/geometry";
import { BattleState, unitById } from "../state/BattleState";
import { BattleEvent } from "../state/events";
import { ContentRegistry } from "../content/Registry";
import { BattleSimulator } from "./BattleSimulator";
import { resolveHitCells } from "../skill/resolveSkill";
import { ResolvedPatternCell } from "../pattern/Pattern";

export interface SkillPreview {
  /** 命中格（含 effectKey，用于上色）。 */
  hitCells: ResolvedPatternCell[];
  /** 释放后将产生的事件流。 */
  events: BattleEvent[];
  /** 释放后的结果状态（克隆，不影响真实战斗）。 */
  resultState: BattleState;
  ok: boolean;
}

export function previewSkill(
  state: BattleState,
  simulator: BattleSimulator,
  registry: ContentRegistry,
  actorId: string,
  skillId: string,
  target: { cell?: Position; direction?: Direction; unitId?: string }
): SkillPreview {
  const actor = unitById(state, actorId);
  const skill = registry.skill(skillId);
  let hitCells: ResolvedPatternCell[] = [];
  if (actor) {
    const effectiveTarget = { ...target };
    if (skill.targetType === "unit" && target.unitId) {
      const tu = unitById(state, target.unitId);
      if (tu) effectiveTarget.cell = tu.pos;
    }
    hitCells = resolveHitCells(actor, skill, registry, effectiveTarget).cells.filter((c) =>
      state.board.inBounds(c.pos)
    );
  }

  const result = simulator.simulate(state, {
    type: "skill",
    actorId,
    skillId,
    targetCell: target.cell,
    targetUnitId: target.unitId,
    direction: target.direction,
  });

  return { hitCells, events: result.events, resultState: result.nextState, ok: result.ok };
}

/** 从预览事件中提取「人话」描述，对应 PRD 9.3 的位移预览提示。 */
export function describePreview(state: BattleState, events: BattleEvent[]): string[] {
  const lines: string[] = [];
  const nameOf = (id: string) => unitById(state, id)?.name ?? id;
  for (const e of events) {
    switch (e.type) {
      case "unit_damaged":
        lines.push(`${nameOf(e.unitId)} 受到 ${e.amount} 点伤害（剩余 ${e.hpAfter}）`);
        break;
      case "unit_displaced":
        lines.push(`${nameOf(e.unitId)} 被${reasonText(e.reason)}至 (${e.to.x}, ${e.to.y})`);
        break;
      case "displacement_blocked":
        lines.push(`${nameOf(e.unitId)} 被${e.reason === "occupied" ? "其他单位" : "障碍"}阻挡，无法移动`);
        break;
      case "collision_damage":
        lines.push(`${nameOf(e.unitId)} 撞击受到 ${e.amount} 点额外伤害`);
        break;
      case "terrain_triggered":
        lines.push(`${nameOf(e.unitId)} 踏入${e.terrainType === "fire" ? "火焰" : "陷阱"}`);
        break;
      case "unit_status_applied":
        lines.push(`${nameOf(e.unitId)} 获得状态「${e.statusId}」`);
        break;
      case "unit_died":
        lines.push(`${nameOf(e.unitId)} 被击败`);
        break;
    }
  }
  return lines;
}

function reasonText(reason: string): string {
  switch (reason) {
    case "push":
      return "推";
    case "pull":
      return "拉";
    case "gather":
      return "聚拢";
    case "swap":
      return "换位";
    case "arrange_line":
      return "整队";
    case "knockback":
      return "击退";
    default:
      return "移动";
  }
}
