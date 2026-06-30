System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3", "__unresolved_4", "__unresolved_5"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, cloneState, livingUnits, unitById, eq, manhattan, clone, computeMoveRange, getCastableCells, canCast, evaluateForEnemy, EnemyAI, _crd;

  /** 纯移动计划补一个 wait 收尾，避免该单位本回合再被选中。 */
  function ensureActed(actions, actorId) {
    return [...actions, {
      type: "wait",
      actorId
    }];
  }

  function _reportPossibleCrUseOfBattleState(extras) {
    _reporterNs.report("BattleState", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfcloneState(extras) {
    _reporterNs.report("cloneState", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOflivingUnits(extras) {
    _reporterNs.report("livingUnits", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfunitById(extras) {
    _reporterNs.report("unitById", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfPosition(extras) {
    _reporterNs.report("Position", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDirection(extras) {
    _reporterNs.report("Direction", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfeq(extras) {
    _reporterNs.report("eq", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmanhattan(extras) {
    _reporterNs.report("manhattan", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfclone(extras) {
    _reporterNs.report("clone", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfUnit(extras) {
    _reporterNs.report("Unit", "../unit/Unit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfContentRegistry(extras) {
    _reporterNs.report("ContentRegistry", "../content/Registry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBattleSimulator(extras) {
    _reporterNs.report("BattleSimulator", "../simulator/BattleSimulator", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBattleAction(extras) {
    _reporterNs.report("BattleAction", "../simulator/BattleSimulator", _context.meta, extras);
  }

  function _reportPossibleCrUseOfcomputeMoveRange(extras) {
    _reporterNs.report("computeMoveRange", "../pathfinding/pathfinding", _context.meta, extras);
  }

  function _reportPossibleCrUseOfgetCastableCells(extras) {
    _reporterNs.report("getCastableCells", "../skill/resolveSkill", _context.meta, extras);
  }

  function _reportPossibleCrUseOfcanCast(extras) {
    _reporterNs.report("canCast", "../skill/resolveSkill", _context.meta, extras);
  }

  function _reportPossibleCrUseOfevaluateForEnemy(extras) {
    _reporterNs.report("evaluateForEnemy", "../evaluator/BattleEvaluator", _context.meta, extras);
  }

  _export("EnemyAI", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      cloneState = _unresolved_2.cloneState;
      livingUnits = _unresolved_2.livingUnits;
      unitById = _unresolved_2.unitById;
    }, function (_unresolved_3) {
      eq = _unresolved_3.eq;
      manhattan = _unresolved_3.manhattan;
      clone = _unresolved_3.clone;
    }, function (_unresolved_4) {
      computeMoveRange = _unresolved_4.computeMoveRange;
    }, function (_unresolved_5) {
      getCastableCells = _unresolved_5.getCastableCells;
      canCast = _unresolved_5.canCast;
    }, function (_unresolved_6) {
      evaluateForEnemy = _unresolved_6.evaluateForEnemy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "c6957RIDhBP4pVs2/5QIx2Z", "EnemyAI", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 敌人 AI（MVP 评分函数）。
       * 对每个敌方单位枚举「移动 + 技能」组合，用 BattleSimulator 模拟、用 BattleEvaluator 打分，取最优。
       * AI 与玩家复用同一套模拟器，保证行为可预测、可测试。
       */


      _export("EnemyAI", EnemyAI = class EnemyAI {
        constructor(registry, simulator) {
          this.registry = registry;
          this.simulator = simulator;
        }
        /**
         * 规划「当前行动的敌方单位」（速度初动：一次只有一个单位行动），
         * 返回应依次执行的行动序列（末尾含 end_turn 推进到下一个行动单位）。
         */


        planTurn(state) {
          const actorId = state.activeUnitId;
          const actor = actorId ? (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
            error: Error()
          }), unitById) : unitById)(state, actorId) : undefined;

          if (!actor || actor.faction !== "enemy" || actor.hp <= 0) {
            return [{
              type: "end_turn"
            }];
          }

          const plan = this.bestPlanForUnit((_crd && cloneState === void 0 ? (_reportPossibleCrUseOfcloneState({
            error: Error()
          }), cloneState) : cloneState)(state), actorId);
          return [...plan.actions, {
            type: "end_turn"
          }];
        }
        /** 为单个单位枚举最优计划。 */


        bestPlanForUnit(state, actorId) {
          const actor = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
            error: Error()
          }), unitById) : unitById)(state, actorId); // 基线：待机（按最终站位统一计分）。

          let best = {
            actions: [{
              type: "wait",
              actorId
            }],
            score: this.scorePlan(state, [{
              type: "wait",
              actorId
            }], actorId)
          }; // 候选站位：当前格 + 可移动格

          const stands = [(_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
            error: Error()
          }), clone) : clone)(actor.pos), ...(_crd && computeMoveRange === void 0 ? (_reportPossibleCrUseOfcomputeMoveRange({
            error: Error()
          }), computeMoveRange) : computeMoveRange)(state, actorId)];

          for (const stand of stands) {
            const moveActions = (_crd && eq === void 0 ? (_reportPossibleCrUseOfeq({
              error: Error()
            }), eq) : eq)(stand, actor.pos) ? [] : [{
              type: "move",
              actorId,
              moveTo: (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
                error: Error()
              }), clone) : clone)(stand)
            }]; // 仅移动（不攻击）

            const moveScore = this.scorePlan(state, moveActions, actorId);
            if (moveScore > best.score) best = {
              actions: ensureActed(moveActions, actorId),
              score: moveScore
            }; // 在该站位尝试每个技能

            const afterMove = moveActions.length ? this.applyAll(state, moveActions) : state;
            const movedActor = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
              error: Error()
            }), unitById) : unitById)(afterMove, actorId);
            if (!movedActor) continue;

            for (const skillId of movedActor.skills) {
              const skill = this.registry.skill(skillId);

              for (const target of this.skillTargets(afterMove, movedActor, skillId)) {
                if (!(_crd && canCast === void 0 ? (_reportPossibleCrUseOfcanCast({
                  error: Error()
                }), canCast) : canCast)(afterMove, movedActor, skill, target)) continue;
                const skillAction = {
                  type: "skill",
                  actorId,
                  skillId,
                  targetCell: target.cell,
                  targetUnitId: target.unitId,
                  direction: target.direction
                };
                const seq = [...moveActions, skillAction];
                const score = this.scorePlan(state, seq, actorId);
                if (score > best.score) best = {
                  actions: seq,
                  score
                };
              }
            }
          }

          return best;
        }
        /** 枚举一个技能的候选目标（敌人 AI：瞄准玩家）。 */


        skillTargets(state, actor, skillId) {
          const skill = this.registry.skill(skillId);
          const targets = [];
          const players = (_crd && livingUnits === void 0 ? (_reportPossibleCrUseOflivingUnits({
            error: Error()
          }), livingUnits) : livingUnits)(state, "player");

          if (skill.targetType === "direction") {
            for (const dir of ["up", "down", "left", "right"]) targets.push({
              direction: dir
            });

            return targets;
          }

          if (skill.targetType === "unit") {
            for (const p of players) targets.push({
              unitId: p.instanceId,
              cell: (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
                error: Error()
              }), clone) : clone)(p.pos)
            });

            return targets;
          } // cell：优先选玩家所在格及其周围的施法点


          const castable = (_crd && getCastableCells === void 0 ? (_reportPossibleCrUseOfgetCastableCells({
            error: Error()
          }), getCastableCells) : getCastableCells)(state, actor, skill);
          const interesting = new Set();

          for (const c of castable) {
            // 只考虑靠近某个玩家的施法点，减少枚举
            if (players.some(p => (_crd && manhattan === void 0 ? (_reportPossibleCrUseOfmanhattan({
              error: Error()
            }), manhattan) : manhattan)(p.pos, c) <= 2)) {
              const k = `${c.x},${c.y}`;

              if (!interesting.has(k)) {
                interesting.add(k);
                targets.push({
                  cell: (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
                    error: Error()
                  }), clone) : clone)(c)
                });
              }
            }
          }

          return targets;
        }

        applyAll(state, actions) {
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


        scorePlan(state, actions, actorId) {
          const result = this.applyAll(state, actions);
          let score = (_crd && evaluateForEnemy === void 0 ? (_reportPossibleCrUseOfevaluateForEnemy({
            error: Error()
          }), evaluateForEnemy) : evaluateForEnemy)(result);
          const actor = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
            error: Error()
          }), unitById) : unitById)(result, actorId);
          if (actor && actor.hp > 0) score += this.approachBonus(result, actor);
          return score;
        }
        /** 靠近玩家的进攻倾向：近战越近越好；远程偏好 3 格。 */


        approachBonus(state, actor) {
          const players = (_crd && livingUnits === void 0 ? (_reportPossibleCrUseOflivingUnits({
            error: Error()
          }), livingUnits) : livingUnits)(state, "player");
          if (players.length === 0) return 0;
          const d = Math.min(...players.map(p => (_crd && manhattan === void 0 ? (_reportPossibleCrUseOfmanhattan({
            error: Error()
          }), manhattan) : manhattan)(p.pos, actor.pos)));
          if (actor.aiProfile === "ranged") return -Math.abs(d - 3) * 3;
          return -d * 3;
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=e6f77a989a9cbe83ae462c97829e3c78004e4349.js.map