/**
 * 战斗模拟器：纯函数。simulate(state, action) -> { nextState, events }。
 * 不修改输入 state；预览与 AI 都复用这一套模拟。
 */
import { Position, Direction, eq, clone, chebyshev } from "../board/geometry";
import { BattleState, cloneState, unitById, evaluateOutcome, isStandable } from "../state/BattleState";
import { isAlive } from "../unit/Unit";
import { BattleEvent } from "../state/events";
import { ContentRegistry } from "../content/Registry";
import { findPath, computeMoveRange } from "../pathfinding/pathfinding";
import { canCast, resolveSkillEffects, SkillTarget } from "../skill/resolveSkill";
import { triggerTerrain, processDeaths, applyItemEffect, ItemEffect, heal } from "../skill/combat";
import { advanceInitiative } from "../turn/turn";

/** 调息恢复比例（占最大生命）。 */
export const REST_HEAL_RATIO = 0.15;

/** 调息的理论恢复量（不含生命上限截断）。 */
export function restHealAmount(maxHp: number): number {
  return Math.max(1, Math.round(maxHp * REST_HEAL_RATIO));
}

/** 核心层执行消耗品所需的权威规则；具体物品表由上层通过 resolver 注入。 */
export interface BattleItemRule {
  effect: ItemEffect;
  /** 切比雪夫距离；0 表示只能对自身使用。 */
  range: number;
}

export type BattleItemResolver = (itemId: string) => BattleItemRule | undefined;

export type BattleAction =
  | { type: "move"; actorId: string; moveTo: Position }
  | {
      type: "skill";
      actorId: string;
      skillId: string;
      targetCell?: Position;
      targetUnitId?: string;
      direction?: Direction;
    }
  | { type: "use_item"; actorId: string; targetUnitId: string; itemId: string }
  | { type: "rest"; actorId: string }
  | { type: "wait"; actorId: string }
  | { type: "end_turn" };

export interface BattleResult {
  nextState: BattleState;
  events: BattleEvent[];
  /** 行动是否合法被执行。 */
  ok: boolean;
  error?: string;
}

export class BattleSimulator {
  constructor(
    private readonly registry: ContentRegistry,
    private readonly resolveItem?: BattleItemResolver
  ) {}

  simulate(state: BattleState, action: BattleAction): BattleResult {
    const next = cloneState(state);
    const events: BattleEvent[] = [];

    if (next.outcome) {
      return { nextState: next, events, ok: false, error: "战斗已结束" };
    }

    if (action.type === "end_turn") {
      // 结束当前行动单位的回合，按速度推进到下一个行动单位。
      advanceInitiative(next, events);
      this.finalize(next, events);
      return { nextState: next, events, ok: true };
    }

    const actor = unitById(next, action.actorId);
    if (!actor || !isAlive(actor)) return { nextState: next, events, ok: false, error: "无效单位" };
    if (actor.instanceId !== next.activeUnitId) return { nextState: next, events, ok: false, error: "非当前行动单位" };

    switch (action.type) {
      case "move":
        return this.doMove(next, events, actor.instanceId, action.moveTo);
      case "skill":
        return this.doSkill(next, events, actor.instanceId, action);
      case "use_item":
        return this.doUseItem(next, events, actor.instanceId, action);
      case "rest":
        return this.doRest(next, events, actor.instanceId);
      case "wait": {
        actor.movedThisTurn = true;
        actor.actedThisTurn = true;
        return { nextState: next, events, ok: true };
      }
    }
  }

