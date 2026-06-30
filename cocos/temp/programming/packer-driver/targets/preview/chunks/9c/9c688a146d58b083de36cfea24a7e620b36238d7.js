System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, isAlive, hasStatus, TERRAIN_DAMAGE, clone, _crd;

  /** 根据元素选择施法者攻击数值。 */
  function attackStat(caster, element) {
    return element === "physical" ? caster.stats.attack : caster.stats.magic;
  }
  /** 计算一次伤害的最终值（含防御与易伤）。 */


  function computeDamage(caster, target, element, multiplier) {
    var base = attackStat(caster, element) * multiplier;
    var dmg = base - target.stats.defense;
    if ((_crd && hasStatus === void 0 ? (_reportPossibleCrUseOfhasStatus({
      error: Error()
    }), hasStatus) : hasStatus)(target, "vulnerable")) dmg *= 1.5;
    return Math.max(1, Math.round(dmg));
  }

  function dealDamage(_state, target, amount, source, events) {
    if (!(_crd && isAlive === void 0 ? (_reportPossibleCrUseOfisAlive({
      error: Error()
    }), isAlive) : isAlive)(target)) return;
    target.hp = Math.max(0, target.hp - amount);
    events.push({
      type: "unit_damaged",
      unitId: target.instanceId,
      amount,
      hpAfter: target.hp,
      source
    });
  }

  function heal(_state, target, amount, events) {
    if (!(_crd && isAlive === void 0 ? (_reportPossibleCrUseOfisAlive({
      error: Error()
    }), isAlive) : isAlive)(target)) return;
    target.hp = Math.min(target.maxHp, target.hp + amount);
    events.push({
      type: "unit_healed",
      unitId: target.instanceId,
      amount,
      hpAfter: target.hp
    });
  }

  function applyStatus(target, status, duration, magnitude, events) {
    if (!(_crd && isAlive === void 0 ? (_reportPossibleCrUseOfisAlive({
      error: Error()
    }), isAlive) : isAlive)(target)) return;
    var existing = target.statuses.find(s => s.id === status);

    if (existing) {
      existing.duration = Math.max(existing.duration, duration);
      if (magnitude !== undefined) existing.magnitude = magnitude;
    } else {
      target.statuses.push({
        id: status,
        duration,
        magnitude
      });
    }

    events.push({
      type: "unit_status_applied",
      unitId: target.instanceId,
      statusId: status,
      duration
    });
  }
  /**
   * 单位进入/停留在某格时触发地形效果（火焰、陷阱伤害）。
   * 用于位移落点与主动移动落点。
   */


  function triggerTerrain(state, target, events) {
    if (!(_crd && isAlive === void 0 ? (_reportPossibleCrUseOfisAlive({
      error: Error()
    }), isAlive) : isAlive)(target)) return;
    var terrain = state.board.terrainAt(target.pos);
    var dmg = (_crd && TERRAIN_DAMAGE === void 0 ? (_reportPossibleCrUseOfTERRAIN_DAMAGE({
      error: Error()
    }), TERRAIN_DAMAGE) : TERRAIN_DAMAGE)[terrain];

    if (dmg && dmg > 0) {
      events.push({
        type: "terrain_triggered",
        position: (_crd && clone === void 0 ? (_reportPossibleCrUseOfclone({
          error: Error()
        }), clone) : clone)(target.pos),
        terrainType: terrain,
        unitId: target.instanceId
      });
      dealDamage(state, target, dmg, "terrain:" + terrain, events);
    }
  }
  /** 死亡判定：对所有 hp<=0 但尚未标记的单位发出 unit_died。 */


  function processDeaths(state, events, alreadyDead) {
    for (var u of state.units) {
      if (u.hp <= 0 && !alreadyDead.has(u.instanceId)) {
        alreadyDead.add(u.instanceId);
        events.push({
          type: "unit_died",
          unitId: u.instanceId
        });
      }
    }
  }

  function _reportPossibleCrUseOfBattleState(extras) {
    _reporterNs.report("BattleState", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfUnit(extras) {
    _reporterNs.report("Unit", "../unit/Unit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfisAlive(extras) {
    _reporterNs.report("isAlive", "../unit/Unit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfhasStatus(extras) {
    _reporterNs.report("hasStatus", "../unit/Unit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfStatusId(extras) {
    _reporterNs.report("StatusId", "../unit/Unit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfElement(extras) {
    _reporterNs.report("Element", "./Skill", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBattleEvent(extras) {
    _reporterNs.report("BattleEvent", "../state/events", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTERRAIN_DAMAGE(extras) {
    _reporterNs.report("TERRAIN_DAMAGE", "../board/terrain", _context.meta, extras);
  }

  function _reportPossibleCrUseOfclone(extras) {
    _reporterNs.report("clone", "../board/geometry", _context.meta, extras);
  }

  _export({
    attackStat: attackStat,
    computeDamage: computeDamage,
    dealDamage: dealDamage,
    heal: heal,
    applyStatus: applyStatus,
    triggerTerrain: triggerTerrain,
    processDeaths: processDeaths
  });

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      isAlive = _unresolved_2.isAlive;
      hasStatus = _unresolved_2.hasStatus;
    }, function (_unresolved_3) {
      TERRAIN_DAMAGE = _unresolved_3.TERRAIN_DAMAGE;
    }, function (_unresolved_4) {
      clone = _unresolved_4.clone;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "2a22bTOBrZAi7CC5WNrXzxu", "combat", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 伤害、状态、地形触发等结算原语。直接修改 state，向 events 追加事件。
       */


      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=9c688a146d58b083de36cfea24a7e620b36238d7.js.map