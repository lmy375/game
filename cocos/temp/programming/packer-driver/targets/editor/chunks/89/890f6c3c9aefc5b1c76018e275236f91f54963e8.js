System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3", "__unresolved_4", "__unresolved_5", "__unresolved_6", "__unresolved_7"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, eq, clone, cloneState, unitById, evaluateOutcome, isStandable, isAlive, findPath, computeMoveRange, canCast, resolveSkillEffects, triggerTerrain, processDeaths, advanceInitiative, BattleSimulator, _crd;

  function _reportPossibleCrUseOfPosition(extras) {
    _reporterNs.report("Position", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDirection(extras) {
    _reporterNs.report("Direction", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfeq(extras) {
    _reporterNs.report("eq", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfclone(extras) {
    _reporterNs.report("clone", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBattleState(extras) {
    _reporterNs.report("BattleState", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfcloneState(extras) {
    _reporterNs.report("cloneState", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfunitById(extras) {
    _reporterNs.report("unitById", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfevaluateOutcome(extras) {
    _reporterNs.report("evaluateOutcome", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfisStandable(extras) {
    _reporterNs.report("isStandable", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfisAlive(extras) {
    _reporterNs.report("isAlive", "../unit/Unit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBattleEvent(extras) {
    _reporterNs.report("BattleEvent", "../state/events", _context.meta, extras);
  }

  function _reportPossibleCrUseOfContentRegistry(extras) {
    _reporterNs.report("ContentRegistry", "../content/Registry", _context.meta, extras);
  }

  function _reportPossibleCrUseOffindPath(extras) {
    _reporterNs.report("findPath", "../pathfinding/pathfinding", _context.meta, extras);
  }

  function _reportPossibleCrUseOfcomputeMoveRange(extras) {
    _reporterNs.report("computeMoveRange", "../pathfinding/pathfinding", _context.meta, extras);
  }

  function _reportPossibleCrUseOfcanCast(extras) {
    _reporterNs.report("canCast", "../skill/resolveSkill", _context.meta, extras);
  }

  function _reportPossibleCrUseOfresolveSkillEffects(extras) {
    _reporterNs.report("resolveSkillEffects", "../skill/resolveSkill", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSkillTarget(extras) {
    _reporterNs.report("SkillTarget", "../skill/resolveSkill", _context.meta, extras);
  }

  function _reportPossibleCrUseOftriggerTerrain(extras) {
    _reporterNs.report("triggerTerrain", "../skill/combat", _context.meta, extras);
  }

  function _reportPossibleCrUseOfprocessDeaths(extras) {
    _reporterNs.report("processDeaths", "../skill/combat", _context.meta, extras);
  }

  function _reportPossibleCrUseOfadvanceInitiative(extras) {
    _reporterNs.report("advanceInitiative", "../turn/turn", _context.meta, extras);
  }

  _export("BattleSimulator", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      eq = _unresolved_2.eq;
      clone = _unresolved_2.clone;
    }, function (_unresolved_3) {
      cloneState = _unresolved_3.cloneState;
      unitById = _unresolved_3.unitById;
      evaluateOutcome = _unresolved_3.evaluateOutcome;
      isStandable = _unresolved_3.isStandable;
    }, function (_unresolved_4) {
      isAlive = _unresolved_4.isAlive;
    }, function (_unresolved_5) {
      findPath = _unresolved_5.findPath;
      computeMoveRange = _unresolved_5.computeMoveRange;
    }, function (_unresolved_6) {
      canCast = _unresolved_6.canCast;
      resolveSkillEffects = _unresolved_6.resolveSkillEffects;
    }, function (_unresolved_7) {
      triggerTerrain = _unresolved_7.triggerTerrain;
      processDeaths = _unresolved_7.processDeaths;
    }, function (_unresolved_8) {
      advanceInitiative = _unresolved_8.advanceInitiative;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "0c5b4+DgslGUJWjJl723yrX", "BattleSimulator", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 战斗模拟器：纯函数。simulate(state, action) -> { nextState, events }。
       * 不修改输入 state；预览与 AI 都复用这一套模拟。
       */


      _export("BattleSimulator", BattleSimulator = class BattleSimulator {
        constructor(registry) {
          this.registry = registry;
        }

        simulate(state, action) {
          const next = (_crd && cloneState === void 0 ? (_reportPossibleCrUseOfcloneState({
            error: Error()
          }), cloneState) : cloneState)(state);
          const events = [];

          if (next.outcome) {
            return {
              nextState: next,
              events,
              ok: false,
              error: "战斗已结束"
            };
          }

          if (action.type === "end_turn") {
            // 结束当前行动单位的回合，按速度推进到下一个行动单位。
            (_crd && advanceInitiative === void 0 ? (_reportPossibleCrUseOfadvanceInitiative({
              error: Error()
            }), advanceInitiative) : advanceInitiative)(next, events);
            this.finalize(next, events);
            return {
              nextState: next,
              events,
              ok: true
            };
          }

          const actor = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
            error: Error()
          }), unitById) : unitById)(next, action.actorId);
          if (!actor || !(_crd && isAlive === void 0 ? (_reportPossibleCrUseOfisAlive({
            error: Error()
          }), isAlive) : isAlive)(actor)) return {
            nextState: next,
            events,
            ok: false,
            error: "无效单位"
          };
          if (actor.instanceId !== next.activeUnitId) return {
            nextState: next,
            events,
            ok: false,
            error: "非当前行动单位"
          };

          switch (action.type) {
            case "move":
              return this.doMove(next, events, actor.instanceId, action.moveTo);

            case "skill":
              return this.doSkill(next, events, actor.instanceId, action);

            case "wait":
              {
                actor.movedThisTurn = true;
                actor.actedThisTurn = true;
                return {
                  nextState: next,
                  events,
                  ok: true
                };
              }
          }
        }

        doMove(state, events, actorId, moveTo) {
          const actor = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
            error: Error()
          }), unitById) : unitById)(state, actorId);
          if (actor.movedThisTurn) return {
            nextState: state,
            events,
            ok: false,
            error: "本回合已移动"
          };
          if ((_crd && eq === void 0 ? (_reportPossibleCrUseOfeq({
            error: Error()
          }), eq) : eq)(actor.pos, moveTo)) return {
            nextState: state,
            events,
            ok: false,
            error: "原地不动"
          };
          if (!(_crd && isStandable === void 0 ? (_reportPossibleCrUseOfisStandable({
            error: Error()
          }), isStandable) : isStandable)(state, moveTo, actorId)) return {
            nextState: state,
            events,
            ok: false,
            error: "目标格不可站立"
          };
          const reachable = (_crd && computeMoveRange === void 0 ? (_reportPossibleCrUseOfcomputeMoveRange({
            error: Error()
          }), computeMoveRange) : computeMoveRange)(state, actorId);

          if (!reachable.some(p => (_crd && eq === void 0 ? (_reportPossibleCrUseOfeq({
            error: Error()
          }), eq) : eq)(p, moveTo))) {
            return {
              nextState: state,
              events,
              ok: false,
              error: "超出移动范围"
            };
          }

          const path = (_crd && findPath === void 0 ? (_reportPossibleCrUseOffindPath({
            error: Error()
          }), findPath) : findPath)(state, actorId, moveTo);
          if (!path) return {
            nextState: state,
            events,
            ok: false,
            error: "无可行路径"
          };
          const from = (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
            error: Error()
          }), clone) : clone)(actor.pos);
          actor.pos = (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
            error: Error()
          }), clone) : clone)(moveTo);
          actor.movedThisTurn = true;
          events.push({
            type: "unit_moved",
            unitId: actorId,
            from,
            to: (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
              error: Error()
            }), clone) : clone)(moveTo),
            path
          }); // 落点地形触发

          (_crd && triggerTerrain === void 0 ? (_reportPossibleCrUseOftriggerTerrain({
            error: Error()
          }), triggerTerrain) : triggerTerrain)(state, actor, events);
          const dead = new Set(state.units.filter(u => u.hp <= 0 && u.instanceId !== actorId).map(u => u.instanceId));
          (_crd && processDeaths === void 0 ? (_reportPossibleCrUseOfprocessDeaths({
            error: Error()
          }), processDeaths) : processDeaths)(state, events, dead);
          this.finalize(state, events);
          return {
            nextState: state,
            events,
            ok: true
          };
        }

        doSkill(state, events, actorId, action) {
          const actor = (_crd && unitById === void 0 ? (_reportPossibleCrUseOfunitById({
            error: Error()
          }), unitById) : unitById)(state, actorId);
          if (actor.actedThisTurn) return {
            nextState: state,
            events,
            ok: false,
            error: "本回合已行动"
          };
          if (!actor.skills.includes(action.skillId)) return {
            nextState: state,
            events,
            ok: false,
            error: "未持有该技能"
          };
          const skill = this.registry.skill(action.skillId);
          const target = {
            cell: action.targetCell,
            direction: action.direction,
            unitId: action.targetUnitId
          };

          if (!(_crd && canCast === void 0 ? (_reportPossibleCrUseOfcanCast({
            error: Error()
          }), canCast) : canCast)(state, actor, skill, target)) {
            return {
              nextState: state,
              events,
              ok: false,
              error: "施法非法"
            };
          }

          (_crd && resolveSkillEffects === void 0 ? (_reportPossibleCrUseOfresolveSkillEffects({
            error: Error()
          }), resolveSkillEffects) : resolveSkillEffects)(state, actor, skill, this.registry, target, events);
          actor.actedThisTurn = true;
          actor.cooldowns[skill.id] = skill.cooldown;
          this.finalize(state, events);
          return {
            nextState: state,
            events,
            ok: true
          };
        }

        finalize(state, events) {
          const outcome = (_crd && evaluateOutcome === void 0 ? (_reportPossibleCrUseOfevaluateOutcome({
            error: Error()
          }), evaluateOutcome) : evaluateOutcome)(state);

          if (outcome && !state.outcome) {
            state.outcome = outcome;
            events.push({
              type: "battle_ended",
              outcome
            });
          }
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=890f6c3c9aefc5b1c76018e275236f91f54963e8.js.map