  private doMove(state: BattleState, events: BattleEvent[], actorId: string, moveTo: Position): BattleResult {
    const actor = unitById(state, actorId)!;
    if (actor.movedThisTurn) return { nextState: state, events, ok: false, error: "本回合已移动" };
    if (eq(actor.pos, moveTo)) return { nextState: state, events, ok: false, error: "原地不动" };
    if (!isStandable(state, moveTo, actorId)) return { nextState: state, events, ok: false, error: "目标格不可站立" };

    const reachable = computeMoveRange(state, actorId);
    if (!reachable.some((p) => eq(p, moveTo))) {
      return { nextState: state, events, ok: false, error: "超出移动范围" };
    }
    const path = findPath(state, actorId, moveTo);
    if (!path) return { nextState: state, events, ok: false, error: "无可行路径" };

    const from = clone(actor.pos);
    actor.pos = clone(moveTo);
    actor.movedThisTurn = true;
    events.push({ type: "unit_moved", unitId: actorId, from, to: clone(moveTo), path });

    // 落点地形触发
    triggerTerrain(state, actor, events);
    const dead = new Set<string>(state.units.filter((u) => u.hp <= 0 && u.instanceId !== actorId).map((u) => u.instanceId));
    processDeaths(state, events, dead);

    this.finalize(state, events);
    return { nextState: state, events, ok: true };
  }

  private doSkill(
    state: BattleState,
    events: BattleEvent[],
    actorId: string,
    action: Extract<BattleAction, { type: "skill" }>
  ): BattleResult {
    const actor = unitById(state, actorId)!;
    if (actor.actedThisTurn) return { nextState: state, events, ok: false, error: "本回合已行动" };
    if (!actor.skills.includes(action.skillId)) return { nextState: state, events, ok: false, error: "未持有该技能" };

    const skill = this.registry.skill(action.skillId);
    const target: SkillTarget = {
      cell: action.targetCell,
      direction: action.direction,
      unitId: action.targetUnitId,
    };
    if (!canCast(state, actor, skill, target)) {
      return { nextState: state, events, ok: false, error: "施法非法" };
    }

    resolveSkillEffects(state, actor, skill, this.registry, target, events);
    actor.actedThisTurn = true;
    actor.cooldowns[skill.id] = skill.cooldown;

    this.finalize(state, events);
    return { nextState: state, events, ok: true };
  }

  /** 使用消耗品：核心层解析效果并校验目标阵营与射程；占用技能行动，仍可移动。 */
  private doUseItem(
    state: BattleState,
    events: BattleEvent[],
    actorId: string,
    action: Extract<BattleAction, { type: "use_item" }>
  ): BattleResult {
    const actor = unitById(state, actorId)!;
    if (actor.actedThisTurn) return { nextState: state, events, ok: false, error: "本回合已行动" };
    const item = this.resolveItem?.(action.itemId);
    if (!item) return { nextState: state, events, ok: false, error: "无效物品" };
    const target = unitById(state, action.targetUnitId);
    if (!target || !isAlive(target)) return { nextState: state, events, ok: false, error: "无效目标" };
    if (target.faction !== actor.faction) return { nextState: state, events, ok: false, error: "只能对友方使用" };
    if (chebyshev(actor.pos, target.pos) > item.range) {
      return { nextState: state, events, ok: false, error: "目标超出道具射程" };
    }

    events.push({ type: "item_used", userId: actorId, itemId: action.itemId, targetUnitId: target.instanceId });
    applyItemEffect(state, target, item.effect, events);
    actor.actedThisTurn = true;

    this.finalize(state, events);
    return { nextState: state, events, ok: true };
  }

  /**
   * 调息：恢复少量生命（REST_HEAL_RATIO × 最大生命，按缺口截断），并结束该单位本回合全部行动。
   * 占用「技能行动」：已用过技能/道具则不可调息；调息后也不可再移动（原地休息）。
   */
  private doRest(state: BattleState, events: BattleEvent[], actorId: string): BattleResult {
    const actor = unitById(state, actorId)!;
    if (actor.actedThisTurn) return { nextState: state, events, ok: false, error: "本回合已行动" };

    const healed = Math.min(restHealAmount(actor.maxHp), actor.maxHp - actor.hp);
    if (healed > 0) heal(state, actor, healed, events);
    actor.movedThisTurn = true;
    actor.actedThisTurn = true;

    this.finalize(state, events);
    return { nextState: state, events, ok: true };
  }

  private finalize(state: BattleState, events: BattleEvent[]): void {
    const outcome = evaluateOutcome(state);
    if (outcome && !state.outcome) {
      state.outcome = outcome;
      events.push({ type: "battle_ended", outcome });
    }
  }
}
