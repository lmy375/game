System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3", "__unresolved_4", "__unresolved_5", "__unresolved_6"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, ALL_DIRECTIONS, DIRECTION_VECTOR, add, eq, clone, directionTo, manhattan, unitAt, isAlive, resolvePattern, applyPush, applyPull, applyPullToCenter, applyKnockback, applySwap, applyArrangeLine, computeDamage, dealDamage, heal, applyStatus, triggerTerrain, processDeaths, _crd;

  /** 计算技能的施法目标点候选（用于预览与 AI 枚举）。 */
  function getCastableCells(state, caster, skill) {
    const range = skill.castRange;
    const cells = [];

    const within = (min, max) => {
      for (let x = 0; x < state.board.width; x++) {
        for (let y = 0; y < state.board.height; y++) {
          const p = {
            x,
            y
          };
          const d = (_crd && manhattan === void 0 ? (_reportPossibleCrUseOfmanhattan({
            error: Error()
          }), manhattan) : manhattan)(caster.pos, p);
          if (d >= min && d <= max) cells.push(p);
        }
      }
    };

    switch (range.type) {
      case "self":
        cells.push((_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
          error: Error()
        }), clone) : clone)(caster.pos));
        break;

      case "melee":
        for (const dir of _crd && ALL_DIRECTIONS === void 0 ? (_reportPossibleCrUseOfALL_DIRECTIONS({
          error: Error()
        }), ALL_DIRECTIONS) : ALL_DIRECTIONS) {
          const p = (_crd && add === void 0 ? (_reportPossibleCrUseOfadd({
            error: Error()
          }), add) : add)(caster.pos, (_crd && DIRECTION_VECTOR === void 0 ? (_reportPossibleCrUseOfDIRECTION_VECTOR({
            error: Error()
          }), DIRECTION_VECTOR) : DIRECTION_VECTOR)[dir]);
          if (state.board.inBounds(p)) cells.push(p);
        }

        break;

      case "distance":
        within(range.min, range.max);
        break;

      case "direction":
        // 方向技能由 direction 选择，这里返回前方第一格作为代表点
        for (const dir of _crd && ALL_DIRECTIONS === void 0 ? (_reportPossibleCrUseOfALL_DIRECTIONS({
          error: Error()
        }), ALL_DIRECTIONS) : ALL_DIRECTIONS) {
          const p = (_crd && add === void 0 ? (_reportPossibleCrUseOfadd({
            error: Error()
          }), add) : add)(caster.pos, (_crd && DIRECTION_VECTOR === void 0 ? (_reportPossibleCrUseOfDIRECTION_VECTOR({
            error: Error()
          }), DIRECTION_VECTOR) : DIRECTION_VECTOR)[dir]);
          if (state.board.inBounds(p)) cells.push(p);
        }

        break;
    }

    return cells;
  }
  /** 解析施法朝向与 Pattern 原点。 */


  function resolveTargeting(caster, skill, pattern, target) {
    let dir;
    let targetCell;

    if (skill.targetType === "direction") {
      var _target$direction;

      dir = (_target$direction = target.direction) != null ? _target$direction : caster.facing;
      targetCell = (_crd && add === void 0 ? (_reportPossibleCrUseOfadd({
        error: Error()
      }), add) : add)(caster.pos, (_crd && DIRECTION_VECTOR === void 0 ? (_reportPossibleCrUseOfDIRECTION_VECTOR({
        error: Error()
      }), DIRECTION_VECTOR) : DIRECTION_VECTOR)[dir]);
    } else {
      var _target$cell;

      targetCell = (_target$cell = target.cell) != null ? _target$cell : (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
        error: Error()
      }), clone) : clone)(caster.pos);

      if (pattern.rotatable) {
        dir = (_crd && eq === void 0 ? (_reportPossibleCrUseOfeq({
          error: Error()
        }), eq) : eq)(targetCell, caster.pos) ? caster.facing : (_crd && directionTo === void 0 ? (_reportPossibleCrUseOfdirectionTo({
          error: Error()
        }), directionTo) : directionTo)(caster.pos, targetCell);
      } else {
        dir = caster.facing;
      }
    }

    const origin = pattern.anchor === "caster_direction" ? (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
      error: Error()
    }), clone) : clone)(caster.pos) : (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
      error: Error()
    }), clone) : clone)(targetCell);
    return {
      origin,
      dir,
      targetCell
    };
  }
  /** 解析最终命中格（已旋转、已平移）。 */


  function resolveHitCells(caster, skill, registry, target) {
    const pattern = registry.pattern(skill.patternId);
    const targeting = resolveTargeting(caster, skill, pattern, target);
    const cells = (_crd && resolvePattern === void 0 ? (_reportPossibleCrUseOfresolvePattern({
      error: Error()
    }), resolvePattern) : resolvePattern)(pattern, targeting.origin, targeting.dir);
    return {
      cells,
      targeting
    };
  }

  function matchesFilter(caster, u, filter) {
    switch (filter) {
      case "enemy":
        return u.faction !== caster.faction;

      case "ally":
        return u.faction === caster.faction && u.instanceId !== caster.instanceId;

      case "self":
        return u.instanceId === caster.instanceId;

      case "any":
        return true;
    }
  }

  /** 校验技能能否施放。 */
  function canCast(state, caster, skill, target) {
    var _caster$cooldowns$ski;

    if (!(_crd && isAlive === void 0 ? (_reportPossibleCrUseOfisAlive({
      error: Error()
    }), isAlive) : isAlive)(caster)) return false;
    if (((_caster$cooldowns$ski = caster.cooldowns[skill.id]) != null ? _caster$cooldowns$ski : 0) > 0) return false;

    if (skill.targetType === "direction") {
      return target.direction !== undefined;
    }

    if (skill.targetType === "unit") {
      const tu = target.unitId ? state.units.find(u => u.instanceId === target.unitId) : undefined;
      if (!tu || !(_crd && isAlive === void 0 ? (_reportPossibleCrUseOfisAlive({
        error: Error()
      }), isAlive) : isAlive)(tu)) return false;
      target = {
        cell: tu.pos
      };
    }

    if (!target.cell) return false; // 施法范围校验

    const candidates = getCastableCells(state, caster, skill);
    return candidates.some(c => (_crd && eq === void 0 ? (_reportPossibleCrUseOfeq({
      error: Error()
    }), eq) : eq)(c, target.cell));
  }
  /**
   * 执行技能效果。假定 canCast 已通过（AI/UI 负责校验）。
   */


  function resolveSkillEffects(state, caster, skill, registry, target, events) {
    var _skill$targetFilter;

    const filter = (_skill$targetFilter = skill.targetFilter) != null ? _skill$targetFilter : "enemy"; // unit 目标转 cell

    let effectiveTarget = target;

    if (skill.targetType === "unit" && target.unitId) {
      const tu = state.units.find(u => u.instanceId === target.unitId);
      if (tu) effectiveTarget = {
        cell: (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
          error: Error()
        }), clone) : clone)(tu.pos),
        unitId: target.unitId
      };
    }

    const {
      cells,
      targeting
    } = resolveHitCells(caster, skill, registry, effectiveTarget);
    events.push({
      type: "skill_cast",
      casterId: caster.instanceId,
      skillId: skill.id,
      targetCell: targeting.targetCell
    });
    caster.facing = targeting.dir; // 1) 收集命中单位及其效果

    const hitMap = new Map();

    for (const cell of cells) {
      var _skill$cellEffects$ce, _skill$cellEffects$al;

      if (!state.board.inBounds(cell.pos)) continue;
      const u = (_crd && unitAt === void 0 ? (_reportPossibleCrUseOfunitAt({
        error: Error()
      }), unitAt) : unitAt)(state, cell.pos);
      if (!u || !(_crd && isAlive === void 0 ? (_reportPossibleCrUseOfisAlive({
        error: Error()
      }), isAlive) : isAlive)(u)) continue;
      if (!matchesFilter(caster, u, filter)) continue; // effectKey 自身的效果 + 通配 "all"；当 effectKey 本身就是 "all" 时不重复叠加。

      const keyOps = (_skill$cellEffects$ce = skill.cellEffects[cell.effectKey]) != null ? _skill$cellEffects$ce : [];
      const allOps = cell.effectKey === "all" ? [] : (_skill$cellEffects$al = skill.cellEffects["all"]) != null ? _skill$cellEffects$al : [];
      const ops = [...keyOps, ...allOps];
      const existing = hitMap.get(u.instanceId);
      if (existing) existing.ops.push(...ops);else hitMap.set(u.instanceId, {
        unit: u,
        ops
      });
    }

    const hits = [...hitMap.values()];
    const displaced = new Set();
    const alreadyDead = new Set(state.units.filter(u => u.hp <= 0).map(u => u.instanceId)); // 2) 位移阶段
    // 2a) 群体整队 arrange_line（一次处理所有带该 op 的单位）

    const lineUnits = hits.filter(h => h.ops.some(o => o.type === "arrange_line"));

    if (lineUnits.length > 0) {
      const op = lineUnits[0].ops.find(o => o.type === "arrange_line");
      (_crd && applyArrangeLine === void 0 ? (_reportPossibleCrUseOfapplyArrangeLine({
        error: Error()
      }), applyArrangeLine) : applyArrangeLine)(state, lineUnits.map(h => h.unit), targeting.targetCell, targeting.dir, op.maxUnits, events);
      lineUnits.forEach(h => displaced.add(h.unit.instanceId));
    } // 2b) 聚拢：按到中心距离从近到远，避免互相抢位


    const gatherUnits = hits.filter(h => h.ops.some(o => o.type === "pull_to_center")).sort((a, b) => (_crd && manhattan === void 0 ? (_reportPossibleCrUseOfmanhattan({
      error: Error()
    }), manhattan) : manhattan)(a.unit.pos, targeting.targetCell) - (_crd && manhattan === void 0 ? (_reportPossibleCrUseOfmanhattan({
      error: Error()
    }), manhattan) : manhattan)(b.unit.pos, targeting.targetCell));

    for (const h of gatherUnits) {
      const op = h.ops.find(o => o.type === "pull_to_center");
      const r = (_crd && applyPullToCenter === void 0 ? (_reportPossibleCrUseOfapplyPullToCenter({
        error: Error()
      }), applyPullToCenter) : applyPullToCenter)(state, h.unit, targeting.targetCell, op.maxDistance, events);
      if (r.moved > 0) displaced.add(h.unit.instanceId);
    } // 2c) 逐个位移：push / pull / knockback / swap（按到施法者距离排序保证可预测）


    const ordered = [...hits].sort((a, b) => (_crd && manhattan === void 0 ? (_reportPossibleCrUseOfmanhattan({
      error: Error()
    }), manhattan) : manhattan)(a.unit.pos, caster.pos) - (_crd && manhattan === void 0 ? (_reportPossibleCrUseOfmanhattan({
      error: Error()
    }), manhattan) : manhattan)(b.unit.pos, caster.pos));

    for (const h of ordered) {
      for (const op of h.ops) {
        if (op.type === "push") {
          const r = (_crd && applyPush === void 0 ? (_reportPossibleCrUseOfapplyPush({
            error: Error()
          }), applyPush) : applyPush)(state, h.unit, targeting.dir, op.distance, events);
          if (r.moved > 0) displaced.add(h.unit.instanceId);
        } else if (op.type === "pull") {
          const r = (_crd && applyPull === void 0 ? (_reportPossibleCrUseOfapplyPull({
            error: Error()
          }), applyPull) : applyPull)(state, h.unit, caster.pos, op.distance, events);
          if (r.moved > 0) displaced.add(h.unit.instanceId);
        } else if (op.type === "knockback") {
          const r = (_crd && applyKnockback === void 0 ? (_reportPossibleCrUseOfapplyKnockback({
            error: Error()
          }), applyKnockback) : applyKnockback)(state, h.unit, targeting.dir, op.distance, op.collisionDamage, events);
          if (r.moved > 0) displaced.add(h.unit.instanceId);
        } else if (op.type === "swap") {
          if ((_crd && applySwap === void 0 ? (_reportPossibleCrUseOfapplySwap({
            error: Error()
          }), applySwap) : applySwap)(state, caster, h.unit, events)) {
            displaced.add(h.unit.instanceId);
            displaced.add(caster.instanceId);
          }
        }
      }
    } // 3) 地形触发（仅对发生位移的单位）


    for (const id of displaced) {
      const u = state.units.find(x => x.instanceId === id);
      if (u) (_crd && triggerTerrain === void 0 ? (_reportPossibleCrUseOftriggerTerrain({
        error: Error()
      }), triggerTerrain) : triggerTerrain)(state, u, events);
    } // 4) 伤害阶段


    for (const h of hits) {
      for (const op of h.ops) {
        if (op.type === "damage") {
          (_crd && dealDamage === void 0 ? (_reportPossibleCrUseOfdealDamage({
            error: Error()
          }), dealDamage) : dealDamage)(state, h.unit, (_crd && computeDamage === void 0 ? (_reportPossibleCrUseOfcomputeDamage({
            error: Error()
          }), computeDamage) : computeDamage)(caster, h.unit, op.element, op.multiplier), `skill:${skill.id}`, events);
        } else if (op.type === "heal") {
          (_crd && heal === void 0 ? (_reportPossibleCrUseOfheal({
            error: Error()
          }), heal) : heal)(state, h.unit, Math.round(caster.stats.magic * op.multiplier), events);
        }
      }
    } // 5) 状态阶段


    for (const h of hits) {
      for (const op of h.ops) {
        if (op.type === "apply_status") {
          (_crd && applyStatus === void 0 ? (_reportPossibleCrUseOfapplyStatus({
            error: Error()
          }), applyStatus) : applyStatus)(h.unit, op.status, op.duration, op.magnitude, events);
        }
      }
    } // 6) 死亡判定


    (_crd && processDeaths === void 0 ? (_reportPossibleCrUseOfprocessDeaths({
      error: Error()
    }), processDeaths) : processDeaths)(state, events, alreadyDead);
  }

  function _reportPossibleCrUseOfPosition(extras) {
    _reporterNs.report("Position", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDirection(extras) {
    _reporterNs.report("Direction", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfALL_DIRECTIONS(extras) {
    _reporterNs.report("ALL_DIRECTIONS", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDIRECTION_VECTOR(extras) {
    _reporterNs.report("DIRECTION_VECTOR", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfadd(extras) {
    _reporterNs.report("add", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfeq(extras) {
    _reporterNs.report("eq", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfclone(extras) {
    _reporterNs.report("clone", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfdirectionTo(extras) {
    _reporterNs.report("directionTo", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmanhattan(extras) {
    _reporterNs.report("manhattan", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBattleState(extras) {
    _reporterNs.report("BattleState", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfunitAt(extras) {
    _reporterNs.report("unitAt", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfUnit(extras) {
    _reporterNs.report("Unit", "../unit/Unit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfisAlive(extras) {
    _reporterNs.report("isAlive", "../unit/Unit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSkillDef(extras) {
    _reporterNs.report("SkillDef", "./Skill", _context.meta, extras);
  }

  function _reportPossibleCrUseOfEffectOp(extras) {
    _reporterNs.report("EffectOp", "./Skill", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTargetFilter(extras) {
    _reporterNs.report("TargetFilter", "./Skill", _context.meta, extras);
  }

  function _reportPossibleCrUseOfPatternDef(extras) {
    _reporterNs.report("PatternDef", "../pattern/Pattern", _context.meta, extras);
  }

  function _reportPossibleCrUseOfresolvePattern(extras) {
    _reporterNs.report("resolvePattern", "../pattern/Pattern", _context.meta, extras);
  }

  function _reportPossibleCrUseOfResolvedPatternCell(extras) {
    _reporterNs.report("ResolvedPatternCell", "../pattern/Pattern", _context.meta, extras);
  }

  function _reportPossibleCrUseOfContentRegistry(extras) {
    _reporterNs.report("ContentRegistry", "../content/Registry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBattleEvent(extras) {
    _reporterNs.report("BattleEvent", "../state/events", _context.meta, extras);
  }

  function _reportPossibleCrUseOfapplyPush(extras) {
    _reporterNs.report("applyPush", "../displacement/displacement", _context.meta, extras);
  }

  function _reportPossibleCrUseOfapplyPull(extras) {
    _reporterNs.report("applyPull", "../displacement/displacement", _context.meta, extras);
  }

  function _reportPossibleCrUseOfapplyPullToCenter(extras) {
    _reporterNs.report("applyPullToCenter", "../displacement/displacement", _context.meta, extras);
  }

  function _reportPossibleCrUseOfapplyKnockback(extras) {
    _reporterNs.report("applyKnockback", "../displacement/displacement", _context.meta, extras);
  }

  function _reportPossibleCrUseOfapplySwap(extras) {
    _reporterNs.report("applySwap", "../displacement/displacement", _context.meta, extras);
  }

  function _reportPossibleCrUseOfapplyArrangeLine(extras) {
    _reporterNs.report("applyArrangeLine", "../displacement/displacement", _context.meta, extras);
  }

  function _reportPossibleCrUseOfcomputeDamage(extras) {
    _reporterNs.report("computeDamage", "./combat", _context.meta, extras);
  }

  function _reportPossibleCrUseOfdealDamage(extras) {
    _reporterNs.report("dealDamage", "./combat", _context.meta, extras);
  }

  function _reportPossibleCrUseOfheal(extras) {
    _reporterNs.report("heal", "./combat", _context.meta, extras);
  }

  function _reportPossibleCrUseOfapplyStatus(extras) {
    _reporterNs.report("applyStatus", "./combat", _context.meta, extras);
  }

  function _reportPossibleCrUseOftriggerTerrain(extras) {
    _reporterNs.report("triggerTerrain", "./combat", _context.meta, extras);
  }

  function _reportPossibleCrUseOfprocessDeaths(extras) {
    _reporterNs.report("processDeaths", "./combat", _context.meta, extras);
  }

  _export({
    getCastableCells: getCastableCells,
    resolveTargeting: resolveTargeting,
    resolveHitCells: resolveHitCells,
    canCast: canCast,
    resolveSkillEffects: resolveSkillEffects
  });

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      ALL_DIRECTIONS = _unresolved_2.ALL_DIRECTIONS;
      DIRECTION_VECTOR = _unresolved_2.DIRECTION_VECTOR;
      add = _unresolved_2.add;
      eq = _unresolved_2.eq;
      clone = _unresolved_2.clone;
      directionTo = _unresolved_2.directionTo;
      manhattan = _unresolved_2.manhattan;
    }, function (_unresolved_3) {
      unitAt = _unresolved_3.unitAt;
    }, function (_unresolved_4) {
      isAlive = _unresolved_4.isAlive;
    }, function (_unresolved_5) {
      resolvePattern = _unresolved_5.resolvePattern;
    }, function (_unresolved_6) {
      applyPush = _unresolved_6.applyPush;
      applyPull = _unresolved_6.applyPull;
      applyPullToCenter = _unresolved_6.applyPullToCenter;
      applyKnockback = _unresolved_6.applyKnockback;
      applySwap = _unresolved_6.applySwap;
      applyArrangeLine = _unresolved_6.applyArrangeLine;
    }, function (_unresolved_7) {
      computeDamage = _unresolved_7.computeDamage;
      dealDamage = _unresolved_7.dealDamage;
      heal = _unresolved_7.heal;
      applyStatus = _unresolved_7.applyStatus;
      triggerTerrain = _unresolved_7.triggerTerrain;
      processDeaths = _unresolved_7.processDeaths;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "c413foPKtBIDpGIXwnv8Hca", "resolveSkill", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 技能结算核心。
       * 结算顺序（MVP）：Pattern → 位移 → 地形 → 伤害 → 状态 → 死亡判断。
       * 直接修改传入 state（调用方先克隆），向 events 追加事件。
       */


      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=fdf0465c34578639ab3fdd60235b9164915da3e7.js.map