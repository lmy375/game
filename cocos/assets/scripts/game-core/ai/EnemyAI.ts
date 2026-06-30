// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 敌人 AI（MVP 评分函数）。
 * 对每个敌方单位枚举「移动 + 技能」组合，用 BattleSimulator 模拟、用 BattleEvaluator 打分，取最优。
 * AI 与玩家复用同一套模拟器，保证行为可预测、可测试。
 */
import { BattleState, cloneState, livingUnits, unitById } from "../state/BattleState";
import { Position, Direction, eq, manhattan, clone } from "../board/geometry";
import { Unit } from "../unit/Unit";
import { ContentRegistry } from "../content/Registry";
import { BattleSimulator, BattleAction } from "../simulator/BattleSimulator";
import { computeMoveRange } from "../pathfinding/pathfinding";
import { getCastableCells, canCast } from "../skill/resolveSkill";
import { evaluateForEnemy } from "../evaluator/BattleEvaluator";

interface Plan {
  actions: BattleAction[];
  score: number;
}

export class EnemyAI {
  constructor(
    private readonly registry: ContentRegistry,
    private readonly simulator: BattleSimulator
  ) {}

  /**
   * 规划「当前行动的敌方单位」（速度初动：一次只有一个单位行动），
   * 返回应依次执行的行动序列（末尾含 end_turn 推进到下一个行动单位）。
   */
  planTurn(state: BattleState): BattleAction[] {
    const actorId = state.activeUnitId;
    const actor = actorId ? unitById(state, actorId) : undefined;
    if (!actor || actor.faction !== "enemy" || actor.hp <= 0) {
      return [{ type: "end_turn" }];
    }
    const plan = this.bestPlanForUnit(cloneState(state), actorId!);
    return [...plan.actions, { type: "end_turn" }];
  }

  /** 为单个单位枚举最优计划。 */
  private bestPlanForUnit(state: BattleState, actorId: string): Plan {
    const actor = unitById(state, actorId)!;
    // 基线：待机（按最终站位统一计分）。
    let best: Plan = { actions: [{ type: "wait", actorId }], score: this.scorePlan(state, [{ type: "wait", actorId }], actorId) };

    // 候选站位：当前格 + 可移动格
    const stands: Position[] = [clone(actor.pos), ...computeMoveRange(state, actorId)];

    for (const stand of stands) {
      const moveActions: BattleAction[] = eq(stand, actor.pos)
        ? []
        : [{ type: "move", actorId, moveTo: clone(stand) }];

      // 仅移动（不攻击）
      const moveScore = this.scorePlan(state, moveActions, actorId);
      if (moveScore > best.score) best = { actions: ensureActed(moveActions, actorId), score: moveScore };

      // 在该站位尝试每个技能
      const afterMove = moveActions.length ? this.applyAll(state, moveActions) : state;
      const movedActor = unitById(afterMove, actorId);
      if (!movedActor) continue;

      for (const skillId of movedActor.skills) {
        const skill = this.registry.skill(skillId);
        for (const target of this.skillTargets(afterMove, movedActor, skillId)) {
          if (!canCast(afterMove, movedActor, skill, target)) continue;
          const skillAction: BattleAction = {
            type: "skill",
            actorId,
            skillId,
            targetCell: target.cell,
            targetUnitId: target.unitId,
            direction: target.direction,
          };
          const seq = [...moveActions, skillAction];
          const score = this.scorePlan(state, seq, actorId);
          if (score > best.score) best = { actions: seq, score };
        }
      }
    }

    return best;
  }

  /** 枚举一个技能的候选目标（敌人 AI：瞄准玩家）。 */
  private skillTargets(
    state: BattleState,
    actor: Unit,
    skillId: string
  ): Array<{ cell?: Position; unitId?: string; direction?: Direction }> {
    const skill = this.registry.skill(skillId);
    const targets: Array<{ cell?: Position; unitId?: string; direction?: Direction }> = [];
    const players = livingUnits(state, "player");

    if (skill.targetType === "direction") {
      for (const dir of ["up", "down", "left", "right"] as const) targets.push({ direction: dir });
      return targets;
    }
    if (skill.targetType === "unit") {
      for (const p of players) targets.push({ unitId: p.instanceId, cell: clone(p.pos) });
      return targets;
    }
    // cell：优先选玩家所在格及其周围的施法点
    const castable = getCastableCells(state, actor, skill);
    const interesting = new Set<string>();
    for (const c of castable) {
      // 只考虑靠近某个玩家的施法点，减少枚举
      if (players.some((p) => manhattan(p.pos, c) <= 2)) {
        const k = `${c.x},${c.y}`;
        if (!interesting.has(k)) {
          interesting.add(k);
          targets.push({ cell: clone(c) });
        }
      }
    }
    return targets;
  }

  private applyAll(state: BattleState, actions: BattleAction[]): BattleState {
    let s = state;
    for (const a of actions) {
      const res = this.simulator.simulate(s, a);
      if (res.ok) s = res.nextState;
    }
    return s;
  }

  /**
   * 统一计分：对计划结果态评分 + 按行动单位最终站位的进攻倾向。
   * 让「待机 / 仅移动 / 移动+技能」用同一标准比较，避免待机总是占优。
   */
  private scorePlan(state: BattleState, actions: BattleAction[], actorId: string): number {
    const result = this.applyAll(state, actions);
    let score = evaluateForEnemy(result);
    const actor = unitById(result, actorId);
    if (actor && actor.hp > 0) score += this.approachBonus(result, actor);
    return score;
  }

  /** 靠近玩家的进攻倾向：近战越近越好；远程偏好 3 格。 */
  private approachBonus(state: BattleState, actor: Unit): number {
    const players = livingUnits(state, "player");
    if (players.length === 0) return 0;
    const d = Math.min(...players.map((p) => manhattan(p.pos, actor.pos)));
    if (actor.aiProfile === "ranged") return -Math.abs(d - 3) * 3;
    return -d * 3;
  }

}

/** 纯移动计划补一个 wait 收尾，避免该单位本回合再被选中。 */
function ensureActed(actions: BattleAction[], actorId: string): BattleAction[] {
  return [...actions, { type: "wait", actorId }];
}
